import React, { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import AcaraLayout from '@/Layouts/AcaraLayout';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function Design({ auth, activity, cardSettings, backgrounds, detectedTypes = ['participant'], sampleData = {}, availableColumns = [] }) {
    // Default settings
    const defaultCardSetting = {
        layout: 'portrait',
        width: 53.98, // mm (ID-1)
        height: 85.60, // mm
        bg_type: 'color', // color, image
        bg_color: '#ffffff',
        bg_image: null,
        elements: {
            name: { visible: true, x: 50, y: 40, size: 12, color: '#000000', align: 'center', weight: 'bold' },
            id_number: { visible: true, x: 50, y: 50, size: 10, color: '#000000', align: 'center', weight: 'normal' },
            qr_code: { visible: true, x: 50, y: 70, size: 20, align: 'center' },
            avatar: { visible: true, x: 50, y: 20, size: 25, align: 'center' },
        }
    };

    const defaultElementConfig = { 
        visible: true, 
        x: 10, 
        y: 10, 
        size: 10, 
        color: '#000000', 
        align: 'left', 
        weight: 'normal' 
    };

    // Helper to get setting by type
    const getSettingByType = (type) => {
        const found = cardSettings?.find(s => s.type === type);
        const parsed = found ? (typeof found.card_setting === 'string' ? JSON.parse(found.card_setting) : found.card_setting) : defaultCardSetting;
        
        // Merge with defaults to ensure robustness
        return {
            ...defaultCardSetting,
            ...parsed,
            elements: {
                ...defaultCardSetting.elements,
                ...(parsed?.elements || {})
            }
        };
    };
    
    const getPrintSettingByType = (type) => {
        const found = cardSettings?.find(s => s.type === type);
        return found ? (typeof found.print_settings === 'string' ? JSON.parse(found.print_settings) : found.print_settings) : { paper: 'A4', cols: 2, rows: 4 };
    };

    // Initialize state
    const [cardModel, setCardModel] = useState(() => {
        const hasMultiple = cardSettings?.length > 1;
        return hasMultiple ? 'multi' : 'single';
    });
    
    const [activeType, setActiveType] = useState('participant');
    
    // Store all settings in a local state map
    const [allSettings, setAllSettings] = useState(() => {
        const initial = {};
        detectedTypes.forEach(type => {
            initial[type] = getSettingByType(type);
        });
        // Ensure participant is always initialized if single mode relies on it
        if (!initial['participant']) initial['participant'] = defaultCardSetting;
        return initial;
    });

    const [allPrintSettings, setAllPrintSettings] = useState(() => {
        const initial = {};
        detectedTypes.forEach(type => {
            initial[type] = getPrintSettingByType(type);
        });
        if (!initial['participant']) initial['participant'] = { paper: 'A4', cols: 2, rows: 4 };
        return initial;
    });

    // Background management
    const [bgList, setBgList] = useState(backgrounds || []);
    const [uploadingBg, setUploadingBg] = useState(false);
    const fileInputRef = useRef(null);

    // Current active settings
    const settings = allSettings[activeType] || defaultCardSetting;
    const printSettings = allPrintSettings[activeType] || { paper: 'A4', cols: 2, rows: 4 };
    const [processing, setProcessing] = useState(false);
    
    // Update settings for current type
    const setSettings = (newSettingsOrFn) => {
        setAllSettings(prev => {
            const current = prev[activeType] || defaultCardSetting;
            const newVal = typeof newSettingsOrFn === 'function' ? newSettingsOrFn(current) : newSettingsOrFn;
            return { ...prev, [activeType]: newVal };
        });
    };

    const setPrintSettings = (newSettingsOrFn) => {
        setAllPrintSettings(prev => {
            const current = prev[activeType] || { paper: 'A4', cols: 2, rows: 4 };
            const newVal = typeof newSettingsOrFn === 'function' ? newSettingsOrFn(current) : newSettingsOrFn;
            return { ...prev, [activeType]: newVal };
        });
    };

    // Element handling
    const handleElementChange = (key, field, value) => {
        setSettings(prev => ({
            ...prev,
            elements: {
                ...prev.elements,
                [key]: {
                    ...prev.elements[key],
                    [field]: value
                }
            }
        }));
    };

    const toggleElement = (key) => {
        setSettings(prev => {
            const exists = prev.elements?.[key];
            if (exists) {
                // Toggle visibility
                return {
                    ...prev,
                    elements: {
                        ...prev.elements,
                        [key]: { ...exists, visible: !exists.visible }
                    }
                };
            } else {
                // Add new element
                return {
                    ...prev,
                    elements: {
                        ...prev.elements,
                        [key]: { ...defaultElementConfig, visible: true }
                    }
                };
            }
        });
    };

    // Drag and Drop Logic
    const [selectedId, setSelectedId] = useState(null);
    const [dragState, setDragState] = useState(null); // Just for cursor feedback
    const containerRef = useRef(null);

    const handleMouseDown = (e, id, type = 'move') => {
        e.stopPropagation(); // Prevent container drag if any
        e.preventDefault(); // Prevent text selection
        
        setSelectedId(id);
        
        const config = settings.elements[id];
        const startX = e.clientX;
        const startY = e.clientY;
        // Ensure values are numbers to avoid string concatenation
        const initialX = parseFloat(config.x) || 0;
        const initialY = parseFloat(config.y) || 0;
        const initialSize = parseFloat(config.size) || 10;

        setDragState({ type }); // Visual feedback

        const handleMouseMove = (moveEvent) => {
            if (!containerRef.current) return;

            const container = containerRef.current.getBoundingClientRect();
            
            if (type === 'move') {
                const dxPx = moveEvent.clientX - startX;
                const dyPx = moveEvent.clientY - startY;

                // Calculate percentage relative to container dimensions (which includes scale)
                const dxPercent = (dxPx / container.width) * 100;
                const dyPercent = (dyPx / container.height) * 100;

                const newX = Math.max(0, Math.min(100, initialX + dxPercent));
                const newY = Math.max(0, Math.min(100, initialY + dyPercent));

                handleElementChange(id, 'x', parseFloat(newX.toFixed(2)));
                handleElementChange(id, 'y', parseFloat(newY.toFixed(2)));
            } else if (type === 'resize') {
                const scale = 1.2; // Match the transform: scale(1.2)
                // Calculate deltas in pixels (unscaled) for resize calculation
                const dx = (moveEvent.clientX - startX) / scale;
                const dy = (moveEvent.clientY - startY) / scale;
                // Resize logic
                const isMm = ['avatar', 'qr_code'].includes(id);
                const factor = isMm ? (1 / 3.78) : 0.5; // Sensitivity factor
                
                const delta = (dx + dy) / 2; 
                const newSize = Math.max(1, initialSize + (delta * factor));
                
                handleElementChange(id, 'size', parseFloat(newSize.toFixed(1)));
            }
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            setDragState(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    // Background actions
    const handleUploadBackground = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('activity_id', activity.id);
        formData.append('background', file);

        setUploadingBg(true);
        try {
            const res = await axios.post(route('idcard-background.upload'), formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.success) {
                setBgList(prev => [...prev, { 
                    id: Date.now(), // Temporary ID until reload
                    filename: res.data.filename, 
                    activity_id: activity.id 
                }]);
                // Auto select uploaded bg
                setSettings(prev => ({ ...prev, bg_type: 'image', bg_image: res.data.filename }));
                Swal.fire({ icon: 'success', title: 'Upload Berhasil', timer: 1000, showConfirmButton: false });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.response?.data?.message || 'Gagal upload file' });
        } finally {
            setUploadingBg(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteBackground = async (filename) => {
        Swal.fire({
            title: 'Hapus Background?',
            text: "File akan dihapus permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    await axios.post(route('idcard-background.delete'), {
                        activity_id: activity.id,
                        filename: filename
                    });
                    setBgList(prev => prev.filter(bg => bg.filename !== filename));
                    if (settings.bg_image === filename) {
                        setSettings(prev => ({ ...prev, bg_image: null, bg_type: 'color' }));
                    }
                    Swal.fire('Terhapus!', 'Background telah dihapus.', 'success');
                } catch (error) {
                    Swal.fire('Gagal!', error.response?.data?.message || 'Gagal menghapus file.', 'error');
                }
            }
        });
    };

    // Save logic
    const saveSettings = async () => {
        setProcessing(true);
        try {
            let payloads = [];
            if (cardModel === 'single') {
                payloads.push({
                    activity_id: activity.id,
                    type: 'participant',
                    card_setting: JSON.stringify(allSettings['participant']),
                    print_settings: JSON.stringify(allPrintSettings['participant'])
                });
            } else {
                detectedTypes.forEach(type => {
                    payloads.push({
                        activity_id: activity.id,
                        type: type,
                        card_setting: JSON.stringify(allSettings[type] || defaultCardSetting),
                        print_settings: JSON.stringify(allPrintSettings[type] || { paper: 'A4', cols: 2, rows: 4 })
                    });
                });
            }
            await Promise.all(payloads.map(p => axios.post(route('card-settings.save'), p)));
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Pengaturan kartu berhasil disimpan', timer: 1500 });
        } catch (error) {
            console.error(error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal menyimpan pengaturan' });
        } finally {
            setProcessing(false);
        }
    };

    // Helper to resolve values from sample data
    const getValue = (key, data) => {
        if (!data) return '-';
        
        // Direct mapping
        if (key === 'name') return data.user?.name || data.name || 'Nama Peserta';
        if (key === 'email') return data.user?.email || data.email || 'email@example.com';
        if (key === 'id_number') return data.uid || data.id_number || '12345678';
        if (key === 'role') return data.role || data.user?.role || 'Peserta';
        
        // Profile mapping
        if (data.user?.profile?.[key]) {
            const val = data.user.profile[key];
            return (typeof val === 'object' && val !== null) ? (val.name || '-') : val;
        }

        // Region mapping (if nested object)
        if (['province', 'regency', 'district'].includes(key) && data.user?.profile?.[key]) {
             return data.user.profile[key].name || data.user.profile[key] || '-';
        }

        // Custom Data
        if (data.custom_data?.[key]) return data.custom_data[key];

        // Fallback to top level
        return data[key] || `[${key}]`;
    };

    const currentSample = sampleData[activeType] || sampleData['participant'] || {};

    // Group columns
    const groupedColumns = availableColumns.reduce((acc, col) => {
        const group = col.group || 'Lainnya';
        if (!acc[group]) acc[group] = [];
        acc[group].push(col);
        return acc;
    }, {});

    return (
        <AcaraLayout title={`Desain Kartu ID - ${activity.name}`} activity={activity}>
            <div className="bg-gray-50 min-h-screen p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Desain Kartu</h1>
                        <p className="text-gray-500 text-sm mt-1">Sesuaikan tampilan kartu untuk {activity.name}.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={saveSettings} disabled={processing} className="px-6 py-2 bg-primary hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition disabled:opacity-50">
                            {processing ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Settings Panel */}
                    <div className="lg:col-span-1 space-y-6">
                        
                        {/* Model Selection */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">Model Kartu</h3>
                            <div className="flex gap-4">
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="card_model" value="single" checked={cardModel === 'single'} onChange={() => { setCardModel('single'); setActiveType('participant'); }} className="w-4 h-4 text-primary focus:ring-indigo-500 border-gray-300" />
                                    <span className="ml-2 text-gray-700">Single</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input type="radio" name="card_model" value="multi" checked={cardModel === 'multi'} onChange={() => setCardModel('multi')} className="w-4 h-4 text-primary focus:ring-indigo-500 border-gray-300" />
                                    <span className="ml-2 text-gray-700">Multi</span>
                                </label>
                            </div>
                            {cardModel === 'multi' && (
                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Peserta</label>
                                    <div className="flex flex-wrap gap-2">
                                        {detectedTypes.map(type => (
                                            <button key={type} onClick={() => setActiveType(type)} className={`px-3 py-1.5 text-sm rounded-md border transition ${activeType === type ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-medium' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                                                {type.charAt(0).toUpperCase() + type.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Layout Settings */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">Layout & Kertas</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ukuran Kertas</label>
                                    <select value={printSettings.paper || 'A4'} onChange={(e) => setPrintSettings({...printSettings, paper: e.target.value})} className="w-full border-gray-300 rounded-md shadow-sm sm:text-sm">
                                        <option value="A4">A4 (210 x 297 mm)</option>
                                        <option value="F4">F4 (215 x 330 mm)</option>
                                        <option value="IDCARD">Satuan (ID Card Size)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Background Settings */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">Latar Belakang</h3>
                            <div className="space-y-4">
                                <div className="flex gap-4">
                                    <label className="inline-flex items-center">
                                        <input type="radio" name={`bg_type_${activeType}`} value="color" checked={settings.bg_type === 'color'} onChange={() => setSettings({...settings, bg_type: 'color'})} className="text-primary border-gray-300" />
                                        <span className="ml-2 text-sm text-gray-600">Warna Solid</span>
                                    </label>
                                    <label className="inline-flex items-center">
                                        <input type="radio" name={`bg_type_${activeType}`} value="image" checked={settings.bg_type === 'image'} onChange={() => setSettings({...settings, bg_type: 'image'})} className="text-primary border-gray-300" />
                                        <span className="ml-2 text-sm text-gray-600">Gambar</span>
                                    </label>
                                </div>

                                {settings.bg_type === 'color' && (
                                    <input type="color" value={settings.bg_color || '#ffffff'} onChange={(e) => setSettings({...settings, bg_color: e.target.value})} className="h-10 w-full rounded-md border border-gray-300 p-1" />
                                )}

                                {settings.bg_type === 'image' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => fileInputRef.current?.click()} disabled={uploadingBg} className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 text-gray-700 flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                                                {uploadingBg ? 'Uploading...' : 'Upload Background'}
                                            </button>
                                            <input type="file" ref={fileInputRef} onChange={handleUploadBackground} className="hidden" accept="image/*" />
                                        </div>
                                        
                                        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-gray-50">
                                            {bgList && bgList.length > 0 ? (
                                                bgList.map(bg => (
                                                    <div key={bg.filename} className={`relative group cursor-pointer border-2 rounded overflow-hidden h-16 ${settings.bg_image === bg.filename ? 'border-indigo-500' : 'border-transparent'}`}>
                                                        <img 
                                                            src={`/assets/images/card/${bg.filename}`} 
                                                            alt="bg" 
                                                            className="w-full h-full object-cover"
                                                            onClick={() => setSettings({...settings, bg_image: bg.filename})}
                                                        />
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteBackground(bg.filename); }}
                                                            className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 rounded-bl"
                                                            title="Hapus"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                        </button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-3 text-xs text-gray-500 text-center py-4">Belum ada background.</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Element Visibility - Dynamic */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-semibold text-gray-800 mb-4 border-b pb-2">Elemen Kartu</h3>
                            
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {Object.keys(groupedColumns).map(group => (
                                    <div key={group} className="space-y-2">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{group}</h4>
                                        <div className="space-y-1 pl-1">
                                            {groupedColumns[group].map(col => (
                                                <div key={col.key} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                                                    <span className="text-sm text-gray-700 truncate mr-2" title={col.label}>{col.label}</span>
                                                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                                        <input 
                                                            type="checkbox" 
                                                            className="sr-only peer"
                                                            checked={settings.elements?.[col.key]?.visible ?? false}
                                                            onChange={() => toggleElement(col.key)}
                                                        />
                                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="lg:col-span-2 lg:sticky lg:top-4 h-fit">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
                            <h3 className="font-semibold text-gray-800 mb-4 w-full text-left">Preview ({activeType === 'participant' ? 'Peserta' : 'Panitia'})</h3>
                            
                            {/* DEBUG: Remove in production */}
                            {/* <pre className="text-xs bg-gray-200 p-2 w-full overflow-auto mb-4">{JSON.stringify(settings, null, 2)}</pre> */}

                            <div className="w-full bg-gray-100 rounded-lg p-8 overflow-auto flex justify-center min-h-[500px]" onClick={() => setSelectedId(null)}>
                                {/* Canvas */}
                                <div 
                                    ref={containerRef}
                                    className="relative bg-white shadow-lg overflow-hidden transition-all duration-300"
                                    style={{
                                        width: `${(settings.width || 53.98) * 3.78}px`, // mm to px approx
                                        height: `${(settings.height || 85.60) * 3.78}px`,
                                        backgroundColor: settings.bg_type === 'color' ? (settings.bg_color || '#ffffff') : '#ffffff',
                                        backgroundImage: settings.bg_type === 'image' && settings.bg_image ? `url(/assets/images/card/${settings.bg_image})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        transform: 'scale(1.2)', // Visual zoom
                                        transformOrigin: 'top center'
                                    }}
                                >
                                    {/* Render Elements */}
                                    {Object.entries(settings.elements || {}).map(([key, config]) => {
                                        if (!config.visible) return null;
                                        
                                        const isSelected = selectedId === key;
                                        
                                        // Common styles
                                        const style = {
                                            position: 'absolute',
                                            left: `${config.x}%`,
                                            top: `${config.y}%`,
                                            transform: config.align === 'center' ? 'translate(-50%, -50%)' : 'translate(0, -50%)',
                                            zIndex: isSelected ? 20 : 10,
                                            cursor: dragState ? 'grabbing' : 'grab',
                                            whiteSpace: 'nowrap',
                                            userSelect: 'none',
                                            border: isSelected ? '1px dashed #4F46E5' : '1px solid transparent',
                                            padding: '2px' // Add padding for easier selection
                                        };

                                        let content = null;
                                        
                                        if (key === 'avatar') {
                                            const avatarSrc = currentSample.user?.profile_photo_url 
                                                || currentSample.user?.avatar 
                                                || '/assets/images/profilefoto/default-profile.png';

                                            content = (
                                                <div style={{ width: `${config.size}mm`, height: `${config.size}mm` }}>
                                                    <img 
                                                        src={avatarSrc}
                                                        alt={currentSample.user?.name || 'Avatar'}
                                                        className="w-full h-full object-cover border border-gray-200 pointer-events-none"
                                                        onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                                    />
                                                </div>
                                            );
                                        } else if (key === 'qr_code') {
                                            content = (
                                                <div style={{ width: `${config.size}mm`, height: `${config.size}mm` }}>
                                                    <img 
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${currentSample.uid || 'SAMPLE'}`} 
                                                        alt="QR" 
                                                        className="w-full h-full pointer-events-none"
                                                    />
                                                </div>
                                            );
                                        } else {
                                            // Text Elements
                                            content = (
                                                <div 
                                                    style={{ 
                                                        fontSize: `${config.size}pt`, 
                                                        color: config.color,
                                                        fontWeight: config.weight || 'normal',
                                                        fontFamily: config.font || 'Arial',
                                                        pointerEvents: 'none' // Let wrapper handle events
                                                    }}
                                                >
                                                    {getValue(key, currentSample)}
                                                </div>
                                            );
                                        }

                                        return (
                                            <div 
                                                key={key}
                                                style={style}
                                                onMouseDown={(e) => handleMouseDown(e, key, 'move')}
                                            >
                                                {content}
                                                {/* Resize Handle - Bottom Right */}
                                                {isSelected && (
                                                    <div 
                                                        className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary rounded-full cursor-se-resize z-30"
                                                        onMouseDown={(e) => handleMouseDown(e, key, 'resize')}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Draggable Hint Overlay (Could be added here) */}
                                </div>
                            </div>

                            {/* Element Properties Editor - Only show for visible elements? Or just rely on standard fields? 
                                Ideally, clicking an element in preview selects it for editing. 
                                For now, we list properties of *visible* elements below preview or rely on basic defaults.
                                To make it fully functional, we need a property editor for the "Selected Element".
                            */}
                            
                            <div className="w-full mt-6 border-t pt-4">
                                <h4 className="font-semibold text-gray-700 mb-2">Edit Posisi & Gaya</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {Object.entries(settings.elements || {}).filter(([_, c]) => c.visible).map(([key, config]) => (
                                        <div key={key} className="bg-gray-50 p-3 rounded border border-gray-200 text-sm">
                                            <div className="font-medium text-indigo-700 mb-2 capitalize border-b pb-1 flex justify-between">
                                                {availableColumns.find(c => c.key === key)?.label || key}
                                                <span className="text-xs text-gray-400">({key})</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs text-gray-500">X (%)</label>
                                                    <input type="number" value={config.x} onChange={(e) => handleElementChange(key, 'x', parseFloat(e.target.value))} className="w-full text-xs p-1 border rounded" />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-gray-500">Y (%)</label>
                                                    <input type="number" value={config.y} onChange={(e) => handleElementChange(key, 'y', parseFloat(e.target.value))} className="w-full text-xs p-1 border rounded" />
                                                </div>
                                                {/* Only show size/color for text */}
                                                {!['avatar', 'qr_code'].includes(key) && (
                                                    <>
                                                        <div>
                                                            <label className="text-xs text-gray-500">Size (pt)</label>
                                                            <input type="number" value={config.size} onChange={(e) => handleElementChange(key, 'size', parseFloat(e.target.value))} className="w-full text-xs p-1 border rounded" />
                                                        </div>
                                                        <div>
                                                            <label className="text-xs text-gray-500">Color</label>
                                                            <input type="color" value={config.color} onChange={(e) => handleElementChange(key, 'color', e.target.value)} className="w-full h-6 p-0 border rounded" />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <label className="text-xs text-gray-500">Align</label>
                                                            <select value={config.align || 'left'} onChange={(e) => handleElementChange(key, 'align', e.target.value)} className="w-full text-xs p-1 border rounded">
                                                                <option value="left">Left</option>
                                                                <option value="center">Center</option>
                                                                <option value="right">Right</option>
                                                            </select>
                                                        </div>
                                                        <div className="col-span-2">
                                                             <label className="text-xs text-gray-500">Weight</label>
                                                             <select value={config.weight || 'normal'} onChange={(e) => handleElementChange(key, 'weight', e.target.value)} className="w-full text-xs p-1 border rounded">
                                                                 <option value="normal">Normal</option>
                                                                 <option value="bold">Bold</option>
                                                             </select>
                                                        </div>
                                                    </>
                                                )}
                                                {['avatar', 'qr_code'].includes(key) && (
                                                     <div className="col-span-2">
                                                         <label className="text-xs text-gray-500">Size (mm)</label>
                                                         <input type="number" value={config.size} onChange={(e) => handleElementChange(key, 'size', parseFloat(e.target.value))} className="w-full text-xs p-1 border rounded" />
                                                     </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </AcaraLayout>
    );
}

