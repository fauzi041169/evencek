import { Head, usePage, Link, router } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import CardPreview from '@/Pages/Activity/IdCards/CardPreview';
import BulkImportModal from '@/Components/Activity/BulkImportModal';
import BulkPaymentModal from '@/Components/Activity/BulkPaymentModal';
import ManualPaymentModal from '@/Components/Activity/ManualPaymentModal';
import axios from 'axios';

export default function Show({
    activity,
    currentUser,
    isEnrolled,
    isRegistered,
    enrollmentStatus,
    currentStatus,
    canAccessManagement,
    materials,
    participants,
    roomMap,
    groupMap,
    batches,
    selectedBatchId,
    participantLimitInfo,
    mandiriAttendances,
    manualAttendances,
    userHasAnyAttendance,
    userRoomNumber,
    userRoomHotelName,
    userRoomNotes,
    missingProfileData,
    missingProfileFields,
    pendingPayment,
    canAdminViewButtons,
    cardSetting,
    printSettings,
    certificateSetting,
    certificatePrintSettings
}) {
    const { auth, appSettings } = usePage().props;
    const [search, setSearch] = useState('');
    const [perPage, setPerPage] = useState(20);
    const [filterBatch, setFilterBatch] = useState(selectedBatchId || '');
    const [showCardModal, setShowCardModal] = useState(false);
    const cardContainerRef = useRef(null);
    const [cardScale, setCardScale] = useState(0.8);
    const [modalScale, setModalScale] = useState(1);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentModalData, setPaymentModalData] = useState(null);
    const [loadingPaymentModal, setLoadingPaymentModal] = useState(false);

    // Visibility Logic
    const [visibleSections, setVisibleSections] = useState(activity.visible_sections || {});
    const isVisible = (section) => {
        // Default visible if not explicitly set to false
        return visibleSections[section] !== false;
    };

    const toggleSection = (section) => {
        const newValue = !isVisible(section);
        const newSections = { ...visibleSections, [section]: newValue };
        setVisibleSections(newSections);

        axios.post(route('activity.toggle-section', activity.id), {
            section: section,
            visible: newValue
        }).catch(err => {
            console.error('Failed to toggle section visibility', err);
            // Revert local state on error if needed, but for now let's keep it optimistic
        });
    };

    // Hero Animation Logic
    const heroAnim = appSettings?.hero_animation_style || 'circles';

    const handlePaymentClick = (e) => {
        e.preventDefault();
        setLoadingPaymentModal(true);
        axios.get(route('payments.create', { activity: activity.id, modal: true }))
            .then(res => {
                if (res.data.redirect_url) {
                    window.location.href = res.data.redirect_url;
                } else if (res.data.success !== false) {
                    setPaymentModalData(res.data);
                    setShowPaymentModal(true);
                } else {
                    // Show error in alert instead of redirecting
                    alert('Gagal memuat form pembayaran. Silakan coba lagi.');
                }
            })
            .catch(err => {
                console.error('Error fetching payment data:', err);
                alert('Terjadi kesalahan saat memuat data pembayaran.');
            })
            .finally(() => setLoadingPaymentModal(false));
    };

    // Calculate Modal Scale
    useEffect(() => {
        if (showCardModal && cardSetting) {
            const updateModalScale = () => {
                const widthCm = cardSetting.width_cm || 5.4;
                const heightCm = cardSetting.height_cm || 8.6;
                const widthPx = widthCm * 37.795;
                const heightPx = heightCm * 37.795;

                const vw = window.innerWidth;
                const vh = window.innerHeight;

                // Determine if mobile (e.g. < 640px)
                const isMobile = vw < 640;

                let scale = 1;

                if (isMobile) {
                    // Mobile: Fit to screen with minimal padding
                    const padding = 20; // 10px each side
                    const availableWidth = vw - padding;
                    const availableHeight = vh - 100; // Space for close/download buttons

                    const scaleW = availableWidth / widthPx;
                    const scaleH = availableHeight / heightPx;

                    scale = Math.min(scaleW, scaleH);
                } else {
                    // Desktop: Fit height mostly, but check width too
                    const availableHeight = vh * 0.85; // 85% of screen height
                    const availableWidth = vw * 0.8;

                    const scaleH = availableHeight / heightPx;
                    const scaleW = availableWidth / widthPx;

                    scale = Math.min(scaleH, scaleW);

                    // Cap scale to reasonable max
                    if (scale > 2.5) scale = 2.5;
                }

                setModalScale(scale);
            };

            updateModalScale();
            window.addEventListener('resize', updateModalScale);
            return () => window.removeEventListener('resize', updateModalScale);
        }
    }, [showCardModal, cardSetting]);


    // Auto-scale card to fit container
    useEffect(() => {
        const updateScale = () => {
            if (cardContainerRef.current && cardSetting) {
                const containerWidth = cardContainerRef.current.clientWidth;
                // Default width if not set (portrait CR80: 5.4cm)
                const cardWidthCm = cardSetting.width_cm || 5.4;
                // Conversion factor used in CardPreview
                const cardWidthPx = cardWidthCm * 37.795;

                // Account for padding (p-2 = 8px*2 = 16px) + safe buffer
                const availableWidth = containerWidth - 24;

                let newScale = availableWidth / cardWidthPx;

                // Safety bounds
                if (newScale < 0.1) newScale = 0.5;
                if (newScale > 3) newScale = 3;

                setCardScale(newScale);
            }
        };

        // Initial calculation
        // Small timeout to ensure DOM is ready and layout is stable
        const timer = setTimeout(updateScale, 100);

        window.addEventListener('resize', updateScale);

        return () => {
            window.removeEventListener('resize', updateScale);
            clearTimeout(timer);
        };
    }, [cardSetting]);

    // Handle search debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (search) {
                router.get(
                    route('activity.show', activity.id),
                    { search, per_page: perPage, batch_id: filterBatch },
                    { preserveState: true, preserveScroll: true, replace: true }
                );
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [search]);

    const handlePerPageChange = (e) => {
        const newPerPage = e.target.value;
        setPerPage(newPerPage);
        router.get(
            route('activity.show', activity.id),
            { search, per_page: newPerPage, batch_id: filterBatch },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleBatchChange = (e) => {
        const newBatchId = e.target.value;
        setFilterBatch(newBatchId);
        router.get(
            route('activity.show', activity.id),
            { search, per_page: perPage, batch_id: newBatchId },
            { preserveState: true, preserveScroll: true }
        );
    };

    // Helper for pagination
    const paginationLinks = participants.links || [];
    const participantsList = participants.data || participants;

    const heroCoverPath = activity.image
        ? `/storage/activities/${activity.image}`
        : '/assets/images/begron/defoult.png';

    const [showPrice, setShowPrice] = useState(activity.show_price);
    const [registrationTypeModalOpen, setRegistrationTypeModalOpen] = useState(false);
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [isBulkPaymentModalOpen, setIsBulkPaymentModalOpen] = useState(false);
    const [bulkImportResult, setBulkImportResult] = useState(null);
    const [shareMenuOpen, setShareMenuOpen] = useState(false);

    const togglePriceVisibility = () => {
        if (!confirm('Ubah visibilitas harga?')) return;

        router.post(route('activity.toggle-price', activity.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setShowPrice(!showPrice);
                alert(showPrice ? 'Harga disembunyikan' : 'Harga ditampilkan');
            },
            onError: () => alert('Gagal mengubah visibilitas harga')
        });
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: activity.name,
                url: window.location.href
            }).catch(console.error);
        } else {
            setShareMenuOpen(!shareMenuOpen);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('URL berhasil disalin!');
        setShareMenuOpen(false);
    };

    // Date Logic
    const formatDateRange = (start, end) => {
        if (!start) return '';
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : null;

        if (endDate && endDate > startDate) {
            if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
                return `${format(startDate, 'd')} - ${format(endDate, 'd MMMM yyyy', { locale: id })}`;
            }
            return `${format(startDate, 'd MMMM')} - ${format(endDate, 'd MMMM yyyy', { locale: id })}`;
        }
        return format(startDate, 'd MMMM yyyy', { locale: id });
    };

    const dateLabel = formatDateRange(activity.date, activity.end_date);

    const startTime = activity.start_time ? activity.start_time.substring(0, 5) : null;
    const endTime = activity.end_time ? activity.end_time.substring(0, 5) : null;
    const timeLabel = startTime && endTime ? `${startTime} - ${endTime}` : startTime;

    return (
        <WebLayout>
            <div className="pb-12">
                <Head title={`Detail - ${activity.name}`} />

                <style>{`
                    .hero-grow {
                        position: relative;
                        background-color: #1a1b3a; /* Deep Blue */
                        overflow: hidden;
                        font-family: 'Plus Jakarta Sans', sans-serif;
                    }

                    /* Top Right White Curve */
                    .curve-top-right {
                        position: absolute;
                        top: 0;
                        right: 0;
                        width: 45%;
                        height: 180px;
                        background-color: white;
                        border-bottom-left-radius: 100%;
                        z-index: 1;
                    }

                    /* Yellow Shape Wrapper (Desktop) */
                    .yellow-shape-wrapper {
                        position: absolute;
                        bottom: 0;
                        right: 0;
                        width: 50%; /* Increased from 45% */
                        height: 90%; /* Increased height */
                        max-width: 700px; /* Limit max width */
                        z-index: 10;
                    }

                    .yellow-shape {
                        width: 100%;
                        height: 100%;
                        background-color: #FFB800;
                        border-top-left-radius: 60px; /* Reduced radius for sharper look */
                        position: relative;
                        box-shadow: -10px -10px 30px rgba(0,0,0,0.1); /* Soft shadow */
                    }

                    .image-container {
                        position: absolute;
                        top: 15px;
                        left: 15px;
                        right: 0;
                        bottom: 0;
                        background-color: #e5e7eb;
                        border-top-left-radius: 50px;
                        overflow: hidden;
                    }
                    
                    /* Mobile Responsive */
                    @media (max-width: 1024px) {
                        .curve-top-right {
                            display: none;
                        }
                        .yellow-shape-wrapper {
                            position: relative;
                            width: 100%;
                            height: 300px; /* Fixed height for mobile */
                            margin-top: 2rem;
                            border-radius: 20px;
                            overflow: hidden;
                            max-width: 100%;
                        }
                        .yellow-shape {
                            border-radius: 20px;
                        }
                        .image-container {
                            top: 10px;
                            left: 10px;
                            right: 10px;
                            bottom: 10px;
                            width: auto;
                            height: auto;
                            border-radius: 15px;
                        }
                    }
                `}</style>

                <div className="bg-gray-50 min-h-screen pb-20">
                    {/* Hero Section */}
                    <section className="hero-grow min-h-[600px] flex items-center">
                        <div className="curve-top-right hidden lg:block"></div>

                        <div className="container mx-auto px-4 relative z-20 h-full py-12 lg:py-0">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center h-full">
                                {/* Left Content */}
                                <div className="text-white space-y-8 order-2 lg:order-1">
                                    <div className="space-y-2">
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-4">
                                            <span className="w-2 h-2 rounded-full bg-[#FFB800]"></span>
                                            <span className="text-xs font-bold tracking-widest uppercase text-gray-200">EVENT SPESIAL</span>
                                        </div>
                                        <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight tracking-tight">
                                            {activity.name}
                                        </h1>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        <div className="flex flex-wrap gap-3">
                                            <div className="flex items-center gap-3 bg-white/5 px-5 py-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                                                <div className="w-10 h-10 rounded-full bg-[#FFB800]/20 flex items-center justify-center">
                                                    <i className="fas fa-calendar-alt text-[#FFB800]"></i>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-gray-400">Tanggal</div>
                                                    <div className="font-semibold text-white">{dateLabel}</div>
                                                </div>
                                            </div>

                                            {timeLabel && (
                                                <div className="flex items-center gap-3 bg-white/5 px-5 py-3 rounded-2xl border border-white/10 backdrop-blur-sm">
                                                    <div className="w-10 h-10 rounded-full bg-[#FFB800]/20 flex items-center justify-center">
                                                        <i className="fas fa-clock text-[#FFB800]"></i>
                                                    </div>
                                                    <div>
                                                        <div className="text-xs text-gray-400">Waktu</div>
                                                        <div className="font-semibold text-white">{timeLabel}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {activity.location && (
                                            <div className="flex items-center gap-3 bg-white/5 px-5 py-3 rounded-2xl border border-white/10 backdrop-blur-sm max-w-xl">
                                                <div className="w-10 h-10 rounded-full bg-[#FFB800]/20 flex items-center justify-center shrink-0">
                                                    <i className="fas fa-map-marker-alt text-[#FFB800]"></i>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-xs text-gray-400">Lokasi</div>
                                                    <div className="font-semibold text-white truncate">{activity.location}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {showPrice && (
                                        <div className="text-4xl font-bold text-[#FFB800] tracking-tight">
                                            {(Number(activity.price) === 0) ? 'GRATIS' : `Rp ${Number(activity.price).toLocaleString('id-ID')}`}
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-4 pt-2">
                                        {pendingPayment ? (
                                            <button
                                                onClick={handlePaymentClick}
                                                disabled={loadingPaymentModal}
                                                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-full hover:shadow-lg hover:shadow-amber-500/30 transition-all transform hover:-translate-y-1"
                                            >
                                                {loadingPaymentModal ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-credit-card"></i>}
                                                Selesaikan Pembayaran
                                            </button>
                                        ) : isEnrolled ? (
                                            <button className="px-8 py-4 bg-emerald-500 text-white font-bold rounded-full cursor-default shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                                                <i className="fas fa-check-circle"></i>
                                                Terdaftar
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setRegistrationTypeModalOpen(true)}
                                                className="px-8 py-4 bg-[#FFB800] text-[#1a1b3a] font-bold rounded-full hover:bg-yellow-400 transition-all transform hover:-translate-y-1 shadow-xl shadow-yellow-500/20"
                                            >
                                                Daftar Sekarang
                                            </button>
                                        )}

                                        <button
                                            onClick={handleShare}
                                            className="px-8 py-4 bg-transparent border border-white/30 text-white font-bold rounded-full hover:bg-white/10 transition-all"
                                        >
                                            Bagikan
                                        </button>
                                    </div>
                                </div>

                                {/* Right Content - Yellow Shape & Image */}
                                <div className="block lg:hidden order-1">
                                    <div className="yellow-shape-wrapper">
                                        <div className="yellow-shape">
                                            <div className="image-container">
                                                <img
                                                    src={heroCoverPath}
                                                    alt={activity.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = '/assets/images/begron/defoult.png';
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Yellow Shape (Absolute) */}
                        <div className="yellow-shape-wrapper hidden lg:block">
                            <div className="yellow-shape">
                                <div className="image-container">
                                    <img
                                        src={heroCoverPath}
                                        alt={activity.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = '/assets/images/begron/defoult.png';
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Registration Type Modal */}
                    {registrationTypeModalOpen && (
                        <div className="fixed inset-0 z-[100100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setRegistrationTypeModalOpen(false)}></div>
                                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                        <div className="sm:flex sm:items-start">
                                            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 sm:mx-0 sm:h-10 sm:w-10">
                                                <i className="fas fa-users text-primary"></i>
                                            </div>
                                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                                    Pilih Metode Pendaftaran
                                                </h3>
                                                <div className="mt-2">
                                                    <p className="text-sm text-gray-500">
                                                        Silakan pilih jenis pendaftaran yang Anda inginkan.
                                                    </p>
                                                </div>

                                                <div className="mt-6 grid grid-cols-1 gap-4">
                                                    <Link
                                                        href={route('activity.enroll', activity.id)}
                                                        className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-gray-100 hover:border-primary hover:bg-primary/5 transition-all group w-full"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                            <i className="fas fa-user"></i>
                                                        </div>
                                                        <span className="font-bold text-gray-900">Daftar Mandiri</span>
                                                        <span className="text-xs text-gray-500">Daftar untuk diri sendiri</span>
                                                    </Link>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setRegistrationTypeModalOpen(false);
                                                            setIsBulkImportModalOpen(true);
                                                        }}
                                                        className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-emerald-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group w-full"
                                                    >
                                                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                            <i className="fas fa-users"></i>
                                                        </div>
                                                        <span className="font-bold text-gray-900">Daftar Kelompok</span>
                                                        <span className="text-xs text-gray-500">Import data peserta kolektif</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                        <button
                                            type="button"
                                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                            onClick={() => setRegistrationTypeModalOpen(false)}
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div id="content" className="container mx-auto px-4 pt-12 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Content (Left) */}
                            <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">

                                {/* Visibility Controls */}
                                {canAccessManagement && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                        <h3 className="text-sm font-bold text-gray-900 mb-3">Atur Tampilan Halaman (Admin/Creator)</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { id: 'description', label: 'Deskripsi', icon: 'fa-info-circle' },
                                                { id: 'materials', label: 'Materi', icon: 'fa-file-alt' },
                                                { id: 'rundown', label: 'Rundown', icon: 'fa-list-ol' },
                                                { id: 'speakers', label: 'Narasumber', icon: 'fa-user-tie' },
                                                { id: 'gallery', label: 'Galeri', icon: 'fa-images' },
                                                { id: 'participants', label: 'Peserta', icon: 'fa-users' },
                                            ].map(section => (
                                                <button
                                                    key={section.id}
                                                    onClick={() => toggleSection(section.id)}
                                                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                                        isVisible(section.id)
                                                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                                            : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    <i className={`fas ${section.icon} mr-2 ${isVisible(section.id) ? 'text-indigo-500' : 'text-gray-400'}`}></i>
                                                    {section.label}
                                                    <i className={`fas ${isVisible(section.id) ? 'fa-eye' : 'fa-eye-slash'} ml-2 text-xs opacity-70`}></i>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                {isVisible('description') && activity.description && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <i className="fas fa-info-circle text-primary"></i>
                                            Deskripsi
                                        </h3>
                                        <div
                                            className="prose max-w-none text-gray-600 text-sm md:text-base leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: activity.description }}
                                        />
                                    </div>
                                )}

                                {/* Materials Section */}
                                {isVisible('materials') && materials && materials.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <i className="fas fa-file-alt text-indigo-500"></i>
                                            Materi Kegiatan
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {materials.map((material) => (
                                                <div key={material.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition bg-gray-50 flex items-start gap-3">
                                                    <div className="bg-white p-2 rounded-lg border border-gray-200 shrink-0 text-primary">
                                                        <i className="fas fa-file-pdf text-xl"></i>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-gray-800 truncate mb-1">{material.title}</h4>
                                                        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{material.description || 'Tidak ada deskripsi'}</p>
                                                        {material.file_path && (
                                                            <a
                                                                href={`/storage/${material.file_path}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center text-xs font-medium text-primary hover:text-primary"
                                                            >
                                                                <i className="fas fa-download mr-1"></i> Unduh
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Rundown Section */}
                                {isVisible('rundown') && activity.rundowns && activity.rundowns.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <i className="fas fa-list-ol text-indigo-500"></i>
                                            Rangkaian Acara (Rundown)
                                        </h3>
                                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kegiatan</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {activity.rundowns.map((item) => (
                                                        <tr key={item.id}>
                                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                                {item.start_time ? item.start_time.substring(0, 5) : ''} - {item.end_time ? item.end_time.substring(0, 5) : ''}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                <div className="font-medium">{item.title || item.name}</div>
                                                                {item.description && <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>}
                                                                {item.speaker && <div className="text-xs text-primary mt-1"><i className="fas fa-user-tie mr-1"></i> {item.speaker}</div>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Speakers Section */}
                                {isVisible('speakers') && activity.speakers && activity.speakers.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <i className="fas fa-user-tie text-primary"></i>
                                            Narasumber
                                        </h3>
                                        <div className="space-y-4">
                                            {activity.speakers.map((speaker) => (
                                                <div key={speaker.id} className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={speaker.photo || '/assets/images/profilefoto/default-profile.png'}
                                                            alt={speaker.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => e.target.src = '/assets/images/profilefoto/default-profile.png'}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{speaker.name}</p>
                                                        {speaker.title && <p className="text-xs text-gray-500">{speaker.title}</p>}
                                                        {speaker.institution && <p className="text-xs text-gray-400">{speaker.institution}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Gallery Section */}
                                {isVisible('gallery') && activity.galleries && activity.galleries.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <i className="fas fa-images text-indigo-500"></i>
                                            Galeri
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {Array.isArray(activity.galleries) && activity.galleries.length > 0 ? (
                                                activity.galleries.map((gallery) => {
                                                    const gallerySrc = gallery.image
                                                        ? `/storage/activities/gallery/${gallery.image.replace('activities/gallery/', '').replace('storage/activities/gallery/', '')}`
                                                        : '/assets/images/begron/defoult.png';

                                                    return (
                                                        <div key={gallery.id} className="aspect-video relative group rounded-xl overflow-hidden cursor-pointer shadow-sm">
                                                            <img
                                                                src={gallerySrc}
                                                                alt="Galeri"
                                                                className="w-full h-full object-cover transition transform group-hover:scale-110"
                                                            />
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="col-span-full text-center py-8 text-gray-500">
                                                    <p>Belum ada dokumentasi</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Participants List */}
                                {isVisible('participants') && (
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                        <div className="flex items-center gap-2">
                                            <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary to-purple-600"></span>
                                            <h3 className="text-xl font-bold text-gray-900">Daftar Peserta</h3>
                                            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full border border-indigo-200">
                                                {participants.total || participantsList.length} terdaftar
                                            </span>
                                        </div>
                                    </div>

                                    {/* Controls */}
                                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                        <div className="relative flex-1">
                                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 text-sm"></i>
                                            <input
                                                type="text"
                                                placeholder="Cari peserta..."
                                                className="w-full border border-indigo-200 rounded-xl pl-10 pr-3 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-200">
                                            <label className="text-xs font-semibold text-indigo-700 whitespace-nowrap">Tampil:</label>
                                            <select
                                                className="border border-indigo-300 bg-white rounded-lg px-2 py-1 text-sm text-indigo-700 font-semibold focus:ring-2 focus:ring-indigo-500"
                                                value={perPage}
                                                onChange={handlePerPageChange}
                                            >
                                                <option value="10">10</option>
                                                <option value="20">20</option>
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                            </select>
                                        </div>
                                        {activity.activity_type !== 'non_batch' && batches && batches.length > 1 && (
                                            <select
                                                className="border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-indigo-700 font-medium"
                                                value={filterBatch}
                                                onChange={handleBatchChange}
                                            >
                                                <option value="">Semua Sesi</option>
                                                {batches.map(batch => (
                                                    <option key={batch.id} value={batch.id}>{batch.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    {/* List */}
                                    <div className="space-y-3">
                                        {participantsList.length > 0 ? (
                                            participantsList.map((participant) => {
                                                const fotoUrl = (participant.profile?.foto_url && participant.profile.foto_url !== 'undefined')
                                                    ? participant.profile.foto_url
                                                    : '/assets/images/profilefoto/default-profile.png';
                                                const status = parseInt(participant.pivot?.status || -1);
                                                let statusText = '-';
                                                let statusClass = 'bg-gray-100 text-gray-600';

                                                if (status === 1) { // ACTIVE
                                                    statusText = 'Aktif';
                                                    statusClass = 'bg-green-100 text-green-700 border-green-200';
                                                } else if (status === 0) { // PENDING
                                                    statusText = 'Menunggu Verifikasi';
                                                    statusClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
                                                } else if (status === 2) { // REJECTED
                                                    statusText = 'Ditolak';
                                                    statusClass = 'bg-red-100 text-red-700 border-red-200';
                                                }

                                                return (
                                                    <div key={participant.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 w-full gap-3 bg-white">
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                                            <img
                                                                src={fotoUrl}
                                                                className="flex-shrink-0 rounded-full w-9 h-9 object-cover border border-gray-200"
                                                                alt={participant.name}
                                                                onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="text-gray-900 font-semibold whitespace-normal break-words sm:truncate">{participant.name}</div>
                                                                <div className="text-xs text-gray-600 truncate flex flex-wrap gap-1">
                                                                    {participant.profile?.instansi && (
                                                                        <span>{participant.profile.instansi} â€¢</span>
                                                                    )}
                                                                    {participant.profile?.province?.name && (
                                                                        <span>{participant.profile.province.name}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center ml-3 shrink-0">
                                                            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${statusClass}`}>
                                                                {statusText}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                                Belum ada peserta terdaftar.
                                            </div>
                                        )}
                                    </div>

                                    {/* Pagination */}
                                    {participants.links && participants.last_page > 1 && (
                                        <div className="mt-6 flex flex-col items-center gap-3 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-lg shadow-sm border border-purple-100 p-4">
                                            <div className="flex flex-wrap justify-center gap-1">
                                                {participants.links.map((link, i) => (
                                                    link.url ? (
                                                        <Link
                                                            key={i}
                                                            href={link.url}
                                                            className={`px-3 py-1 rounded-md text-sm font-medium transition ${link.active
                                                                ? 'bg-primary text-white shadow-md'
                                                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                                                }`}
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    ) : (
                                                        <span
                                                            key={i}
                                                            className="px-3 py-1 rounded-md text-sm text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    )
                                                ))}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                Menampilkan <span className="font-semibold text-indigo-700">{participants.from || 0}</span> sampai <span className="font-semibold text-indigo-700">{participants.to || 0}</span> dari <span className="font-semibold text-indigo-700">{participants.total || 0}</span> hasil
                                            </div>
                                        </div>
                                    )}
                                </div>
                                )}
                            </div>

                            {/* Sidebar (Right) */}
                            <div className="space-y-6 order-1 lg:order-2">
                                {/* User Status Card */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Status Keikutsertaan</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <i className="fas fa-user-check"></i>
                                            </div>
                                            <div>
                                                <div className="text-sm text-gray-500">Status</div>
                                                <div className="font-semibold text-indigo-900">
                                                    {enrollmentStatus === 1 ? 'Aktif' : enrollmentStatus === 0 ? 'Menunggu Verifikasi' : enrollmentStatus === 2 ? 'Ditolak' : 'Menunggu Pembayaran'}
                                                </div>
                                            </div>
                                        </div>

                                        {userRoomNumber && (
                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-100">
                                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                                    <i className="fas fa-bed"></i>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500">Kamar</div>
                                                    <div className="font-semibold text-orange-900">
                                                        {userRoomNumber} {userRoomHotelName && `(${userRoomHotelName})`}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ID Card Display */}
                                        {isEnrolled && enrollmentStatus === 1 && (activity.id_card_visible !== 0 && activity.id_card_visible !== '0' && activity.id_card_visible !== false) && (
                                            <div className="pt-2">
                                                <div
                                                    ref={cardContainerRef}
                                                    className="mb-3 w-full flex justify-center bg-gray-100 p-2 rounded-xl border border-gray-200 overflow-hidden"
                                                >
                                                    <CardPreview
                                                        settings={cardSetting}
                                                        user={currentUser || auth.user}
                                                        activity={activity}
                                                        scale={cardScale}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => setShowCardModal(true)}
                                                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white border border-indigo-200 text-primary hover:bg-indigo-50 rounded-xl font-medium transition text-sm"
                                                >
                                                    <i className="fas fa-expand"></i>
                                                    Perbesar
                                                </button>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        {canAccessManagement && (
                                            <div className="pt-2 border-t border-gray-100 mt-2">
                                                <Link
                                                    href={route('activity.dashboard', activity.id)}
                                                    className="block w-full text-center bg-gray-900 text-white py-2.5 rounded-xl font-medium hover:bg-gray-800 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                                >
                                                    Dashboard Kegiatan
                                                </Link>
                                            </div>
                                        )}

                                        {/* Download Buttons for Active Participants */}
                                        {enrollmentStatus === 1 && (
                                            <div className="pt-2 border-t border-gray-100 mt-2 space-y-2">
                                                {(printSettings?.id_card_visible ?? true) && cardSetting?.download_card_visible && (
                                                    <a
                                                        href={route('activity.print-cards', activity.id)}
                                                        target="_blank"
                                                        className="block w-full text-center bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                                    >
                                                        <i className="fas fa-id-card mr-2"></i>
                                                        Unduh ID Card
                                                    </a>
                                                )}

                                                {certificatePrintSettings?.download_card_visible && (
                                                    <a
                                                        href={route('activity.download-certificate', activity.id)}
                                                        target="_blank"
                                                        className="block w-full text-center bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                                    >
                                                        <i className="fas fa-certificate mr-2"></i>
                                                        Unduh Sertifikat
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Attendance Section if any */}
                                {(mandiriAttendances?.length > 0 || manualAttendances?.length > 0) && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4">Absensi</h3>
                                        <div className="space-y-3">
                                            {mandiriAttendances.map(att => (
                                                <div key={att.id} className="p-3 border border-gray-200 rounded-xl flex items-center justify-between">
                                                    <span className="font-medium text-sm text-gray-700">{att.name}</span>
                                                    {att.has_attended ? (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Hadir</span>
                                                    ) : (
                                                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">Belum</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ID Card Modal */}
                {showCardModal && (
                    <div className="fixed inset-0 z-[100100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md transition-all duration-300 p-4" onClick={() => setShowCardModal(false)}>

                        {/* Close Button */}
                        <button
                            className="absolute top-4 right-4 z-[100102] text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-12 h-12 flex items-center justify-center transition-all backdrop-blur-sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowCardModal(false);
                            }}
                        >
                            <i className="fas fa-times text-xl"></i>
                        </button>

                        {/* Card Container */}
                        <div
                            className="relative z-[100101] flex items-center justify-center transition-all duration-300 ease-out"
                            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the card
                        >
                            <CardPreview
                                settings={cardSetting}
                                user={currentUser || auth.user}
                                activity={activity}
                                scale={modalScale}
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-8 flex flex-col sm:flex-row gap-4 z-[100102]" onClick={(e) => e.stopPropagation()}>
                            <a
                                href={route('activity.print-cards', activity.id)}
                                target="_blank"
                                className="inline-flex items-center justify-center px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white font-bold rounded-full shadow-lg transition-all transform hover:-translate-y-1"
                            >
                                <i className="fas fa-download mr-2"></i> Download PDF
                            </a>
                        </div>
                    </div>
                )}

                {/* Manual Payment Modal */}
                <ManualPaymentModal
                    show={showPaymentModal}
                    onClose={() => setShowPaymentModal(false)}
                    activity={paymentModalData?.activity || activity}
                    paymentMethods={paymentModalData?.paymentMethods || []}
                    bulk_import_payment={paymentModalData?.bulk_import_payment}
                    defaultSenderName={paymentModalData?.defaultSenderName}
                    defaultSenderBank={paymentModalData?.defaultSenderBank}
                />

                <BulkImportModal
                    isOpen={isBulkImportModalOpen}
                    onClose={() => setIsBulkImportModalOpen(false)}
                    activityId={activity.id}
                    onSuccess={() => {
                        setIsBulkImportModalOpen(false);
                        router.reload();
                    }}
                    onPaymentRequest={(result) => {
                        setBulkImportResult(result);
                        setIsBulkImportModalOpen(false);
                        setIsBulkPaymentModalOpen(true);
                    }}
                />

                <BulkPaymentModal
                    show={isBulkPaymentModalOpen}
                    onClose={() => setIsBulkPaymentModalOpen(false)}
                    activity={activity}
                    importResult={bulkImportResult}
                />
            </div>
        </WebLayout>
    );
}

