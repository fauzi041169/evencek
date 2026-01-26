import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function Results({ activity, attendance, participants }) {
    const [attendances, setAttendances] = useState([]);
    const [selectedBackground, setSelectedBackground] = useState(localStorage.getItem('selectedBackground') || null);
    const [showBackgroundModal, setShowBackgroundModal] = useState(false);
    const [backgroundImages, setBackgroundImages] = useState([]);

    useEffect(() => {
        // Load attendance records
        fetchAttendances(false);
        const interval = setInterval(() => fetchAttendances(true), 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchAttendances = async (isBackground = false) => {
        try {
            const response = await fetch(window.location.href, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            const data = await response.json();
            if (data.attendances) {
                setAttendances(data.attendances);
            }
        } catch (error) {
            console.error('Error fetching attendances:', error);
            if (!isBackground) {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal memuat data absensi',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        }
    };

    const loadBackgroundOptions = async () => {
        try {
            const response = await fetch(route('background.images'));
            const images = await response.json();
            if (!images.error) {
                setBackgroundImages(images);
            }
        } catch (error) {
            console.error('Error loading backgrounds:', error);
        }
    };

    const openBackgroundModal = () => {
        loadBackgroundOptions();
        setShowBackgroundModal(true);
    };

    const setBackground = (imageName) => {
        setSelectedBackground(imageName);
        localStorage.setItem('selectedBackground', imageName);
        setShowBackgroundModal(false);
    };

    const backgroundStyle = selectedBackground 
        ? { backgroundImage: `url('/assets/images/begron/${selectedBackground}')` }
        : {};

    return (
        <>
            <Head title={`Hasil Absensi - ${activity.name}`} />
            
            <div 
                className="min-h-screen bg-cover bg-center bg-fixed p-5" 
                style={backgroundStyle}
            >
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
                    {/* Main Title Section */}
                    <div className="text-center mb-4 sm:mb-6 lg:mb-8 bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6">
                        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-secondary mb-1 sm:mb-2">
                            {activity.name}
                        </h1>
                        <p className="text-base sm:text-lg lg:text-xl text-gray-600">
                            {attendance.name}
                        </p>
                    </div>

                    {/* Header with Back Button */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl sm:rounded-2xl shadow-lg px-4 sm:px-6 py-3 sm:py-4 mb-4 sm:mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <h5 className="text-base sm:text-lg font-semibold">
                            Peserta yang baru absen
                        </h5>
                        <Link 
                            href={route('attendance.management', { activity: activity.id })}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-sm sm:text-base"
                        >
                            <i className="fas fa-arrow-left mr-2"></i> Kembali
                        </Link>
                    </div>

                    {/* Attendance Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {participants && participants.length > 0 ? (
                            participants.slice(0, 9).map((record, index) => (
                                <div 
                                    key={record.id || index} 
                                    className="bg-white rounded-xl sm:rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
                                >
                                    {/* Profile Section */}
                                    <div className="p-5 text-center border-b border-gray-100">
                                        <img 
                                            src={record.user?.profile?.foto_url || '/assets/images/profilefoto/default-profile.png'}
                                            alt="Profile" 
                                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mx-auto mb-3 border-4 border-blue-500 p-0.5"
                                            onError={(e) => {
                                                e.target.src = '/assets/images/profilefoto/default-profile.png';
                                            }}
                                        />
                                        <div className="mt-2 sm:mt-3">
                                            <h6 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
                                                {record.user?.name || 'Nama tidak tersedia'}
                                            </h6>
                                            {record.user?.profile?.instansi && (
                                                <p className="text-xs sm:text-sm text-gray-500">
                                                    {record.user.profile.instansi.slice(0, 30)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Time & Status */}
                                    <div className="p-3 sm:p-4">
                                        <div className="text-center mb-2 sm:mb-3">
                                            <div className="inline-flex items-center text-xs sm:text-sm text-gray-600">
                                                <i className="far fa-clock mr-1.5 sm:mr-2"></i>
                                                <span className="whitespace-nowrap">
                                                    {record.created_at ? new Date(record.created_at).toLocaleDateString('id-ID', { 
                                                        day: '2-digit', 
                                                        month: 'short', 
                                                        year: 'numeric' 
                                                    }) : '-'}
                                                </span>
                                                <span className="hidden sm:inline ml-1">
                                                    {record.created_at ? new Date(record.created_at).toLocaleTimeString('id-ID', { 
                                                        hour: '2-digit', 
                                                        minute: '2-digit', 
                                                        second: '2-digit' 
                                                    }) : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`block text-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold text-xs sm:text-sm ${
                                            record.status 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {record.status ? 'Hadir' : 'Tidak Hadir'}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-full text-center py-12 sm:py-16 bg-white rounded-xl sm:rounded-2xl shadow-md px-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 mb-3 sm:mb-4">
                                    <i className="fas fa-inbox text-3xl sm:text-4xl text-gray-400"></i>
                                </div>
                                <h5 className="text-lg sm:text-xl font-semibold text-gray-900">
                                    Belum ada data absensi
                                </h5>
                            </div>
                        )}
                    </div>
                </div>

                {/* Background Selector Button */}
                <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50">
                    <button 
                        onClick={openBackgroundModal}
                        className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 text-white rounded-xl shadow-lg hover:bg-secondary hover:scale-105 transition-all"
                    >
                        <i className="fas fa-image"></i>
                    </button>
                </div>

                {/* Background Modal */}
                {showBackgroundModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl">
                            <div className="p-4 sm:p-6">
                                <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">
                                    Pilih Background
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-2">
                                    {backgroundImages.map((image, index) => (
                                        <div 
                                            key={index} 
                                            className="cursor-pointer rounded-lg overflow-hidden hover:scale-105 transition-transform"
                                            onClick={() => setBackground(image)}
                                        >
                                            <img 
                                                src={`/assets/images/begron/${image}`}
                                                alt={image}
                                                className="w-full h-24 object-cover"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <button 
                                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all mt-4"
                                    onClick={() => setShowBackgroundModal(false)}
                                >
                                    <i className="fas fa-times mr-2"></i>
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}

