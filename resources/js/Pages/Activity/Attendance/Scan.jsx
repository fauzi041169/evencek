import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import Alerts from '@/Components/Alerts';
import QRScanner from '@/Components/QRScanner';

export default function Scan({ activity, attendance, activity_id, attendance_id, participants, backgrounds }) {
    const { flash, errors } = usePage().props;
    const [scanning, setScanning] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [currentBackground, setCurrentBackground] = useState(backgrounds.length > 0 ? backgrounds[0] : '/assets/images/hero/defoult.webp');
    const [showBgDropdown, setShowBgDropdown] = useState(false);
    const [scannedUser, setScannedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [duplicateData, setDuplicateData] = useState(null);
    const inputRef = useRef(null);

    // Auto-focus input when manual mode is active
    useEffect(() => {
        if (manualMode && inputRef.current) {
            inputRef.current.focus();
        }
    }, [manualMode, duplicateData, scannedUser]);

    // Auto-submit when manual code stops changing or matches length
    useEffect(() => {
        if (manualMode && manualCode && manualCode.length >= 6) {
            const timeoutId = setTimeout(() => {
                processAttendance(manualCode);
                setManualCode('');
            }, 500); // 500ms delay to wait for scanner/typing to finish

            return () => clearTimeout(timeoutId);
        }
    }, [manualCode, manualMode]);

    const processAttendance = (code) => {
        // Extract ID if the code is in V:ActID:UserID format
        let finalCode = code;
        if (code.includes(':')) {
            const parts = code.split(':');
            // Take the last part which is likely the User ID
            if (parts.length > 0) {
                finalCode = parts[parts.length - 1];
            }
        }

        axios.post(route('attendance.scan.store'), {
            scanned_id: finalCode,
            activity_id: activity_id,
            attendance_id: attendance_id,
            status: 1
        })
        .then(response => {
            if (response.data.success) {
                // Success
                setScannedUser(response.data.user);
                setShowModal(true);
                
                // Auto close modal after 3 seconds
                setTimeout(() => {
                    setShowModal(false);
                    setScannedUser(null);
                }, 3000);
            } else {
                if (response.data.already_scanned) {
                    setDuplicateData({
                        name: response.data.user_name,
                        attendanceName: response.data.attendance_name,
                        time: response.data.first_scan_time,
                        photo: response.data.user_profile_url,
                        instansi: response.data.user_instansi,
                        province: response.data.user_province
                    });
                    
                    // Auto clear duplicate message after 3 seconds
                    setTimeout(() => {
                        setDuplicateData(null);
                    }, 3000);
                } else {
                    // Handle error (already scanned, etc)
                    alert(response.data.message || 'Gagal mencatat absensi');
                }
            }
        })
        .catch(error => {
            console.error(error);
            alert(error.response?.data?.message || 'Terjadi kesalahan saat menghubungi server');
        });
    };

    const handleScanSuccess = (decodedText) => {
        if (!decodedText) return;
        processAttendance(decodedText);
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        processAttendance(manualCode);
        setManualCode('');
    };
    
    const bgUploadForm = useForm({
        background: null,
    });

    const handleBgUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            bgUploadForm.setData('background', file);
            bgUploadForm.post(route('attendance.scan.backgrounds.upload'), {
                onSuccess: () => {
                    bgUploadForm.reset();
                }
            });
        }
    };

    const handleDeleteBg = (path) => {
        if (confirm('Hapus background ini?')) {
            router.post(route('attendance.scan.backgrounds.delete'), { path });
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
            <Head title="Scanner QR Code" />

            {/* Background Image with Overlay */}
            <div className="absolute inset-0 z-0">
                <div 
                    className="absolute inset-0 bg-cover bg-center transition-all duration-700"
                    style={{ backgroundImage: `url('${currentBackground.startsWith('/') ? currentBackground : '/' + currentBackground}')` }}
                />
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />
            </div>

            {/* Navbar / Top Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-50">
                <button 
                    onClick={() => window.history.back()}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all text-sm font-medium border border-white/10"
                >
                    <i className="fas fa-arrow-left"></i>
                    <span className="hidden sm:inline">Kembali</span>
                </button>

                <div className="relative">
                    <button 
                        onClick={() => setShowBgDropdown(!showBgDropdown)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all text-sm font-medium border border-white/10"
                    >
                        <i className="fas fa-image"></i>
                        <span className="hidden sm:inline">Background</span>
                    </button>
                    
                    {showBgDropdown && (
                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-50 max-h-[80vh] overflow-y-auto animate-fade-in-down">
                            <h3 className="text-sm font-bold text-gray-700 mb-3 px-1">Pilih Background</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {backgrounds.map((bg, idx) => (
                                    <div key={idx} className="relative group rounded-lg overflow-hidden aspect-video border border-gray-200">
                                        <img 
                                            src={`/${bg}`} 
                                            alt="Bg" 
                                            className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                            onClick={() => {
                                                setCurrentBackground(bg);
                                                setShowBgDropdown(false);
                                            }}
                                            onError={(e) => e.target.src = '/assets/images/hero/defoult.webp'}
                                        />
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteBg(bg); }}
                                            className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 text-white rounded-full flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Hapus"
                                        >
                                            <i className="fas fa-times text-xs"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-3 pt-3 border-t border-gray-100">
                                <label className="flex items-center justify-center w-full px-4 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors text-sm font-medium border border-dashed border-gray-300">
                                    <i className="fas fa-cloud-upload-alt mr-2"></i> Upload Baru
                                    <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Flash Messages */}
            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[60] w-full max-w-md px-4">
                <Alerts flash={flash} errors={errors} />
            </div>

            {/* Main Card */}
            <div className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('/assets/images/begron/bg-pattern.png')]"></div>
                    <div className="relative z-10">
                        <h1 className="text-xl font-bold leading-tight mb-1">{activity?.name}</h1>
                        <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-medium backdrop-blur-sm mt-2">
                            {attendance?.name}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button 
                        onClick={() => { setManualMode(false); setScanning(false); }}
                        className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${!manualMode 
                            ? 'text-blue-600' 
                            : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <i className="fas fa-qrcode mr-2"></i> Scan QR
                        {!manualMode && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                    </button>
                    <button 
                        onClick={() => { setManualMode(true); setScanning(false); }}
                        className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${manualMode 
                            ? 'text-blue-600' 
                            : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        <i className="fas fa-keyboard mr-2"></i> Input Manual
                        {manualMode && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-6 bg-gray-50/50 min-h-[300px] flex flex-col justify-center">
                    
                    {!manualMode ? (
                        <div className="flex flex-col items-center">
                            {!scanning ? (
                                <div className="text-center py-8 animate-fade-in">
                                    <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                        <i className="fas fa-camera text-4xl"></i>
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-2">Siap untuk Memindai?</h3>
                                    <p className="text-gray-500 mb-8 text-sm px-4">Pastikan kode QR terlihat jelas dan memiliki pencahayaan yang cukup.</p>
                                    <button 
                                        onClick={() => setScanning(true)}
                                        className="w-full max-w-xs px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        Aktifkan Kamera
                                    </button>
                                </div>
                            ) : (
                                <div className="w-full animate-fade-in">
                                    <div className="relative overflow-hidden rounded-xl shadow-lg border-2 border-gray-200 bg-black">
                                        <QRScanner 
                                            onScanSuccess={handleScanSuccess} 
                                            active={scanning}
                                            showCameraSelector={true}
                                        />
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan-line opacity-50"></div>
                                    </div>
                                    <button 
                                        onClick={() => setScanning(false)}
                                        className="mt-6 w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold border border-red-200 transition-colors"
                                    >
                                        Stop Scanner
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                {/* Dynamic Header Area: Default / Success / Duplicate */}
                                <div className="min-h-[160px] flex items-center justify-center mb-4">
                                    {scannedUser ? (
                                        // Success View
                                        <div className="text-center animate-zoom-in w-full">
                                            <div className="relative inline-block mb-3">
                                                <div className="w-24 h-24 rounded-full p-1 bg-green-500 shadow-lg mx-auto">
                                                    <img 
                                                        src={scannedUser.profile?.foto_url || '/assets/images/profilefoto/default-profile.png'} 
                                                        alt={scannedUser.name}
                                                        className="w-full h-full rounded-full object-cover border-4 border-white"
                                                        onError={(e) => e.target.src = '/assets/images/profilefoto/default-profile.png'}
                                                    />
                                                </div>
                                                <div className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-1.5 border-2 border-white shadow-sm">
                                                    <i className="fas fa-check text-sm"></i>
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-800 leading-tight">{scannedUser.name}</h3>
                                            <p className="text-sm text-gray-500 font-medium">{scannedUser.profile?.instansi || 'Peserta'}</p>
                                            {scannedUser.profile?.province?.name && (
                                                <p className="text-xs text-gray-400 mt-1">{scannedUser.profile.province.name}</p>
                                            )}
                                        </div>
                                    ) : duplicateData ? (
                                        // Duplicate View
                                        <div className="text-center animate-zoom-in w-full">
                                            <div className="relative inline-block mb-3">
                                                <div className="w-24 h-24 rounded-full p-1 bg-yellow-400 shadow-lg mx-auto">
                                                <img 
                                                    src={duplicateData.photo || '/assets/images/profilefoto/default-profile.png'} 
                                                    alt={duplicateData.name}
                                                    className="w-full h-full rounded-full object-cover border-4 border-white"
                                                    onError={(e) => e.target.src = '/assets/images/profilefoto/default-profile.png'}
                                                />
                                            </div>
                                                <div className="absolute bottom-0 right-0 bg-yellow-400 text-white rounded-full p-1.5 border-2 border-white shadow-sm">
                                                    <i className="fas fa-exclamation-triangle text-sm"></i>
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-800 leading-tight">{duplicateData.name}</h3>
                                            <p className="text-sm text-gray-500 font-medium">{duplicateData.instansi || 'Peserta'}</p>
                                            {duplicateData.province && (
                                                <p className="text-xs text-gray-400 mt-1">{duplicateData.province}</p>
                                            )}
                                            <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-gray-700 mx-auto max-w-[280px]">
                                                <div className="font-bold text-yellow-600 mb-1 text-[10px] uppercase tracking-wider">Sudah Absen</div>
                                                Maaf, anda telah <strong>{duplicateData.attendanceName}</strong> sebelumnya di jam <strong>{duplicateData.time}</strong>.
                                            </div>
                                        </div>
                                    ) : (
                                        // Default View
                                        <div className="text-center animate-fade-in">
                                            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-blue-100">
                                                <i className="fas fa-keyboard text-3xl"></i>
                                            </div>
                                            <h3 className="text-lg font-bold text-gray-800">Input Kode Manual</h3>
                                            <p className="text-sm text-gray-500">Masukkan ID Peserta atau Kode Unik</p>
                                        </div>
                                    )}
                                </div>

                                <div className="relative">
                                    <input 
                                        ref={inputRef}
                                        type="text" 
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        className={`w-full px-5 py-4 bg-white border-2 rounded-xl focus:ring-4 outline-none transition-all text-center text-lg font-mono placeholder-gray-300 shadow-sm
                                            ${duplicateData 
                                                ? 'border-yellow-400 focus:border-yellow-500 focus:ring-yellow-100' 
                                                : scannedUser 
                                                    ? 'border-green-400 focus:border-green-500 focus:ring-green-100' 
                                                    : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                                            }`}
                                        placeholder="Scan Kartu / Input Kode"
                                        autoFocus
                                    />
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-xs text-gray-400">
                        &copy; {new Date().getFullYear()} EventCek System. All rights reserved.
                    </p>
                </div>
            </div>

            {/* Result Modal - Removed as per request to show inline */}
            
            {/* Duplicate/Error Modal - Removed as per request to show inline */}
        </div>
    );
}
