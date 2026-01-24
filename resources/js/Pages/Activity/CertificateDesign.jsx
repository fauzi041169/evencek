import React, { useState, useRef, useEffect } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import DraggableItem from './IdCards/DraggableItem';
import { toPng } from 'html-to-image';
import AcaraLayout from '@/Layouts/AcaraLayout';

export default function CertificateDesign({ auth, activity, certificateSettings: initialSettings, printSettings: initialPrintSettings, user, availableColumns = [] }) {
    // Standardize initial settings
    const defaultSettings = {
        certificate_type: 'single', // single or double
        card: { 
            width_cm: 29.7, 
            height_cm: 21, 
            background: null,
            background_back: null,
            base_width_px: 0, // Will be set on save
            base_height_px: 0
        },
        title: { visible: true, text: activity.name, top: 50, left: 300, size: 24, color: '#bfa100', align: 'center', width: 500, font: 'serif', weight: 'bold' },
        name: { visible: true, top: 200, left: 300, size: 30, color: '#000000', align: 'center', width: 500, weight: 'bold' },
        certificate_id: { visible: true, top: 100, left: 50, size: 12, color: '#333333', align: 'left', width: 200 },
        qr: { visible: true, top: 300, left: 50, size: 100 },
        // Back side defaults
        back_title: { visible: true, text: activity.name, top: 50, left: 300, size: 24, color: '#bfa100', align: 'center', width: 500, font: 'serif', weight: 'bold' },
        back_subtitle: { visible: true, text: 'Informasi Tambahan', top: 100, left: 50, size: 14, color: '#666666', align: 'center', width: 400, font: 'sans-serif', weight: 'normal' },
        back_content: { visible: true, text: 'Sertifikat ini diterbitkan sebagai bukti keikutsertaan.', top: 150, left: 50, size: 12, color: '#555555', align: 'left', width: 700, font: 'sans-serif', weight: 'normal' },
        back_certid: { visible: true, text: 'CERT-001', top: 250, left: 50, size: 12, color: '#555555', align: 'left', width: 400, font: 'sans-serif', weight: 'normal' },
    };

    const [settings, setSettings] = useState(() => {
        // Merge defaults with initial settings
        // If initialSettings is empty or null, use defaultSettings
        if (!initialSettings || Object.keys(initialSettings).length === 0) return defaultSettings;
        
        // Ensure card object exists
        const merged = { ...initialSettings };
        if (!merged.card) merged.card = defaultSettings.card;
        if (!merged.certificate_type) merged.certificate_type = 'single';
        
        return merged;
    });

    const [printSettings, setPrintSettings] = useState(initialPrintSettings || {});
    const [selectedId, setSelectedId] = useState(null);
    const [bgUploading, setBgUploading] = useState(false);
    const [activeSide, setActiveSide] = useState('front'); // 'front' or 'back'
    const [toasts, setToasts] = useState([]);
    const canvasRef = useRef(null);

    // Constant used in print.blade.php
    const CM_TO_PX = 37.8; 

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
        { label: 'Great Vibes', value: '"Great Vibes", cursive' },
    ];

    useEffect(() => {
        // Load Google Fonts
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;700&family=Open+Sans:wght@300;400;700&family=Oswald:wght@300;400;700&family=Playfair+Display:wght@400;700&family=Poppins:wght@300;400;700&family=Raleway:wght@300;400;700&family=Roboto:wght@300;400;700&family=Great+Vibes&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }, []);

    // Handler when item is moved/resized
    const handleChange = (id, newStyles) => {
        setSettings(prev => ({
            ...prev,
            [id]: { ...prev[id], ...newStyles }
        }));
    };

    // Handler Add Field
    const addField = (key, label, defaultValue = '', fieldType = 'text') => {
        // If key already exists, just select it and ensure visible
        if (settings[key]) {
            setSettings(prev => ({
                ...prev,
                [key]: { ...prev[key], visible: true }
            }));
            setSelectedId(key);
            showToast(`${label} sudah ada, diaktifkan kembali.`);
            return;
        }

        // If key exists in defaultSettings, use that as base
        if (defaultSettings[key]) {
             setSettings(prev => ({
                ...prev,
                [key]: { ...defaultSettings[key], visible: true }
            }));
            setSelectedId(key);
            return;
        }

        const widthCm = settings.card?.width_cm || 29.7;
        const heightCm = settings.card?.height_cm || 21;
        
        // Center position roughly
        const left = (widthCm * CM_TO_PX) / 2 - 100;
        const top = (heightCm * CM_TO_PX) / 2 - 20;

        let previewText = defaultValue;
        if (key === 'name') previewText = user.name || 'Nama Peserta';
        if (key === 'email') previewText = user.email || 'email@contoh.com';
        if (key === 'certificate_id') previewText = 'CERT-001';
        if (key === 'title') previewText = activity.name || 'JUDUL SERTIFIKAT';
        
        if (key === 'back_title') previewText = activity.name || 'JUDUL SERTIFIKAT';
        if (key === 'back_subtitle') previewText = 'Informasi Tambahan';
        if (key === 'back_content') previewText = 'Sertifikat ini diterbitkan sebagai bukti keikutsertaan.';
        if (key === 'back_certid') previewText = 'CERT-001';

        const newField = {
            left, top, 
            size: 16, 
            color: '#000000',
            text: previewText,
            fieldType: fieldType, // 'text' or 'qr_code' or 'photo'
            fieldLabel: label,
            weight: 'normal', 
            visible: true, 
            align: 'center', 
            width: 200,
            font: 'sans-serif'
        };

        if (fieldType === 'qr_code') {
            newField.width = 100;
            newField.height = 100;
            newField.size = 100; // QR size often stored in 'size'
        }

        if (fieldType === 'photo') {
            newField.width = 90;
            newField.height = 110;
            newField.size = 90; // Photo width stored in 'size' usually
            newField.shape = 'square';
        }

        setSettings(prev => ({
            ...prev,
            [key]: newField
        }));
        setSelectedId(key);
    };

    const deleteElement = (id) => {
        if (confirm('Sembunyikan elemen ini?')) {
            setSettings(prev => ({
                ...prev,
                [id]: { ...prev[id], visible: false }
            }));
            setSelectedId(null);
        }
    };

    // Save Settings
    const handleSave = async () => {
        try {
            // Update base dimensions before saving
            const finalSettings = {
                ...settings,
                card: {
                    ...settings.card,
                    base_width_px: settings.card.width_cm * CM_TO_PX,
                    base_height_px: settings.card.height_cm * CM_TO_PX
                }
            };

            const res = await axios.post('/certificate-settings/save', {
                activity_id: activity.id,
                certificate_setting: JSON.stringify(finalSettings),
                print_settings: printSettings
            });

            if (res.data.success) {
                showToast('Desain sertifikat berhasil disimpan');
            }
        } catch (error) {
            console.error(error);
            showToast('Gagal menyimpan desain', 'error');
        }
    };

    // Background Upload
    const handleBgUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('background_image', file);
        formData.append('activity_id', activity.id);

        setBgUploading(true);
        try {
            const res = await axios.post('/certificate-settings/background/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success) {
                setSettings(prev => ({
                    ...prev,
                    card: { 
                        ...prev.card, 
                        [activeSide === 'back' ? 'background_back' : 'background']: res.data.filename 
                    }
                }));
                showToast(`Background ${activeSide === 'back' ? 'belakang' : 'depan'} berhasil diupload`);
            }
        } catch (error) {
            console.error(error);
            showToast('Gagal upload background', 'error');
        } finally {
            setBgUploading(false);
        }
    };

    // Helper to resolve background URL
    const getBackgroundUrl = (filename) => {
        if (!filename) return null;
        if (filename.startsWith('http')) return filename;
        if (filename.startsWith('certificate-backgrounds/') || filename.startsWith('id-card-backgrounds/')) {
            return `/storage/${filename}`;
        }
        return `/assets/images/certificate/${filename}`;
    };

    // Standard Fields List
    const standardFields = [
        { key: 'title', label: 'Judul Sertifikat', type: 'text' },
        { key: 'certificate_id', label: 'No. Sertifikat', type: 'text' },
        { key: 'name', label: 'Nama Peserta', type: 'text' },
        { key: 'email', label: 'Email', type: 'text' },
        { key: 'no_hp', label: 'No. HP', type: 'text' },
        { key: 'instansi', label: 'Instansi', type: 'text' },
        { key: 'qr', label: 'QR Code', type: 'qr_code' },
        { key: 'photo', label: 'Foto Peserta', type: 'photo' },
    ];

    const extraFields = [
        { key: 'jenis_kelamin', label: 'Jenis Kelamin', type: 'text' },
        { key: 'pekerjaan', label: 'Pekerjaan', type: 'text' },
        { key: 'jabatan', label: 'Jabatan', type: 'text' },
        { key: 'alamat', label: 'Alamat', type: 'text' },
        { key: 'province', label: 'Provinsi', type: 'text' },
        { key: 'regency', label: 'Kabupaten/Kota', type: 'text' },
        { key: 'district', label: 'Kecamatan', type: 'text' },
    ];

    const backFields = [
        { key: 'back_title', label: 'Judul Belakang', type: 'text' },
        { key: 'back_subtitle', label: 'Sub-Judul Belakang', type: 'text' },
        { key: 'back_content', label: 'Konten Belakang', type: 'text' },
        { key: 'back_certid', label: 'No. Sertifikat (Belakang)', type: 'text' },
    ];

    const currentWidth = settings.card?.width_cm || 29.7;
    const currentHeight = settings.card?.height_cm || 21;

    return (
        <AcaraLayout title={`Desain Sertifikat - ${activity.name}`} activity={activity}>
            <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-gray-100">
                {/* Sidebar Controls */}
                <div className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-y-auto z-20 shadow-lg">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center">
                            <i className="fas fa-pencil-ruler mr-2 text-indigo-600"></i> Editor Sertifikat
                        </h2>
                    </div>

                    <div className="p-4 space-y-6">
                        {/* Page Settings */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Konfigurasi Halaman</h3>
                            
                            <div className="mb-3">
                                <label className="text-xs text-gray-500 block mb-1">Tipe Sertifikat</label>
                                <select 
                                    className="w-full text-sm border-gray-300 rounded-md"
                                    value={settings.certificate_type || 'single'}
                                    onChange={e => {
                                        const type = e.target.value;
                                        setSettings(prev => ({ ...prev, certificate_type: type }));
                                        if (type === 'single') setActiveSide('front');
                                    }}
                                >
                                    <option value="single">Satu Sisi (Single)</option>
                                    <option value="double">Dua Sisi (Double)</option>
                                </select>
                            </div>

                            {settings.certificate_type === 'double' && (
                                <div className="flex mb-3 border border-gray-300 rounded-md overflow-hidden">
                                    <button 
                                        className={`flex-1 py-1 text-xs font-bold transition ${activeSide === 'front' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                        onClick={() => { setActiveSide('front'); setSelectedId(null); }}
                                    >
                                        Halaman Depan
                                    </button>
                                    <button 
                                        className={`flex-1 py-1 text-xs font-bold transition ${activeSide === 'back' ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                                        onClick={() => { setActiveSide('back'); setSelectedId(null); }}
                                    >
                                        Halaman Belakang
                                    </button>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <div>
                                    <label className="text-xs text-gray-500">Lebar (cm)</label>
                                    <input 
                                        type="number" 
                                        className="w-full text-sm border-gray-300 rounded-md"
                                        value={currentWidth}
                                        onChange={e => setSettings(prev => ({...prev, card: {...prev.card, width_cm: parseFloat(e.target.value)}}))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-500">Tinggi (cm)</label>
                                    <input 
                                        type="number" 
                                        className="w-full text-sm border-gray-300 rounded-md"
                                        value={currentHeight}
                                        onChange={e => setSettings(prev => ({...prev, card: {...prev.card, height_cm: parseFloat(e.target.value)}}))}
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Background {activeSide === 'front' ? 'Depan' : 'Belakang'}
                                </label>
                                <div className="flex items-center gap-2">
                                    <label className="cursor-pointer bg-gray-50 border border-gray-300 hover:bg-gray-100 text-gray-700 px-3 py-2 rounded-md text-sm w-full text-center transition">
                                        {bgUploading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-upload mr-1"></i> Upload BG {activeSide === 'front' ? '' : 'Blk'}</>}
                                        <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} disabled={bgUploading} />
                                    </label>
                                    {((activeSide === 'front' && settings.card?.background) || (activeSide === 'back' && settings.card?.background_back)) && (
                                        <button 
                                            onClick={() => setSettings(prev => ({
                                                ...prev, 
                                                card: { 
                                                    ...prev.card, 
                                                    [activeSide === 'front' ? 'background' : 'background_back']: null 
                                                }
                                            }))}
                                            className="bg-red-50 text-red-600 p-2 rounded-md hover:bg-red-100"
                                            title="Hapus Background"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Add Elements */}
                        <div>
                            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                                Elemen {activeSide === 'front' ? 'Depan' : 'Belakang'}
                            </h3>
                            
                            {activeSide === 'front' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-2">
                                        {standardFields.map(field => (
                                            <button 
                                                key={field.key}
                                                onClick={() => addField(field.key, field.label, '', field.type)} 
                                                className={`p-2 text-xs rounded hover:bg-indigo-100 border border-indigo-200 transition text-left ${settings[field.key] ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-50 text-indigo-700'}`}
                                            >
                                                <i className={`fas ${field.type === 'qr_code' ? 'fa-qrcode' : field.type === 'photo' ? 'fa-image' : 'fa-font'} mr-1`}></i> {field.label}
                                            </button>
                                        ))}
                                    </div>

                                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 mt-4">Data Tambahan</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {extraFields.map(field => (
                                            <button 
                                                key={field.key}
                                                onClick={() => addField(field.key, field.label, '', field.type)} 
                                                className={`p-2 text-xs rounded hover:bg-gray-200 border border-gray-200 transition text-left ${settings[field.key] ? 'bg-gray-200 text-gray-800' : 'bg-gray-50 text-gray-700'}`}
                                            >
                                                <i className="fas fa-plus mr-1"></i> {field.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {backFields.map(field => (
                                        <button 
                                            key={field.key}
                                            onClick={() => addField(field.key, field.label, '', field.type)} 
                                            className={`p-2 text-xs rounded hover:bg-indigo-100 border border-indigo-200 transition text-left ${settings[field.key] ? 'bg-indigo-100 text-indigo-800' : 'bg-indigo-50 text-indigo-700'}`}
                                        >
                                            <i className="fas fa-font mr-1"></i> {field.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Element Properties */}
                        {selectedId && settings[selectedId] && (
                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xs font-bold text-indigo-800">Edit: {settings[selectedId].fieldLabel || selectedId}</h3>
                                    <button onClick={() => deleteElement(selectedId)} className="text-red-500 hover:text-red-700"><i className="fas fa-trash"></i></button>
                                </div>
                                
                                {settings[selectedId].fieldType === 'text' && (
                                    <>
                                        {/* Only show text input for title, others are dynamic */}
                                        {selectedId === 'title' && (
                                            <div className="mb-2">
                                                <label className="text-xs text-gray-500">Teks Judul</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full text-sm p-1 border-gray-300 rounded"
                                                    value={settings[selectedId].text}
                                                    onChange={e => handleChange(selectedId, { text: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <div>
                                                <label className="text-xs text-gray-500">Ukuran Font</label>
                                                <input 
                                                    type="number" 
                                                    className="w-full text-sm p-1 border-gray-300 rounded"
                                                    value={settings[selectedId].size}
                                                    onChange={e => handleChange(selectedId, { size: parseInt(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-500">Warna</label>
                                                <input 
                                                    type="color" 
                                                    className="w-full h-8 p-0 border-gray-300 rounded"
                                                    value={settings[selectedId].color}
                                                    onChange={e => handleChange(selectedId, { color: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="mb-2">
                                            <label className="text-xs text-gray-500">Font</label>
                                            <select 
                                                className="w-full text-sm p-1 border-gray-300 rounded"
                                                value={settings[selectedId].font}
                                                onChange={e => handleChange(selectedId, { font: e.target.value })}
                                            >
                                                <option value="">Inherit</option>
                                                {availableFonts.map(f => (
                                                    <option key={f.label} value={f.value}>{f.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex gap-2 mb-2">
                                            <button 
                                                className={`flex-1 py-1 text-xs border rounded ${settings[selectedId].weight === 'bold' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                                                onClick={() => handleChange(selectedId, { weight: settings[selectedId].weight === 'bold' ? 'normal' : 'bold' })}
                                            >
                                                <i className="fas fa-bold"></i>
                                            </button>
                                            <button 
                                                className={`flex-1 py-1 text-xs border rounded ${settings[selectedId].italic === 'italic' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                                                onClick={() => handleChange(selectedId, { italic: settings[selectedId].italic === 'italic' ? 'normal' : 'italic' })}
                                            >
                                                <i className="fas fa-italic"></i>
                                            </button>
                                            <button 
                                                className={`flex-1 py-1 text-xs border rounded ${settings[selectedId].align === 'center' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                                                onClick={() => handleChange(selectedId, { align: 'center' })}
                                            >
                                                <i className="fas fa-align-center"></i>
                                            </button>
                                             <button 
                                                className={`flex-1 py-1 text-xs border rounded ${settings[selectedId].align === 'left' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                                                onClick={() => handleChange(selectedId, { align: 'left' })}
                                            >
                                                <i className="fas fa-align-left"></i>
                                            </button>
                                            <button 
                                                className={`flex-1 py-1 text-xs border rounded ${settings[selectedId].align === 'right' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
                                                onClick={() => handleChange(selectedId, { align: 'right' })}
                                            >
                                                <i className="fas fa-align-right"></i>
                                            </button>
                                        </div>
                                    </>
                                )}
                                
                                {settings[selectedId].fieldType === 'qr_code' && (
                                    <div className="mb-2">
                                        <label className="text-xs text-gray-500">Ukuran QR</label>
                                        <input 
                                            type="number" 
                                            className="w-full text-sm p-1 border-gray-300 rounded"
                                            value={settings[selectedId].size || 100}
                                            onChange={e => handleChange(selectedId, { size: parseInt(e.target.value), width: parseInt(e.target.value), height: parseInt(e.target.value) })}
                                        />
                                    </div>
                                )}

                                {settings[selectedId].fieldType === 'photo' && (
                                    <div className="mb-2">
                                        <label className="text-xs text-gray-500">Ukuran Foto</label>
                                        <input 
                                            type="number" 
                                            className="w-full text-sm p-1 border-gray-300 rounded"
                                            value={settings[selectedId].size || 90}
                                            onChange={e => handleChange(selectedId, { size: parseInt(e.target.value), width: parseInt(e.target.value), height: parseInt(e.target.value) * 1.22 })}
                                        />
                                        <div className="mt-2">
                                            <label className="text-xs text-gray-500 block mb-1">Bentuk</label>
                                            <select 
                                                className="w-full text-sm p-1 border-gray-300 rounded"
                                                value={settings[selectedId].shape || 'square'}
                                                onChange={e => handleChange(selectedId, { shape: e.target.value })}
                                            >
                                                <option value="square">Kotak (Rounded)</option>
                                                <option value="circle">Lingkaran</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <button 
                            onClick={handleSave} 
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow transition mt-4"
                        >
                            <i className="fas fa-save mr-2"></i> Simpan Desain
                        </button>
                        
                        <a 
                            href={`/activity/${activity.id}/certificates`}
                            target="_blank"
                            className="block w-full text-center py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-bold shadow transition mt-2"
                        >
                            <i className="fas fa-print mr-2"></i> Test Print
                        </a>
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div className="flex-1 overflow-auto bg-gray-200 p-8 flex justify-center items-start" onClick={() => setSelectedId(null)}>
                    <div 
                        ref={canvasRef}
                        className="bg-white shadow-2xl relative transition-all duration-200"
                        style={{
                            width: `${currentWidth}cm`,
                            height: `${currentHeight}cm`,
                            backgroundImage: (activeSide === 'back' ? settings.card?.background_back : settings.card?.background) 
                                ? `url(${getBackgroundUrl(activeSide === 'back' ? settings.card.background_back : settings.card.background)})` 
                                : 'none',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                         {Object.keys(settings).filter(key => key !== 'card' && key !== 'certificate_type').map(key => {
                             const item = settings[key];
                             if (!item.visible) return null;

                             // Filter by side
                             const isBackField = key.startsWith('back_');
                             if (activeSide === 'front' && isBackField) return null;
                             if (activeSide === 'back' && !isBackField) return null;
                             
                             return (
                                 <DraggableItem
                                     key={key}
                                     id={key}
                                     data={item}
                                     isSelected={selectedId === key}
                                     onSelect={setSelectedId}
                                     onChange={handleChange}
                                     isResizable={true}
                                     parentContainer={canvasRef.current}
                                 >
                                     {item.fieldType === 'qr_code' ? (
                                         <QRCodeSVG 
                                             value="https://example.com" 
                                             size={item.size || 100} 
                                             fgColor={item.color || '#000000'}
                                             bgColor={'transparent'}
                                         />
                                     ) : item.fieldType === 'photo' ? (
                                         <div style={{ 
                                             width: '100%', 
                                             height: '100%', 
                                             backgroundColor: '#eee', 
                                             border: '1px dashed #999', 
                                             borderRadius: item.shape === 'circle' ? '50%' : '12px',
                                             display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' 
                                         }}>
                                             <i className="fas fa-user text-3xl text-gray-400"></i>
                                         </div>
                                     ) : (
                                         <div style={{ width: '100%', height: '100%' }}>{item.text}</div>
                                     )}
                                 </DraggableItem>
                             );
                         })}
                    </div>
                </div>

                {/* Toast Container */}
                <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
                    {toasts.map(toast => (
                        <div key={toast.id} className={`px-4 py-2 rounded shadow-lg text-white text-sm animate-fade-in-up ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
                            {toast.message}
                        </div>
                    ))}
                </div>
            </div>
        </AcaraLayout>
    );
}
