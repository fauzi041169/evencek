import React, { useState, useRef, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { QRCodeSVG } from 'qrcode.react';
import DraggableItem from './DraggableItem';
import { toPng } from 'html-to-image';
import AcaraLayout from '@/Layouts/AcaraLayout';

export default function Design({ auth, activity, certificateSetting: initialSettings, user, availableColumns = [] }) {
    const [settings, setSettings] = useState(() => {
        let parsed = initialSettings || {};
        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed);
                if (typeof parsed === 'string') {
                    parsed = JSON.parse(parsed);
                }
            } catch (e) {
                console.error('Failed to parse initial settings', e);
                parsed = {};
            }
        }
        return parsed;
    });

    const [selectedId, setSelectedId] = useState(null);
    const [bgUploading, setBgUploading] = useState(false);
    const [backgrounds, setBackgrounds] = useState([]); 
    const [isBackgroundsLoaded, setIsBackgroundsLoaded] = useState(false);
    const [zoom, setZoom] = useState(0.8);
    const canvasRef = useRef(null);

    const fetchBackgrounds = async () => {
        try {
            const res = await axios.get(`/certificate-settings/background/list/${activity.id}`);
            if (res.data.success) {
                setBackgrounds(res.data.images);
            }
        } catch (error) {
            console.error('Failed to fetch backgrounds', error);
        } finally {
            setIsBackgroundsLoaded(true);
        }
    };

    useEffect(() => {
        fetchBackgrounds();
    }, [activity.id]);

    const showToast = (message, type = 'success') => {
        Swal.fire({
            icon: type,
            title: type === 'success' ? 'Berhasil' : 'Gagal',
            text: message,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000
        });
    };

    const availableFonts = [
        { label: 'Default (Sans)', value: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' },
        { label: 'Serif', value: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
        { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
        { label: 'Roboto', value: '"Roboto", sans-serif' },
        { label: 'Open Sans', value: '"Open Sans", sans-serif' },
        { label: 'Montserrat', value: '"Montserrat", sans-serif' },
        { label: 'Lato', value: '"Lato", sans-serif' },
        { label: 'Poppins', value: '"Poppins", sans-serif' },
        { label: 'Great Vibes', value: '"Great Vibes", cursive' },
        { label: 'Pinyon Script', value: '"Pinyon Script", cursive' },
    ];

    useEffect(() => {
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Pinyon+Script&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;700&family=Open+Sans:wght@300;400;700&family=Poppins:wght@300;400;700&family=Roboto:wght@300;400;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }, []);

    const PX_PER_CM = 37.795;
    const defaultSettings = {
        page: { 
            width_cm: 29.7, 
            height_cm: 21, 
            background: null,
            px_per_cm: PX_PER_CM
        },
    };

    useEffect(() => {
        if (!settings.page) {
            setSettings(prev => ({ ...defaultSettings, ...prev }));
        } else if (!settings.page.px_per_cm) {
            setSettings(prev => ({ 
                ...prev, 
                page: { ...prev.page, px_per_cm: PX_PER_CM } 
            }));
        }
    }, []);

    const handleChange = (id, newStyles) => {
        setSettings(prev => ({
            ...prev,
            [id]: { ...prev[id], ...newStyles }
        }));
    };

    const handleResetElements = () => {
        Swal.fire({
            title: 'Reset Desain?',
            text: 'Apakah Anda yakin ingin menghapus semua elemen?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E02424',
            cancelButtonColor: '#718096',
            confirmButtonText: 'Ya, Hapus Semua',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                setSettings({ 
                    page: { 
                        ...settings.page,
                        px_per_cm: PX_PER_CM
                    } 
                });
                setSelectedId(null);
                showToast('Semua elemen berhasil dihapus');
            }
        });
    };

    const addField = (type, label, defaultValue = '', dataKey = null) => {
        const id = `field_${Date.now()}`;
        let previewText = defaultValue || label;
        if (type === 'name') previewText = user.name || 'Nama Peserta';
        if (type === 'certificate_id') previewText = 'NO: 123/SERT/2023';

        const newField = {
            left: 50, top: 100, size: 24, color: '#000000',
            text: previewText,
            fieldType: type,
            data_key: dataKey || type,
            fieldLabel: label,
            weight: 'normal', 
            visible: true, 
            align: 'center', 
            width: 500,
            height: 40,
            font: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif'
        };

        setSettings(prev => ({
            ...prev,
            [id]: newField
        }));
        setSelectedId(id);
    };

    const compressImage = async (file, maxSizeMB = 2) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_DIMENSION = 3000; // Standard certificate width is usually around 2000-3000px
                    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                        if (width > height) {
                            height *= MAX_DIMENSION / width;
                            width = MAX_DIMENSION;
                        } else {
                            width *= MAX_DIMENSION / height;
                            height = MAX_DIMENSION;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const attemptCompress = (quality) => {
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error('Image compression failed'));
                                return;
                            }
                            if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.3) {
                                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                attemptCompress(quality - 0.1);
                            }
                        }, 'image/jpeg', quality);
                    };
                    attemptCompress(0.9);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleBgUpload = async (e) => {
        let file = e.target.files[0];
        if (!file) return;
        setBgUploading(true);
        try {
            // Compress if file is larger than 2MB
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire({
                    icon: 'info', title: 'Info', text: 'Ukuran file besar, sedang mengompresi agar optimal...',
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
                });
                try {
                    file = await compressImage(file, 1.8); // Aim for under 1.8MB
                } catch (compError) {
                    console.error('Compression failed:', compError);
                    // Continue with original file if compression fails
                }
            }
            const formData = new FormData();
            formData.append('background', file); // Field name changed from background_image to background
            formData.append('activity_id', activity.id);
            const res = await axios.post(`/certificate-settings/background/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSettings(prev => ({
                ...prev,
                page: { ...prev.page, background: res.data.filename }
            }));
            showToast('Background berhasil diunggah!');
            fetchBackgrounds();
        } catch (error) {
            console.error('Upload error:', error);
            const message = error.response?.data?.message || 'Gagal upload background. Pastikan file adalah gambar dan ukuran tidak terlalu besar.';
            showToast(message, 'error');
        } finally {
            setBgUploading(false);
            e.target.value = '';
        }
    };

    const handleDeleteBackground = async (e, filename) => {
        e.stopPropagation();
        Swal.fire({
            title: 'Hapus Background?',
            text: 'Apakah Anda yakin ingin menghapus background ini?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E02424',
            cancelButtonColor: '#718096',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.post('/certificate-settings/background/delete', {
                        activity_id: activity.id,
                        filename: filename
                    });
                    if (settings.page?.background === filename) {
                        setSettings(prev => ({
                            ...prev,
                            page: { ...prev.page, background: null }
                        }));
                    }
                    showToast('Background berhasil dihapus');
                    fetchBackgrounds();
                } catch (error) {
                    console.error('Delete error:', error);
                    showToast('Gagal menghapus background', 'error');
                }
            }
        });
    };

    const [isSaving, setIsSaving] = useState(false);
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.post('/certificate-settings/save', {
                activity_id: activity.id,
                certificate_setting: JSON.stringify(settings)
            });
            showToast('Desain sertifikat berhasil disimpan!');
        } catch (error) {
            console.error(error);
            showToast('Gagal menyimpan pengaturan', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const getContent = (id, config) => {
        if (config.data_key === 'qr' || id === 'qr' || (id && id.toString().startsWith('qr_'))) {
            // Use verification link for QR value preview
            const verificationUrl = route('activity.verify-certificate', { id: activity.id }) + '?certificate_id=PREVIEW';
            return (
                <div style={{ width: '100%', height: '100%' }}>
                    <QRCodeSVG
                        value={verificationUrl}
                        size={config.width}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            );
        }
        if (config.text) return config.text;
        return '';
    };

    const toggleField = (col) => {
        let targetKey = col.key;
        if (col.key === 'qr_code') targetKey = 'qr';
        const existingId = Object.keys(settings).find(k => settings[k] && settings[k].data_key === targetKey);
        if (existingId) {
            const newS = { ...settings };
            delete newS[existingId];
            setSettings(newS);
            if (selectedId === existingId) setSelectedId(null);
        } else {
            if (targetKey === 'qr') {
                const id = `qr_${Date.now()}`;
                setSettings(prev => ({
                    ...prev,
                    [id]: { 
                        left: 100, top: 100, width: 120, height: 120, 
                        visible: true, data_key: 'qr', fieldLabel: col.label 
                    }
                }));
            } else {
                addField(targetKey, col.label, '', targetKey);
            }
        }
    };

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <AcaraLayout auth={auth} activity={activity} title="Desain Sertifikat" fluid={true} noPadding={true}>
            <Head title={`Desain Sertifikat - ${activity.name}`} />

            <div className="flex h-[calc(100vh-112px)] w-full overflow-hidden bg-[#f0f2f5]">
                {/* LEFT SIDEBAR - Fixed Full Left */}
                <aside className="w-80 h-full bg-white border-r border-gray-200 flex flex-col z-30 shadow-xl flex-shrink-0">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold text-gray-800">Editor Sertifikat</h2>
                            <div className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">Admin</div>
                        </div>
                        <button 
                            onClick={handleSave} 
                            disabled={isSaving} 
                            className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</>
                            ) : (
                                <><i className="fas fa-save"></i> Simpan Desain</>
                            )}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-gray-400">
                                <i className="fas fa-image text-xs"></i>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest">Halaman & Background</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Lebar (cm)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={settings.page?.width_cm || 29.7}
                                        onChange={(e) => setSettings(prev => ({ ...prev, page: { ...prev.page, width_cm: parseFloat(e.target.value) } }))}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Tinggi (cm)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={settings.page?.height_cm || 21}
                                        onChange={(e) => setSettings(prev => ({ ...prev, page: { ...prev.page, height_cm: parseFloat(e.target.value) } }))}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Upload Background</label>
                                <div className="flex items-center gap-2">
                                    <label className="flex-1 cursor-pointer bg-white border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 text-center hover:border-primary hover:bg-primary/5 transition-all group">
                                        <div className="flex flex-col items-center gap-1">
                                            <i className="fas fa-cloud-upload-alt text-gray-300 group-hover:text-primary transition-colors"></i>
                                            <span className="text-xs font-medium text-gray-500 group-hover:text-primary">
                                                {bgUploading ? 'Mengunggah...' : 'Pilih File'}
                                            </span>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} disabled={bgUploading} />
                                    </label>
                                </div>

                                {backgrounds.length > 0 && (
                                    <div className="pt-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Koleksi</p>
                                            <span className="text-[10px] text-gray-300">{backgrounds.length} item</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1 custom-scrollbar">
                                            {backgrounds.map(bg => {
                                                const isActive = settings.page?.background === bg.filename;
                                                return (
                                                    <div
                                                        key={bg.id}
                                                        className={`relative cursor-pointer aspect-[1.414/1] rounded-lg overflow-hidden transition-all duration-300 group ${isActive ? 'ring-2 ring-primary ring-offset-2 shadow-lg scale-[0.98]' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                                                        onClick={() => setSettings(prev => ({ 
                                                            ...prev, 
                                                            page: { ...prev.page, background: bg.filename } 
                                                        }))}
                                                    >
                                                        <img 
                                                            src={bg.url || `/assets/images/certificate/${bg.filename}`} 
                                                            alt={bg.original_name} 
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                if (!e.target.src.includes('background/default/')) {
                                                                    e.target.src = `/assets/images/certificate/background/default/${bg.filename.split('/').pop()}`;
                                                                }
                                                            }}
                                                        />
                                                        {isActive && (
                                                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                                                                <div className="bg-white text-primary rounded-full p-1 shadow-xl">
                                                                    <i className="fas fa-check text-[10px]"></i>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {bg.type !== 'default' && (
                                                            <button 
                                                                onClick={(e) => handleDeleteBackground(e, bg.filename)}
                                                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center shadow-lg hover:bg-red-600"
                                                            >
                                                                <i className="fas fa-times text-[10px]"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2 text-gray-400">
                                    <i className="fas fa-layer-group text-xs"></i>
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest">Tambah Elemen</h3>
                                </div>
                                <button onClick={handleResetElements} className="text-[10px] font-bold text-red-400 hover:text-red-600 uppercase transition-colors">Reset</button>
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full flex justify-between items-center px-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm text-sm font-medium text-gray-700 hover:border-primary transition-all active:scale-[0.98]"
                                >
                                    <span>Pilih Elemen Database</span>
                                    <i className={`fas fa-chevron-${isDropdownOpen ? 'up' : 'down'} text-gray-300 transition-transform duration-300`}></i>
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute z-40 mt-2 w-full bg-white shadow-2xl max-h-64 rounded-xl py-2 overflow-auto border border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200 custom-scrollbar">
                                        <div className="px-3 pb-2 mb-2 border-b border-gray-50">
                                            <button
                                                onClick={() => { addField('custom', 'Teks Bebas', 'Teks Baru'); setIsDropdownOpen(false); }}
                                                className="w-full text-left px-3 py-2 bg-primary/5 text-primary hover:bg-primary/10 rounded-lg text-xs font-bold flex items-center transition-all"
                                            >
                                                <i className="fas fa-plus-circle mr-2 text-sm"></i> Teks Bebas Baru
                                            </button>
                                        </div>
                                        {availableColumns.map(col => {
                                            let targetKey = col.key;
                                            if (col.key === 'qr_code') targetKey = 'qr';
                                            const isChecked = Object.values(settings).some(s => s.data_key === targetKey);
                                            return (
                                                <label key={col.key} className="px-4 py-2.5 flex items-center hover:bg-gray-50 cursor-pointer transition-colors group">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isChecked ? 'bg-primary border-primary shadow-sm' : 'border-gray-300 bg-white group-hover:border-primary'}`}>
                                                        {isChecked && <i className="fas fa-check text-[10px] text-white"></i>}
                                                    </div>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleField(col)}
                                                        className="hidden"
                                                    />
                                                    <span className={`ml-3 text-xs font-medium transition-colors ${isChecked ? 'text-primary' : 'text-gray-600'}`}>{col.label}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* MAIN EDITOR AREA - Full Flexible Center */}
                <main className="flex-1 relative flex flex-col overflow-hidden">
                    {/* Zoom Toolbar */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-2xl border border-white/20">
                        <button onClick={() => setZoom(prev => Math.max(0.1, prev - 0.1))} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-xl transition-all" title="Zoom Out">
                            <i className="fas fa-minus text-xs"></i>
                        </button>
                        <div className="px-3 text-xs font-bold text-gray-500 w-16 text-center tabular-nums">
                            {Math.round(zoom * 100)}%
                        </div>
                        <button onClick={() => setZoom(prev => Math.min(2, prev + 0.1))} className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded-xl transition-all" title="Zoom In">
                            <i className="fas fa-plus text-xs"></i>
                        </button>
                        <div className="w-[1px] h-4 bg-gray-200 mx-1"></div>
                        <button onClick={() => setZoom(0.8)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all" title="Reset Zoom">
                            <i className="fas fa-expand text-xs"></i>
                        </button>
                    </div>

                    {/* Canvas Container */}
                    <div className="flex-1 overflow-auto custom-scrollbar p-10 flex items-center justify-center bg-[#f3f4f6] relative">
                        {/* The scaling wrapper */}
                        <div 
                            style={{ 
                                transform: `scale(${zoom})`,
                                transformOrigin: 'center center',
                                transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            className="relative flex-shrink-0"
                        >
                            <div
                                className="relative shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] bg-white"
                                style={{
                                    width: `${(settings.page?.width_cm || 29.7) * 37.795}px`,
                                    height: `${(settings.page?.height_cm || 21) * 37.795}px`,
                                    backgroundImage: (() => {
                                        if (!settings.page?.background) return 'none';
                                        const bg = backgrounds.find(b => b.filename === settings.page.background);
                                        if (bg) return `url("${bg.url}")`;
                                        if (settings.page.background.startsWith('certificate-backgrounds/')) return `url("/storage/${settings.page.background}")`;
                                        if (settings.page.background.startsWith('background/default/')) return `url("/assets/images/certificate/${settings.page.background}")`;
                                        if (settings.page.background.startsWith('http')) return `url("${settings.page.background}")`;
                                        if (settings.page.background.match(/^[0-9]+\.(png|jpg|jpeg|webp)$/)) return `url("/assets/images/certificate/background/default/${settings.page.background}")`;
                                        return `url("/assets/images/certificate/${settings.page.background}")`;
                                    })(),
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    overflow: 'hidden'
                                }}
                                ref={canvasRef}
                                onClick={() => setSelectedId(null)}
                            >
                                {Object.entries(settings).map(([key, config]) => {
                                    if (key === 'page' || (!config.visible)) return null;
                                    return (
                                        <DraggableItem
                                            key={key}
                                            id={key}
                                            data={config}
                                            isSelected={selectedId === key}
                                            onSelect={setSelectedId}
                                            onChange={handleChange}
                                            isResizable={true}
                                            parentContainer={canvasRef.current}
                                        >
                                            {getContent(key, config)}
                                        </DraggableItem>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </main>

                {/* RIGHT SIDEBAR - Fixed Full Right */}
                <aside className={`h-full bg-white border-l border-gray-200 flex flex-col z-30 shadow-2xl transition-all duration-300 ease-in-out flex-shrink-0 ${selectedId ? 'w-80' : 'w-0 overflow-hidden border-none'}`}>
                    {selectedId && settings[selectedId] && (
                        <>
                            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                        <i className="fas fa-sliders-h text-primary text-xs"></i>
                                    </div>
                                    <h3 className="font-bold text-gray-800 text-sm uppercase tracking-tight">Pengaturan Elemen</h3>
                                </div>
                                <button onClick={() => setSelectedId(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                                {settings[selectedId].text !== undefined && (
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Teks / Placeholder</label>
                                        <textarea
                                            rows="3"
                                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                            value={settings[selectedId].text || ''}
                                            onChange={(e) => handleChange(selectedId, { text: e.target.value })}
                                            placeholder="Masukkan teks..."
                                        />
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <p className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Geometri (PX)</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-gray-300 uppercase">X Position</span>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                                value={Math.round(settings[selectedId].left)}
                                                onChange={(e) => handleChange(selectedId, { left: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-gray-300 uppercase">Y Position</span>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                                value={Math.round(settings[selectedId].top)}
                                                onChange={(e) => handleChange(selectedId, { top: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[9px] font-bold text-gray-300 uppercase">Width</span>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                                value={Math.round(settings[selectedId].width)}
                                                onChange={(e) => handleChange(selectedId, { width: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        {settings[selectedId].size !== undefined && (
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-gray-300 uppercase">Font Size</span>
                                                <input
                                                    type="number"
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                                    value={settings[selectedId].size}
                                                    onChange={(e) => handleChange(selectedId, { size: parseInt(e.target.value) || 12 })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {settings[selectedId].font !== undefined && (
                                    <div className="space-y-4 pt-4 border-t border-gray-100">
                                        <div className="space-y-2">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Font Family</label>
                                            <select
                                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                                                value={settings[selectedId].font || 'ui-sans-serif'}
                                                onChange={(e) => handleChange(selectedId, { font: e.target.value })}
                                            >
                                                <option value="inherit">Default Sans</option>
                                                {availableFonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Warna</label>
                                                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl p-1">
                                                    <input
                                                        type="color"
                                                        className="w-8 h-8 border-none bg-transparent cursor-pointer rounded-lg"
                                                        value={settings[selectedId].color || '#000000'}
                                                        onChange={(e) => handleChange(selectedId, { color: e.target.value })}
                                                    />
                                                    <span className="text-xs font-mono text-gray-500 uppercase">{settings[selectedId].color || '#000000'}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Alignment</label>
                                                <div className="flex bg-gray-50 border border-gray-200 rounded-xl p-1">
                                                    {['left', 'center', 'right'].map(align => (
                                                        <button
                                                            key={align}
                                                            onClick={() => handleChange(selectedId, { align })}
                                                            className={`flex-1 py-1.5 rounded-lg transition-all ${settings[selectedId].align === align ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            <i className={`fas fa-align-${align} text-xs`}></i>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleChange(selectedId, { weight: settings[selectedId].weight === 'bold' ? 'normal' : 'bold' })}
                                                className={`py-2.5 rounded-xl border font-bold text-xs transition-all ${settings[selectedId].weight === 'bold' ? 'bg-gray-800 text-white border-gray-800 shadow-lg' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                            >
                                                BOLD
                                            </button>
                                            <button
                                                onClick={() => handleChange(selectedId, { italic: settings[selectedId].italic === 'italic' ? 'normal' : 'italic' })}
                                                className={`py-2.5 rounded-xl border font-italic text-xs transition-all ${settings[selectedId].italic === 'italic' ? 'bg-gray-800 text-white border-gray-800 shadow-lg' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                            >
                                                ITALIC
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-6">
                                    <button
                                        onClick={() => {
                                            const newSettings = { ...settings };
                                            delete newSettings[selectedId];
                                            setSettings(newSettings);
                                            setSelectedId(null);
                                        }}
                                        className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all border border-red-100 flex items-center justify-center gap-2 group"
                                    >
                                        <i className="fas fa-trash-alt group-hover:shake"></i> Hapus Elemen Terpilih
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </aside>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
                
                @keyframes shake {
                    0%, 100% { transform: rotate(0); }
                    25% { transform: rotate(-10deg); }
                    75% { transform: rotate(10deg); }
                }
                .group:hover .group-hover\\:shake { animation: shake 0.3s infinite; }
            `}} />
        </AcaraLayout>
    );
}
