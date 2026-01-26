import React, { useState, useRef, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { QRCodeSVG } from 'qrcode.react';
import DraggableItem from './DraggableItem';
import { toPng } from 'html-to-image';
import AcaraLayout from '@/Layouts/AcaraLayout';

export default function Design({ auth, activity, certificateSetting: initialSettings, user, availableColumns = [] }) {
    // Certificate Settings are usually per activity (or batch), not split by role like ID cards
    // So we manage a single state object.
    const [settings, setSettings] = useState(initialSettings || {});

    const [selectedId, setSelectedId] = useState(null);
    const [bgUploading, setBgUploading] = useState(false);
    const [backgrounds, setBackgrounds] = useState([]); // Store uploaded backgrounds
    const [isBackgroundsLoaded, setIsBackgroundsLoaded] = useState(false); // Track loading state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false); // Modal state
    const [toasts, setToasts] = useState([]); // Toast Notifications
    const canvasRef = useRef(null);

    // List backgrounds
    const fetchBackgrounds = async () => {
        try {
            // Reusing ID card endpoint for now or create a new one?
            // User uploaded 1 image in previous turn which implies they want to see defaults in Certificate too.
            // We should implement a specific endpoint for certificate backgrounds that includes defaults.
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

    useEffect(() => {
        // Auto-select first default if nothing selected? No, keep it clean.
    }, [isBackgroundsLoaded]);

    // Toast Helper
    const showToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    // Available Fonts
    const availableFonts = [
        { label: 'Default (Sans)', value: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif' },
        { label: 'Serif', value: 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' },
        { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' },
        { label: 'Roboto', value: '"Roboto", sans-serif' },
        { label: 'Open Sans', value: '"Open Sans", sans-serif' },
        { label: 'Montserrat', value: '"Montserrat", sans-serif' },
        { label: 'Lato', value: '"Lato", sans-serif' },
        { label: 'Poppins', value: '"Poppins", sans-serif' },
        { label: 'Great Vibes', value: '"Great Vibes", cursive' }, // Popular for certificates
        { label: 'Pinyon Script', value: '"Pinyon Script", cursive' },
    ];

    useEffect(() => {
        // Load Google Fonts
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Pinyon+Script&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;700&family=Open+Sans:wght@300;400;700&family=Poppins:wght@300;400;700&family=Roboto:wght@300;400;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }, []);

    // Initial Defaults if data is empty 
    const defaultSettings = {
        // A4 Landscape default
        page: { width_cm: 29.7, height_cm: 21, background: null },
    };

    // Ensure settings has all keys
    useEffect(() => {
        if (!settings.page) {
            setSettings(prev => ({ ...defaultSettings, ...prev }));
        }
    }, []);

    // Handler when item is moved/resized
    const handleChange = (id, newStyles) => {
        setSettings(prev => ({
            ...prev,
            [id]: { ...prev[id], ...newStyles }
        }));
    };

    // Handler Reset Elements
    const handleResetElements = () => {
        if (!confirm('Apakah Anda yakin ingin menghapus semua elemen?')) return;
        setSettings(prev => ({ page: prev.page }));
        setSelectedId(null);
        showToast('Semua elemen berhasil dihapus');
    };

    // Handler Add Field
    const addField = (type, label, defaultValue = '', dataKey = null) => {
        const id = `field_${Date.now()}`;
        let previewText = defaultValue || label;

        // Custom preview logic based on type if needed
        if (type === 'name') previewText = user.name || 'Nama Peserta';
        if (type === 'certificate_id') previewText = 'NO: 123/SERT/2023';

        setSettings(prev => ({
            ...prev,
            [id]: {
                left: 300, top: 300, size: 24, color: '#000000',
                text: previewText,
                fieldType: type,
                data_key: dataKey || type,
                fieldLabel: label,
                weight: 'normal', visible: true, align: 'center', width: 400
            }
        }));
        setSelectedId(id);
    };

    // Handler Upload Background
    const handleBgUpload = async (e) => {
        let file = e.target.files[0];
        if (!file) return;

        setBgUploading(true);

        try {
            const formData = new FormData();
            formData.append('background_image', file);
            formData.append('activity_id', activity.id);

            const url = `/certificate-settings/background/upload`;

            const res = await axios.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update settings with new filename (which is a path)
            setSettings(prev => ({
                ...prev,
                page: { ...prev.page, background: res.data.filename }
            }));
            showToast('Background berhasil diubah!');
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Gagal upload background', 'error');
        } finally {
            setBgUploading(false);
            e.target.value = '';
        }
    };

    // Handler Delete Background
    const handleDeleteBackground = async () => {
        if (!settings.page?.background) return;
        if (!confirm('Hapus background saat ini?')) return;

        try {
            await axios.post('/certificate-settings/background/delete', {
                filename: settings.page.background
            });

            setSettings(prev => ({
                ...prev,
                page: { ...prev.page, background: null }
            }));
            showToast('Background berhasil dihapus');
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Gagal menghapus background', 'error');
        }
    };

    // Save functionality
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

    // Unified Content Resolver
    const getContent = (id, config) => {
        if (config.data_key === 'qr' || id === 'qr' || (id && id.toString().startsWith('qr_'))) {
            return (
                <div style={{ width: '100%', height: '100%' }}>
                    <QRCodeSVG
                        value={`V:${activity.uid || activity.id}:${user.id}`}
                        size={config.width}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            );
        }

        // Text content
        if (config.text) return config.text;
        return '';
    };

    // Toggle Field from Checkbox
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
                    [id]: { left: 100, top: 500, width: 100, height: 100, visible: true, data_key: 'qr', fieldLabel: col.label }
                }));
            } else {
                addField(targetKey, col.label, '', targetKey);
            }
        }
    };

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <AcaraLayout auth={auth} activity={activity} title="Desain Sertifikat">
            <Head title={`Desain Sertifikat - ${activity.name}`} />

            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* LEFT SIDEBAR */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-20 shadow-lg">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">Editor Sertifikat</h2>
                        <div className="mt-2 flex gap-2">
                            <button onClick={handleSave} disabled={isSaving} className="flex-1 bg-primary text-white py-1.5 rounded text-sm hover:bg-blue-700">
                                {isSaving ? 'Menyimpan...' : 'Simpan Desain'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Background Section */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Halaman & Background</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Lebar (cm)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={settings.page?.width_cm || 29.7}
                                        onChange={(e) => setSettings(prev => ({ ...prev, page: { ...prev.page, width_cm: parseFloat(e.target.value) } }))}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Tinggi (cm)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={settings.page?.height_cm || 21}
                                        onChange={(e) => setSettings(prev => ({ ...prev, page: { ...prev.page, height_cm: parseFloat(e.target.value) } }))}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Upload Background</label>
                                <div className="flex items-center gap-2">
                                    <label className="flex-1 cursor-pointer bg-gray-50 border border-dashed border-gray-300 rounded-lg px-4 py-2 text-center hover:bg-gray-100 transition">
                                        <span className="text-sm text-gray-600">
                                            {bgUploading ? 'Uploading...' : 'Pilih Gambar'}
                                        </span>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} disabled={bgUploading} />
                                    </label>
                                    {settings.page?.background && (
                                        <button
                                            onClick={handleDeleteBackground}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                            title="Hapus Background"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    )}
                                </div>

                                {backgrounds.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-xs text-gray-500 mb-1">Background Tersimpan:</p>
                                        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                                            {backgrounds.map(bg => (
                                                <div
                                                    key={bg.id}
                                                    className={`relative cursor-pointer border rounded overflow-hidden group ${settings.page?.background === bg.filename ? 'ring-2 ring-indigo-500' : 'border-gray-200'}`}
                                                    onClick={() => setSettings(prev => ({ ...prev, page: { ...prev.page, background: bg.filename } }))}
                                                >
                                                    <img src={bg.url} alt="bg" className="w-full h-16 object-cover" />
                                                    {settings.page?.background === bg.filename && (
                                                        <div className="absolute inset-0 bg-indigo-500 bg-opacity-20 flex items-center justify-center">
                                                            <i className="fas fa-check text-white drop-shadow-md"></i>
                                                        </div>
                                                    )}
                                                    {bg.type !== 'default' && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                Swal.fire({
                                                                    title: 'Hapus background ini?',
                                                                    text: "Apakah Anda yakin ingin menghapus background ini dari daftar?",
                                                                    icon: 'warning',
                                                                    showCancelButton: true,
                                                                    confirmButtonColor: '#d33',
                                                                    cancelButtonColor: '#3085d6',
                                                                    confirmButtonText: 'Ya, Hapus!',
                                                                    cancelButtonText: 'Batal'
                                                                }).then((result) => {
                                                                    if (result.isConfirmed) {
                                                                        // We need a specific delete endpoint for list items if we want to delete from gallery
                                                                        // reusing delete current for now is tricky if it's not the selected one.
                                                                        // For now let's skip delete from list or implement handleListDelete later.
                                                                        // But the User asked for "display default", so let's focus on that.
                                                                        Swal.fire('Info', 'Fitur hapus dari list belum aktif', 'info');
                                                                    }
                                                                });
                                                            }}
                                                            className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title="Hapus"
                                                        >
                                                            <i className="fas fa-times text-xs"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Elements Dropdown */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tambah Elemen</h3>
                                <button onClick={handleResetElements} className="text-xs text-red-500 hover:text-red-700">Hapus Semua</button>
                            </div>

                            <div className="relative">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full flex justify-between items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm"
                                >
                                    <span>Pilih Elemen</span>
                                    <i className={`fas fa-chevron-${isDropdownOpen ? 'up' : 'down'} text-gray-400`}></i>
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 overflow-auto border border-gray-200">
                                        <div className="px-4 py-2 border-b border-gray-100">
                                            <button
                                                onClick={() => { addField('custom', 'Teks Bebas', 'Teks Baru'); setIsDropdownOpen(false); }}
                                                className="w-full text-left text-primary hover:text-primary font-medium flex items-center"
                                            >
                                                <i className="fas fa-plus-circle mr-2"></i> Teks Bebas
                                            </button>
                                        </div>
                                        {availableColumns.map(col => {
                                            let targetKey = col.key;
                                            if (col.key === 'qr_code') targetKey = 'qr';
                                            const isChecked = Object.values(settings).some(s => s.data_key === targetKey);
                                            return (
                                                <div key={col.key} className="px-4 py-2 flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleField(col)}
                                                        className="h-4 w-4 text-primary border-gray-300 rounded"
                                                    />
                                                    <label className="ml-2 text-sm text-gray-900 cursor-pointer" onClick={() => toggleField(col)}>{col.label}</label>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN EDITOR AREA */}
                <div className="flex-1 bg-gray-100 relative overflow-auto flex items-center justify-center p-10">
                    <div
                        className="relative shadow-2xl bg-white transition-all"
                        style={{
                            width: `${(settings.page?.width_cm || 29.7) * 37.795}px`,
                            height: `${(settings.page?.height_cm || 21) * 37.795}px`,
                            backgroundImage: settings.page?.background ? (
                                settings.page.background.startsWith('http')
                                    ? `url("${settings.page.background}")`
                                    : `url("/storage/${settings.page.background}")`
                            ) : 'none',
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

                {/* RIGHT SIDEBAR */}
                {selectedId && settings[selectedId] && (
                    <div className="w-72 bg-white border-l border-gray-200 flex flex-col z-20 shadow-lg p-4 space-y-4">
                        <div className="flex justify-between items-center text-lg font-bold">
                            <h2>Properti</h2>
                            <button onClick={() => setSelectedId(null)}><i className="fas fa-times"></i></button>
                        </div>

                        {settings[selectedId].text !== undefined && (
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Konten Teks</label>
                                <textarea rows="2" value={settings[selectedId].text} onChange={e => handleChange(selectedId, { text: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
                            </div>
                        )}

                        {settings[selectedId].font !== undefined && (
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Font</label>
                                <select value={settings[selectedId].font || 'inherit'} onChange={e => handleChange(selectedId, { font: e.target.value })} className="w-full px-2 py-1.5 border rounded text-sm">
                                    <option value="inherit">Default</option>
                                    {availableFonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                </select>
                            </div>
                        )}
                        {/* Size, Color, Align */}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-xs text-gray-500">Ukuran</label>
                                <input type="number" value={settings[selectedId].size} onChange={e => handleChange(selectedId, { size: parseInt(e.target.value) })} className="w-full border rounded text-sm px-2 py-1" />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500">Warna</label>
                                <input type="color" value={settings[selectedId].color} onChange={e => handleChange(selectedId, { color: e.target.value })} className="w-full h-8 border rounded p-0" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Rata Teks</label>
                            <div className="flex border rounded overflow-hidden">
                                {['left', 'center', 'right'].map(align => (
                                    <button key={align} onClick={() => handleChange(selectedId, { align })} className={`flex-1 py-1 ${settings[selectedId].align === align ? 'bg-primary text-white' : 'bg-white'}`}>
                                        <i className={`fas fa-align-${align}`}></i>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500">Style</label>
                            <div className="flex gap-2">
                                <button onClick={() => handleChange(selectedId, { weight: settings[selectedId].weight === 'bold' ? 'normal' : 'bold' })} className={`flex-1 py-1 border rounded ${settings[selectedId].weight === 'bold' ? 'bg-gray-200' : ''}`}>B</button>
                                <button onClick={() => handleChange(selectedId, { italic: settings[selectedId].italic === 'italic' ? 'normal' : 'italic' })} className={`flex-1 py-1 border rounded ${settings[selectedId].italic === 'italic' ? 'bg-gray-200' : ''}`}>I</button>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <button onClick={() => {
                                const newS = { ...settings };
                                delete newS[selectedId];
                                setSettings(newS);
                                setSelectedId(null);
                            }} className="w-full py-2 bg-red-100 text-red-600 rounded text-sm font-bold hover:bg-red-200">
                                <i className="fas fa-trash mr-2"></i> Hapus Elemen
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {toasts.map(t => (
                    <div key={t.id} className={`px-4 py-2 rounded-lg shadow-lg text-white text-sm animate-fade-in-up ${t.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                        {t.message}
                    </div>
                ))}
            </div>
        </AcaraLayout>
    );
}
