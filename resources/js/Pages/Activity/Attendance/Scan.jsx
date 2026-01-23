import React, { useState, useRef } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import Alerts from '@/Components/Alerts';
import QRScanner from '@/Components/QRScanner';

export default function Scan({ activity, attendance, activity_id, attendance_id, participants, backgrounds }) {
    const { flash, errors } = usePage().props;
    const [scanning, setScanning] = useState(false);
    const [manualMode, setManualMode] = useState(false);
    const [manualCode, setManualCode] = useState('');
    const [currentBackground, setCurrentBackground] = useState(backgrounds.length > 0 ? backgrounds[0] : '/assets/images/hero/defoult.webp');
    const [showBgDropdown, setShowBgDropdown] = useState(false);

    const processAttendance = (code) => {
        // Stop scanning momentarily is handled by the scanner component via active prop if we want, 
        // but here we might want to keep it active or pause it.
        // For now, let's just process.
        
        // Placeholder for attendance processing logic
        // We will assume the code is the User ID or QR data
        
        router.post(route('scan.store'), {
            scanned_id: code,
            activity_id: activity_id,
            attendance_id: attendance_id,
            status: 1
        }, {
            preserveState: true,
            preserveScroll: true,
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
        <div style={{
            background: `url('${currentBackground}') no-repeat center center fixed`,
            backgroundSize: 'cover',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }}>
            <Head title="Scanner QR Code" />
            
            <div className="fixed top-4 right-4 z-[10000] max-w-sm">
                <Alerts flash={flash} errors={errors} />
            </div>

            {/* Navbar */}
            <nav className="fixed top-2 sm:top-4 right-2 sm:right-4 z-50 flex gap-2">
                <div className="relative">
                    <button 
                        onClick={() => setShowBgDropdown(!showBgDropdown)}
                        className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-md"
                    >
                        <i className="fas fa-image"></i>
                    </button>
                    
                    {showBgDropdown && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-50 max-h-[80vh] overflow-y-auto">
                            {backgrounds.map((bg, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-2 p-2 hover:bg-gray-50 rounded">
                                    <div 
                                        className="flex-grow cursor-pointer"
                                        onClick={() => {
                                            setCurrentBackground(bg);
                                            setShowBgDropdown(false);
                                        }}
                                    >
                                        <img src={`/${bg}`} alt="Background" className="w-32 h-16 object-cover rounded" onError={(e) => e.target.src = '/assets/images/hero/defoult.webp'} />
                                    </div>
                                    <button 
                                        onClick={() => handleDeleteBg(bg)}
                                        className="w-8 h-8 bg-red-100 text-red-600 rounded hover:bg-red-200 flex items-center justify-center"
                                    >
                                        <i className="fas fa-trash text-xs"></i>
                                    </button>
                                </div>
                            ))}
                            <div className="mt-2 pt-2 border-t border-gray-200">
                                <label className="flex items-center justify-center w-full px-3 py-2 bg-secondary/10 text-blue-700 rounded-lg hover:bg-blue-200 cursor-pointer transition-all">
                                    <i className="fas fa-plus mr-2"></i> Tambah Background
                                    <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={() => window.history.back()}
                    className="inline-flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 bg-secondary text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
            </nav>

            <div className="max-w-2xl w-full">
                {/* Header Info */}
                <div className="flex justify-center mb-6">
                    <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg shadow-md text-center">
                        <h4 className="text-xl font-bold text-secondary mb-2">{activity?.name}</h4>
                        <p className="text-gray-600 text-lg">{attendance?.name}</p>
                    </div>
                </div>

                {/* Scanner Container */}
                <div className="bg-white p-6 rounded-[15px] shadow-[0_15px_35px_rgba(0,0,0,0.2)] transform transition-all hover:-translate-y-2 hover:rotate-x-6 perspective-1000">
                    
                    {!scanning && !manualMode && (
                        <div className="text-center mb-4">
                            <button 
                                onClick={() => setScanning(true)}
                                className="w-full sm:w-auto px-6 py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-all shadow-md flex items-center justify-center mx-auto"
                            >
                                <i className="fas fa-camera mr-2"></i> Aktifkan Kamera
                            </button>
                            <p className="text-sm text-gray-500 mt-2">Klik 'Aktifkan Kamera' untuk memulai.</p>
                        </div>
                    )}

                    {!manualMode && (
                        <div className={!scanning ? 'hidden' : ''}>
                            <QRScanner 
                                onScanSuccess={handleScanSuccess} 
                                active={scanning}
                                showCameraSelector={true}
                            />
                            
                            <div className="flex justify-center gap-4 mt-4">
                                <button 
                                    onClick={() => setScanning(false)}
                                    className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-md font-semibold"
                                >
                                    Stop Scanner
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mode Switcher */}
                    <div className="mt-6 border-t pt-4">
                        <div className="flex justify-center bg-gray-100 p-1 rounded-lg inline-flex w-full">
                            <button 
                                onClick={() => { setManualMode(false); setScanning(false); }}
                                className={`flex-1 px-4 py-2 rounded-md font-semibold transition-all text-sm sm:text-base ${!manualMode ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <i className="fas fa-qrcode mr-2"></i>Scan QR
                            </button>
                            <button 
                                onClick={() => { setManualMode(true); setScanning(false); }}
                                className={`flex-1 px-4 py-2 rounded-md font-semibold transition-all text-sm sm:text-base ${manualMode ? 'bg-white text-secondary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <i className="fas fa-keyboard mr-2"></i>Input Manual
                            </button>
                        </div>
                    </div>

                    {/* Manual Input */}
                    {manualMode && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg shadow-inner">
                            <form onSubmit={handleManualSubmit}>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Input Manual</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={manualCode}
                                        onChange={(e) => setManualCode(e.target.value)}
                                        className="flex-grow px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        placeholder="Masukkan kode manual"
                                    />
                                    <button type="submit" className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md">
                                        Submit
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

