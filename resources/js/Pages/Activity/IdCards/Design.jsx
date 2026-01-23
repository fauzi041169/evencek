import React, { useState, useRef, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import DraggableItem from './DraggableItem';
import { toPng } from 'html-to-image';
import AcaraLayout from '@/Layouts/AcaraLayout';

export default function Design({ auth, activity, cardSettings: initialSettings, committeeSettings: initialCommitteeSettings, user, availableColumns = [] }) {
    const [mode, setMode] = useState('participant'); // 'participant' | 'committee'

    // State to hold configuration
    const [pSettings, setPSettings] = useState(initialSettings || {});
    const [cSettings, setCSettings] = useState(initialCommitteeSettings || {});

    // Derived state for current view
    const settings = mode === 'participant' ? pSettings : cSettings;
    const setSettings = mode === 'participant' ? setPSettings : setCSettings;

    const [selectedId, setSelectedId] = useState(null);
    const [bgUploading, setBgUploading] = useState(false);
    const [backgrounds, setBackgrounds] = useState([]); // Store uploaded backgrounds
    const [isBackgroundsLoaded, setIsBackgroundsLoaded] = useState(false); // Track loading state
    const [isPreviewOpen, setIsPreviewOpen] = useState(false); // Modal state
    const [toasts, setToasts] = useState([]); // Toast Notifications
    const canvasRef = useRef(null);

    // Fetch backgrounds
    const fetchBackgrounds = async () => {
        try {
            const res = await axios.get(`/idcard-background/list/${activity.id}`);
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

    // Validate current background against fetched list
    useEffect(() => {
        if (isBackgroundsLoaded && settings.card?.background) {
            // Check if current background exists in the fetched list
            // We need to match filename. Note: settings.card.background might be full path or just filename relative to assets/images/card
            // Based on upload response: relativeDir + '/' + filename
            
            const currentBg = settings.card.background;
            const exists = backgrounds.find(bg => bg.filename === currentBg);
            
            if (!exists) {
                console.warn('Background image not found in server list, resetting...');
                // Optional: showToast('Background yang digunakan tidak ditemukan (mungkin telah dihapus), telah direset.', 'warning');
                setSettings(prev => ({
                    ...prev,
                    card: { ...prev.card, background: null }
                }));
            }
        }
    }, [isBackgroundsLoaded, backgrounds, settings.card?.background]);

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
        { label: 'Oswald', value: '"Oswald", sans-serif' },
        { label: 'Playfair Display', value: '"Playfair Display", serif' },
        { label: 'Raleway', value: '"Raleway", sans-serif' },
    ];

    useEffect(() => {
        // Load Google Fonts
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;700&family=Open+Sans:wght@300;400;700&family=Oswald:wght@300;400;700&family=Playfair+Display:wght@400;700&family=Poppins:wght@300;400;700&family=Raleway:wght@300;400;700&family=Roboto:wght@300;400;700&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }, []);

    // Initial Defaults if data is empty 
    const defaultSettings = {
        card: { background: null, width_cm: 5.4, height_cm: 8.6 },
    };

    // Ensure settings has all keys
    useEffect(() => {
        // If settings (for current mode) is empty, populate with defaults
        if (!settings.card) {
            setSettings(defaultSettings);
        }
    }, [mode]); // Check on mode switch

    // Handler when item is moved/resized
    const handleChange = (id, newStyles) => {
        setSettings(prev => ({
            ...prev,
            [id]: { ...prev[id], ...newStyles }
        }));
    };

    // Handler Reset Elements (Clear all except background/config)
    const handleResetElements = () => {
        if (!confirm('Apakah Anda yakin ingin menghapus semua elemen?')) return;
        
        setSettings(prev => {
            // Keep only 'card' config
            const newSettings = {
                card: prev.card
            };
            return newSettings;
        });
        setSelectedId(null);
        showToast('Semua elemen berhasil dihapus');
    };

    // Handler Add Field (Dynamic or Static)
    const addField = (type, label, defaultValue = '', dataKey = null) => {
        const id = `field_${Date.now()}`;

        // Determine preview text based on type from user prop
        let previewText = defaultValue;
        if (type === 'email') previewText = user.email || 'email@contoh.com';
        if (type === 'phone' || dataKey === 'no_hp') previewText = user.profile?.no_hp || '08123456789';
        if (type === 'institution' || dataKey === 'instansi') previewText = user.profile?.instansi || 'Nama Instansi';
        if (type === 'province' || dataKey === 'province') previewText = user.profile?.province?.name || 'Provinsi';
        if (type === 'regency' || dataKey === 'regency') previewText = user.profile?.regency?.name || 'Kabupaten/Kota';
        if (type === 'district' || dataKey === 'district') previewText = user.profile?.district?.name || 'Kecamatan';
        
        // Handle other keys from user/profile if available
        if (!previewText && dataKey) {
            if (user[dataKey]) previewText = user[dataKey];
            else if (user.profile && user.profile[dataKey]) previewText = user.profile[dataKey];
            else previewText = label;
        }

        setSettings(prev => ({
            ...prev,
            [id]: {
                left: 50, top: 150, size: 14, color: '#000000',
                text: previewText, // Initial preview
                fieldType: type,  // 'custom', 'email', 'phone', etc.
                data_key: dataKey || type, // Store dataKey for print.blade.php
                fieldLabel: label,
                weight: 'normal', visible: true, align: 'center', width: 250
            }
        }));
        setSelectedId(id);
    };

    // Handler Toggle Visibility
    const toggleVisibility = (id) => {
        setSettings(prev => ({
            ...prev,
            [id]: { ...prev[id], visible: !prev[id]?.visible }
        }));
    };

    // Handler Preview PDF
    const handlePreview = () => {
        setIsPreviewOpen(true);
    };

    // Helper: Compress Image
    const compressImage = async (file, maxSizeMB = 50) => {
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
                    
                    // Limit Max Dimensions (e.g., 4000px) to prevent memory issues and huge files
                    const MAX_DIMENSION = 4000;
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

                    // Recursive compression function
                    const attemptCompress = (quality) => {
                        canvas.toBlob((blob) => {
                            if (!blob) {
                                reject(new Error('Image compression failed'));
                                return;
                            }
                            
                            if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.1) {
                                // Done or max compression reached
                                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                                    type: 'image/jpeg',
                                    lastModified: Date.now(),
                                });
                                resolve(compressedFile);
                            } else {
                                // Try lower quality
                                attemptCompress(quality - 0.1);
                            }
                        }, 'image/jpeg', quality);
                    };

                    // Start with 0.9 quality
                    attemptCompress(0.9);
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    // Handler Upload Background
    const handleBgUpload = async (e) => {
        let file = e.target.files[0];
        if (!file) return;

        setBgUploading(true);

        try {
            // Check file size (if > 50MB, try to compress)
            if (file.size > 50 * 1024 * 1024) {
                showToast('Ukuran file besar, sedang mengompresi...', 'info');
                try {
                    file = await compressImage(file, 49); // Compress to < 49MB to be safe

                } catch (compError) {
                    console.error('Compression failed:', compError);
                    showToast('Gagal mengompresi gambar. Silakan gunakan gambar yang lebih kecil.', 'error');
                    setBgUploading(false);
                    return;
                }
            }

            const formData = new FormData();
            formData.append('background', file);
            formData.append('activity_id', activity.id); // Ensure activity_id is sent


            const url = `/idcard-background/upload`; // Updated route
            
            // Use window.axios if available to ensure global config (CSRF, etc.) is used
            const axiosInstance = window.axios || axios;
            
            const res = await axiosInstance.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Update settings with new filename
            setSettings(prev => ({
                ...prev,
                card: { ...prev.card, background: res.data.filename }
            }));
            showToast('Background berhasil diubah!');
            fetchBackgrounds(); // Refresh list
        } catch (error) {
            console.error('Upload error:', error.response || error);
            let errMsg = error.response?.data?.message || 'Gagal upload background';
            
            // Handle specific validation errors
            if (error.response?.status === 422) {
                 const errors = error.response.data.errors;
                 if (errors) {
                     // If activity_id is missing, it might be due to post_max_size limit
                     if (errors.activity_id) {
                         errMsg = 'Gagal: Data aktivitas tidak terbaca (Mungkin file terlalu besar)';
                     } else {
                         errMsg = Object.values(errors).flat().join(', ');
                     }
                 }
            } else if (error.response?.status === 413) {
                errMsg = 'File terlalu besar (Server Reject)';
            }

            showToast(errMsg, 'error');
        } finally {
            setBgUploading(false);
            // Reset input value to allow re-uploading same file if needed
            e.target.value = '';
        }
    };

    // Handler Delete Background
    const handleDeleteBackground = async (e, filename) => {
        e.stopPropagation(); // Prevent selecting the image when clicking delete
        if (!confirm('Apakah Anda yakin ingin menghapus background ini?')) return;

        try {
            await axios.post('/idcard-background/delete', {
                activity_id: activity.id,
                filename: filename
            });
            
            // If the deleted background was selected, clear it from settings
            if (settings.card?.background === filename) {
                setSettings(prev => ({
                    ...prev,
                    card: { ...prev.card, background: null }
                }));
            }
            
            showToast('Background berhasil dihapus');
            fetchBackgrounds(); // Refresh list
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
            // Save Participant
            await axios.post('/settings/card-settings/save', {
                activity_id: activity.id,
                type: 'participant',
                card_setting: JSON.stringify(pSettings)
            });

            // Save Committee
            await axios.post('/settings/card-settings/save', {
                activity_id: activity.id,
                type: 'committee',
                card_setting: JSON.stringify(cSettings)
            });

            showToast('Pengaturan berhasil disimpan!');
        } catch (error) {
            console.error(error);
            showToast('Gagal menyimpan pengaturan', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Download Preview Function
    const handleDownloadPreviewImage = async () => {
        const element = document.getElementById('preview-card-canvas');
        if (!element) return;

        try {
            const dataUrl = await toPng(element, {
                cacheBust: true,
                pixelRatio: 4, // High resolution
            });
            const link = document.createElement('a');
            link.download = `kartu-peserta-${user.name || 'sample'}.png`;
            link.href = dataUrl;
            link.click();
            showToast('Gambar berhasil didownload!');
        } catch (err) {
            console.error(err);
            showToast('Gagal mendownload gambar', 'error');
        }
    };

    // Unified Content Resolver (Used by both Editor and Preview)
    const getContent = (id, config) => {
        const p = user.profile || {};

        // Check using data_key (preferred) or id fallback
        if (config.data_key === 'photo' || id === 'photo' || (id && id.toString().startsWith('photo_'))) {
            let photoSrc;
            if (p.foto) {
                photoSrc = `/assets/images/profilefoto/${p.foto}`;
            } else if (user.profile_photo_url) {
                photoSrc = user.profile_photo_url;
            } else if (user.profile_photo_path) {
                photoSrc = `/storage/${user.profile_photo_path}`;
            } else {
                photoSrc = "/assets/images/profilefoto/default-profile.png";
            }
            
            // Determine border radius based on shape config
            const borderRadius = config.shape === 'circle' ? '50%' : (config.borderRadius || '0px');

            return (
                <img
                    src={photoSrc}
                    alt="Foto Peserta"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        border: '1px solid #ddd',
                        borderRadius: borderRadius,
                        pointerEvents: 'none' // Important so drag works on parent
                    }}
                />
            );
        }

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

        if (config.text) return config.text;

        return '';
    };

    // Helper to toggle fields from checkbox
    const toggleField = (col) => {
        // Map keys to standard internal data_keys if needed
        let targetKey = col.key;
        if (col.key === 'qr_code') targetKey = 'qr';
        if (col.key === 'avatar') targetKey = 'photo';

        // Check if exists
        const existingId = Object.keys(settings).find(k => settings[k].data_key === targetKey);

        if (existingId) {
            // Remove
            const newS = { ...settings };
            delete newS[existingId];
            setSettings(newS);
            if (selectedId === existingId) setSelectedId(null);
        } else {
            // Add
            // Special handling for photo/qr defaults
            if (targetKey === 'photo') {
                const id = `photo_${Date.now()}`;
                setSettings(prev => ({
                    ...prev,
                    [id]: { left: 80, top: 80, width: 100, height: 120, visible: true, data_key: 'photo', fieldLabel: col.label, shape: 'square' }
                }));
            } else if (targetKey === 'qr') {
                const id = `qr_${Date.now()}`;
                setSettings(prev => ({
                    ...prev,
                    [id]: { left: 80, top: 300, width: 100, height: 100, visible: true, data_key: 'qr', fieldLabel: col.label }
                }));
            } else {
                // Standard text field
                addField(targetKey, col.label, '', targetKey);
            }
        }
    };

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    return (
        <AcaraLayout auth={auth} activity={activity} title="Desain Kartu">
            <Head title={`Desain Kartu - ${activity.name}`} />

            <div className="flex h-[calc(100vh-64px)] overflow-hidden">
                {/* LEFT SIDEBAR - CONTROLS */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col z-20 shadow-lg">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">Editor Kartu</h2>
                        <div className="flex gap-2 mt-2 bg-gray-100 p-1 rounded-lg">
                            <button
                                onClick={() => setMode('participant')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${mode === 'participant' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Peserta
                            </button>
                            <button
                                onClick={() => setMode('committee')}
                                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition ${mode === 'committee' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Panitia
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Background Section */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Background & Ukuran</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Lebar (cm)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={settings.card?.width_cm || 5.4}
                                        onChange={(e) => setSettings(prev => ({ ...prev, card: { ...prev.card, width_cm: parseFloat(e.target.value) } }))}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Tinggi (cm)</label>
                                    <input
                                        type="number" step="0.1"
                                        value={settings.card?.height_cm || 8.6}
                                        onChange={(e) => setSettings(prev => ({ ...prev, card: { ...prev.card, height_cm: parseFloat(e.target.value) } }))}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
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
                                    {settings.card?.background && (
                                        <button
                                            onClick={() => setSettings(prev => ({ ...prev, card: { ...prev.card, background: null } }))}
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
                                                    className={`relative cursor-pointer border rounded overflow-hidden group ${settings.card?.background === bg.filename ? 'ring-2 ring-indigo-500' : 'border-gray-200'}`}
                                                    onClick={() => setSettings(prev => ({ ...prev, card: { ...prev.card, background: bg.filename } }))}
                                                >
                                                    <img src={bg.url} alt="bg" className="w-full h-16 object-cover" />
                                                    {settings.card?.background === bg.filename && (
                                                        <div className="absolute inset-0 bg-indigo-500 bg-opacity-20 flex items-center justify-center">
                                                            <i className="fas fa-check text-white drop-shadow-md"></i>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={(e) => handleDeleteBackground(e, bg.filename)}
                                                        className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                                                        title="Hapus"
                                                    >
                                                        <i className="fas fa-times text-xs"></i>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <hr className="border-gray-100" />

                        {/* Element List (REMOVED - Now controlled by Checkboxes) */}
                        {/* <div className="space-y-3">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Elemen Kartu</h3>
                            <div className="space-y-2">
                                ...
                            </div>
                        </div> */}

                        {/* Add New Elements (Dropdown with Checkboxes) */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tambah Elemen</h3>
                                <button 
                                    onClick={handleResetElements}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                                    title="Hapus semua elemen dari kartu"
                                >
                                    Hapus Semua
                                </button>
                            </div>
                            
                            <div className="relative">
                                <button
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full flex justify-between items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                >
                                    <span>Pilih Elemen Kartu</span>
                                    <i className={`fas fa-chevron-${isDropdownOpen ? 'up' : 'down'} text-gray-400`}></i>
                                </button>

                                {isDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                        {/* Standard Custom Text Option */}
                                        <div className="px-4 py-2 border-b border-gray-100">
                                            <button 
                                                onClick={() => {
                                                    addField('custom', 'Teks Bebas', 'Teks Baru');
                                                    setIsDropdownOpen(false);
                                                }}
                                                className="w-full text-left text-primary hover:text-primary font-medium flex items-center"
                                            >
                                                <i className="fas fa-plus-circle mr-2"></i> Teks Bebas
                                            </button>
                                        </div>

                                        {Object.entries(
                                            availableColumns.reduce((groups, col) => {
                                                const group = col.group || 'Lainnya';
                                                if (!groups[group]) groups[group] = [];
                                                groups[group].push(col);
                                                return groups;
                                            }, {})
                                        ).map(([group, cols]) => (
                                            <div key={group} className="px-4 py-2">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{group}</h4>
                                                <div className="space-y-2">
                                                    {cols.map(col => {
                                                        let targetKey = col.key;
                                                        if (col.key === 'qr_code') targetKey = 'qr';
                                                        if (col.key === 'avatar') targetKey = 'photo';
                                                        
                                                        const isChecked = Object.values(settings).some(s => s.data_key === targetKey);

                                                        return (
                                                            <div key={col.key} className="flex items-center">
                                                                <input
                                                                    id={`col-${col.key}`}
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => toggleField(col)}
                                                                    className="h-4 w-4 text-primary focus:ring-indigo-500 border-gray-300 rounded"
                                                                />
                                                                <label htmlFor={`col-${col.key}`} className="ml-2 block text-sm text-gray-900 cursor-pointer">
                                                                    {col.label}
                                                                </label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN EDITOR AREA */}
                <div className="flex-1 bg-gray-100 relative overflow-auto flex items-center justify-center p-10">
                    
                    {/* CANVAS WRAPPER */}
                    <div
                        className="relative shadow-2xl bg-white transition-all duration-300 ease-in-out"
                        style={{
                            width: `${(settings.card?.width_cm || 5.4) * 37.795}px`, // CM to PX (approx 96 DPI) -> actually 1cm = 37.8px
                            height: `${(settings.card?.height_cm || 8.6) * 37.795}px`,
                            backgroundImage: settings.card?.background ? `url(/assets/images/card/${settings.card.background})` : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            overflow: 'hidden' // Clip content
                        }}
                        ref={canvasRef}
                        onClick={() => setSelectedId(null)} // Deselect on background click
                    >
                        {Object.entries(settings).map(([key, config]) => {
                            if (key === 'card' || !config.visible) return null;

                            return (
                                <DraggableItem
                                    key={key}
                                    id={key}
                                    data={config}
                                    isSelected={selectedId === key}
                                    onSelect={setSelectedId}
                                    onChange={handleChange}
                                    isResizable={true} // Allow all to be resizable? Or configure per type?
                                    parentContainer={canvasRef.current}
                                >
                                    {getContent(key, config)}
                                </DraggableItem>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT SIDEBAR - ATTRIBUTES */}
                {selectedId && settings[selectedId] && (
                    <div className="w-72 bg-white border-l border-gray-200 flex flex-col z-20 shadow-lg animate-slide-in-right">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-gray-800">Properti</h2>
                            <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-gray-600">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto">
                            {/* Text Content Edit */}
                            {settings[selectedId].text !== undefined && (
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Konten Teks</label>
                                    <textarea
                                        rows="2"
                                        value={settings[selectedId].text}
                                        onChange={(e) => handleChange(selectedId, { text: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            )}

                            {/* Font Settings */}
                            {settings[selectedId].size !== undefined && (
                                <div className="space-y-3">
                                    {/* Font Family */}
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Jenis Font</label>
                                        <select
                                            value={settings[selectedId].font || 'inherit'}
                                            onChange={(e) => handleChange(selectedId, { font: e.target.value })}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                            style={{ fontFamily: settings[selectedId].font?.replace(/"/g, '') }}
                                        >
                                            <option value="inherit">Default</option>
                                            {availableFonts.map(f => (
                                                <option key={f.value} value={f.value} style={{ fontFamily: f.value.replace(/"/g, '') }}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Ukuran</label>
                                            <input
                                                type="number"
                                                value={settings[selectedId].size}
                                                onChange={(e) => handleChange(selectedId, { size: parseInt(e.target.value) })}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Warna</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="color"
                                                    value={settings[selectedId].color}
                                                    onChange={(e) => handleChange(selectedId, { color: e.target.value })}
                                                    className="w-8 h-8 rounded border border-gray-300 p-0 cursor-pointer"
                                                />
                                                <span className="text-xs text-gray-500">{settings[selectedId].color}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Alignment & Style */}
                            {settings[selectedId].align !== undefined && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Align</label>
                                        <select
                                            value={settings[selectedId].align}
                                            onChange={(e) => handleChange(selectedId, { align: e.target.value })}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                        >
                                            <option value="left">Kiri</option>
                                            <option value="center">Tengah</option>
                                            <option value="right">Kanan</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Style</label>
                                        <select
                                            value={settings[selectedId].weight}
                                            onChange={(e) => handleChange(selectedId, { weight: e.target.value })}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                        >
                                            <option value="normal">Normal</option>
                                            <option value="bold">Bold</option>
                                            <option value="300">Light</option>
                                            <option value="800">Extra Bold</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Photo Shape Settings */}
                            {(settings[selectedId].data_key === 'photo' || settings[selectedId].data_key === 'avatar' || selectedId.toLowerCase().includes('photo')) && (
                                <div className="mb-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <label className="block text-xs font-bold text-indigo-700 mb-1">Bentuk Foto</label>
                                    <select
                                        value={settings[selectedId].shape || 'square'}
                                        onChange={(e) => handleChange(selectedId, { shape: e.target.value })}
                                        className="w-full px-2 py-1.5 border border-indigo-300 rounded text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        <option value="square">Kotak (Persegi)</option>
                                        <option value="circle">Lingkaran (Bulat)</option>
                                    </select>
                                </div>
                            )}

                            {/* Position Manual Adjustment */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Posisi X</label>
                                    <input
                                        type="number"
                                        value={Math.round(settings[selectedId].left)}
                                        onChange={(e) => handleChange(selectedId, { left: parseInt(e.target.value) })}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Posisi Y</label>
                                    <input
                                        type="number"
                                        value={Math.round(settings[selectedId].top)}
                                        onChange={(e) => handleChange(selectedId, { top: parseInt(e.target.value) })}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Lebar</label>
                                    <input
                                        type="number"
                                        value={Math.round(settings[selectedId].width || 0)}
                                        onChange={(e) => handleChange(selectedId, { width: parseInt(e.target.value) })}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500 mb-1">Tinggi</label>
                                    <input
                                        type="number"
                                        value={Math.round(settings[selectedId].height || 0)}
                                        onChange={(e) => handleChange(selectedId, { height: parseInt(e.target.value) })}
                                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                                    />
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>

            {/* FLOATING ACTION BUTTONS */}
            <div className="fixed bottom-6 right-6 flex gap-3 z-50">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center px-6 py-3 bg-primary text-white font-bold rounded-full shadow-lg hover:bg-indigo-700 transition transform hover:scale-105 disabled:opacity-50"
                >
                    {isSaving ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Menyimpan...
                        </>
                    ) : (
                        <>
                            <i className="fas fa-save mr-2"></i> Simpan
                        </>
                    )}
                </button>
            </div>

            {/* TOAST NOTIFICATIONS */}
            <div className="fixed top-20 right-6 z-50 flex flex-col gap-2">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`px-4 py-3 rounded-lg shadow-lg text-white font-medium flex items-center animate-fade-in-down ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}
                    >
                        <i className={`fas fa-${toast.type === 'error' ? 'exclamation-circle' : 'check-circle'} mr-2`}></i>
                        {toast.message}
                    </div>
                ))}
            </div>
        </AcaraLayout>
    );
}

