import { Head, usePage, Link, router } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import CardPreview from '@/Pages/Activity/IdCards/CardPreview';
import BulkImportModal from '@/Components/Activity/BulkImportModal';
import BulkPaymentModal from '@/Components/Activity/BulkPaymentModal';
import ManualPaymentModal from '@/Components/Activity/ManualPaymentModal';
import RegistrationTypeModal from '@/Components/Activity/RegistrationTypeModal';
import MissingDataModal from '@/Components/Activity/MissingDataModal';
import LoginModal from '@/Components/Auth/LoginModal';
import CommentSection from './Components/CommentSection';
import axios from 'axios';
import Swal from 'sweetalert2';

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
    registrationTarget,
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
    const heroBg1 = appSettings?.hero_background_1 || null;

    const getStorageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        if (path.startsWith('storage/')) return '/' + path;
        return '/' + path;
    };

    const heroBgUrl = heroBg1 ? getStorageUrl(heroBg1) : null;
    const heroStyle = heroAnim;

    // Batch Logic
    const activeBatch = batches?.find(b => b.id == (filterBatch || selectedBatchId));

    const handlePaymentClick = (e) => {
        e.preventDefault();
        openManualPaymentModal({ batch_id: filterBatch || selectedBatchId });
    };

    // Access Control for View Configuration (Owner, Admin, Superadmin only)
    const isOwner = currentUser && activity && currentUser.id === activity.user_id;
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
    const canConfigureView = isOwner || isAdmin;

    const openManualPaymentModal = async (extraParams = {}) => {
        setLoadingPaymentModal(true);
        setShowPaymentModal(true);

        try {
            const response = await axios.get(route('payments.create', {
                activity: activity.id,
                batch_id: filterBatch || selectedBatchId,
                ...extraParams
            }), {
                params: { modal: 1 }
            });

            if (response.data.redirect_url) {
                // Handle Midtrans Snap Redirect
                const isMidtransUrl = response.data.redirect_url.includes('/midtrans/payment/');
                if (isMidtransUrl && window.snap) {
                    try {
                        const paymentResponse = await axios.get(response.data.redirect_url, {
                            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
                            params: { modal: 'true', is_ajax: 'true' }
                        });

                        if (paymentResponse.data.snapToken) {
                            setShowPaymentModal(false); // Close the loading modal
                            window.snap.pay(paymentResponse.data.snapToken, {
                                onSuccess: () => window.location.reload(),
                                onPending: () => window.location.reload(),
                                onError: () => window.location.reload(),
                                onClose: () => window.location.reload()
                            });
                            return;
                        }
                    } catch (err) {
                        console.error("Failed to fetch Snap Token, falling back to redirect", err);
                    }
                }

                // Default redirect
                window.location.href = response.data.redirect_url;
                return;
            }

            if (response.data) {
                setPaymentModalData(response.data);
            }
        } catch (error) {
            console.error('Error fetching payment data:', error);
            // Handle specific error messages if available
            const msg = error.response?.data?.message || 'Gagal memuat data pembayaran. Silakan coba lagi.';
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: msg
            });
            setShowPaymentModal(false);
        } finally {
            setLoadingPaymentModal(false);
        }
    };

    const handleEnroll = async (type = 'mandiri', force = false) => {
        setRegistrationTypeModalOpen(false);

        setTimeout(async () => {
            if (type === 'mandiri') {
                const hasDefaultPhoto = auth?.user?.profile_photo_url?.includes('default-profile.png') ||
                    auth?.user?.profile_photo_url?.includes('ui-avatars.com');

                if (!force && ((missingProfileFields && missingProfileFields.length > 0) || hasDefaultPhoto)) {
                    // Save intent for auto-enroll after profile update
                    sessionStorage.setItem('pending_enrollment', JSON.stringify({
                        activityId: activity.id,
                        type: type
                    }));
                    setLocalMissingProfileData(missingProfileData || []);
                    setIsMissingDataModalOpen(true);
                    return;
                }

                // Cek apakah kegiatan berbayar
                const currentPrice = activeBatch?.price !== undefined && activeBatch?.price !== null
                    ? Number(activeBatch.price)
                    : Number(activity.price);

                // Jika berbayar, arahkan langsung ke form pembayaran
                if (currentPrice > 0) {
                    openManualPaymentModal();
                    return;
                }

                if (registrationTarget.type === 'link' || registrationTarget.type === 'form') {
                    // Gunakan Axios untuk menangani respons JSON dan redirect ke pembayaran (modal/page)
                    try {
                        // Ensure we use axios directly
                        const response = await axios.post(registrationTarget.url, {
                            modal: true, // Meminta respons JSON
                            batch_id: activeBatch?.id
                        }, {
                            headers: {
                                'X-Requested-With': 'XMLHttpRequest',
                                'Accept': 'application/json',
                            }
                        });

                        if (response.data.success) {
                            if (response.data.redirect_url) {
                                // Check if it's a Midtrans payment URL to show modal instead of redirecting
                                const isMidtransUrl = response.data.redirect_url.includes('/midtrans/payment/');

                                if (isMidtransUrl && window.snap) {
                                    try {
                                        // Fetch the Snap Token from the payment page endpoint
                                        const paymentResponse = await axios.get(response.data.redirect_url, {
                                            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
                                            params: { modal: 'true', is_ajax: 'true' }
                                        });

                                        if (paymentResponse.data.snapToken) {
                                            window.snap.pay(paymentResponse.data.snapToken, {
                                                onSuccess: () => window.location.reload(),
                                                onPending: () => window.location.reload(),
                                                onError: () => window.location.reload(),
                                                onClose: () => window.location.reload()
                                            });
                                            return;
                                        }
                                    } catch (err) {
                                        console.error("Failed to fetch Snap Token, falling back to redirect", err);
                                    }
                                }

                                // Jika ada redirect URL (misal ke halaman pembayaran), arahkan user ke sana
                                window.location.href = response.data.redirect_url;
                                return;
                            } else if (response.data.snapToken && window.snap) {
                                // Jika backend mengembalikan token Snap langsung (opsional)
                                window.snap.pay(response.data.snapToken, {
                                    onSuccess: () => window.location.reload(),
                                    onPending: () => window.location.reload(),
                                    onError: () => window.location.reload(),
                                    onClose: () => window.location.reload()
                                });
                            } else {
                                // Jika sukses tanpa redirect (misal kegiatan gratis), reload untuk update status
                                window.location.reload();
                            }
                        } else {
                            // Handle if success is false but no error status code
                            Swal.fire({
                                icon: 'error',
                                title: 'Gagal',
                                text: response.data.message || 'Gagal memproses pendaftaran.'
                            });
                        }
                    } catch (error) {
                        if (error.response && error.response.status === 422) {
                            // Fix: Handle verification loop by updating modal state directly
                            if (error.response.data.missing_data) {
                                setLocalMissingProfileData(error.response.data.missing_data);
                                setIsMissingDataModalOpen(true);

                                // Save intent again
                                sessionStorage.setItem('pending_enrollment', JSON.stringify({
                                    activityId: activity.id,
                                    type: type
                                }));
                                return;
                            }

                            // Jika error validasi (misal data belum lengkap yang terlewat), refresh atau tampilkan pesan
                            if (error.response.data.missing_fields) {
                                // Harusnya sudah dicek di awal, tapi untuk jaga-jaga
                                await Swal.fire({
                                    icon: 'warning',
                                    title: 'Profil Belum Lengkap',
                                    text: 'Mohon lengkapi data profil Anda terlebih dahulu.'
                                });
                                window.location.reload();
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: 'Gagal',
                                    text: error.response.data.message || 'Gagal memproses pendaftaran.'
                                });
                            }
                        } else {
                            Swal.fire({
                                icon: 'error',
                                title: 'Gagal',
                                text: 'Terjadi kesalahan saat memproses pendaftaran.'
                            });
                        }
                    }
                }
            }
        }, 100);
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
        ? activity.image
        : '/assets/images/begron/defoult.png';

    const [showPrice, setShowPrice] = useState(activity.show_price);
    const [registrationTypeModalOpen, setRegistrationTypeModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [isBulkPaymentModalOpen, setIsBulkPaymentModalOpen] = useState(false);
    const [bulkImportResult, setBulkImportResult] = useState(null);
    const [shareMenuOpen, setShareMenuOpen] = useState(false);

    // Missing Data Modal Logic
    const [isMissingDataModalOpen, setIsMissingDataModalOpen] = useState(false);

    useEffect(() => {
        if (missingProfileData && missingProfileData.length > 0) {
            setIsMissingDataModalOpen(true);
        }
    }, [missingProfileData]);

    const togglePriceVisibility = async () => {
        const result = await Swal.fire({
            title: 'Ubah Visibilitas Harga?',
            text: "Anda akan mengubah visibilitas harga untuk publik.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Ubah',
            cancelButtonText: 'Batal'
        });

        if (!result.isConfirmed) return;

        router.post(route('activity.toggle-price', activity.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setShowPrice(!showPrice);
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: showPrice ? 'Harga disembunyikan' : 'Harga ditampilkan',
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            onError: () => Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Gagal mengubah visibilitas harga'
            })
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
        Swal.fire({
            icon: 'success',
            title: 'Berhasil',
            text: 'URL berhasil disalin!',
            timer: 1500,
            showConfirmButton: false
        });
        setShareMenuOpen(false);
    };

    // Date Logic
    const formatDateRange = (start, end) => {
        if (!start) return '';
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : null;

        if (endDate && endDate > startDate) {
            // Same year check
            if (startDate.getFullYear() === endDate.getFullYear()) {
                // Same month check
                if (startDate.getMonth() === endDate.getMonth()) {
                    // Format: Senin, 26 - Rabu, 28 Januari 2026
                    return `${format(startDate, 'EEEE, d', { locale: id })} - ${format(endDate, 'EEEE, d MMMM yyyy', { locale: id })}`;
                }
                // Different month: Senin, 26 Januari - Rabu, 3 Februari 2026
                return `${format(startDate, 'EEEE, d MMMM', { locale: id })} - ${format(endDate, 'EEEE, d MMMM yyyy', { locale: id })}`;
            }
            // Different year: Senin, 26 Des 2025 - Rabu, 2 Jan 2026
            return `${format(startDate, 'EEEE, d MMMM yyyy', { locale: id })} - ${format(endDate, 'EEEE, d MMMM yyyy', { locale: id })}`;
        }
        // Single date: Senin, 26 Januari 2026
        return format(startDate, 'EEEE, d MMMM yyyy', { locale: id });
    };

    const formatTimeRange = (start, end) => {
        if (!start) return '';
        if (start.includes('-') && !start.includes(':')) return '';

        const extractTime = (str) => {
            if (!str) return null;
            if (str.includes('T')) {
                const date = new Date(str);
                return format(date, 'HH:mm');
            }
            if (str.includes(' ')) {
                const parts = str.split(' ');
                if (parts.length > 1) return parts[1].substring(0, 5);
            }
            return str.substring(0, 5);
        };

        const startTime = extractTime(start);
        const endTime = extractTime(end);

        if (!startTime) return '';
        return endTime ? `${startTime} - ${endTime} WIB` : `${startTime} WIB`;
    };

    const dateLabel = formatDateRange(activity.date, activity.end_date);
    const timeLabel = formatTimeRange(activity.start_time, activity.end_time);

    return (
        <WebLayout hasHeaderSpacer={false} transparentNavbar={true}>
            <div className="pb-12">
                <Head title={`Detail - ${activity.name}`} />

                {/* Hero Section */}
                <div className="relative bg-slate-900 overflow-hidden min-h-[400px] lg:min-h-[500px] flex items-center">
                    <style>{`
                        @keyframes fade-up {
                            from { opacity: 0; transform: translateY(20px); }
                            to { opacity: 1; transform: translateY(0); }
                        }
                        .animate-fade-up {
                            animation: fade-up 0.8s ease-out forwards;
                        }
                        .glass-badge {
                            background: rgba(255, 255, 255, 0.1);
                            backdrop-filter: blur(12px);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
                        }
                        .glass-button {
                            background: rgba(255, 255, 255, 0.15);
                            backdrop-filter: blur(12px);
                            border: 1px solid rgba(255, 255, 255, 0.3);
                            transition: all 0.3s ease;
                        }
                        .glass-button:hover {
                            background: rgba(255, 255, 255, 0.25);
                            transform: translateY(-2px);
                            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
                        }
                        @keyframes blob {
                            0% { transform: translate(0px, 0px) scale(1); }
                            33% { transform: translate(30px, -50px) scale(1.1); }
                            66% { transform: translate(-20px, 20px) scale(0.9); }
                            100% { transform: translate(0px, 0px) scale(1); }
                        }
                        .animate-blob {
                            animation: blob 10s infinite;
                        }
                        .animation-delay-2000 {
                            animation-delay: 2s;
                        }
                        /* Rain Animation */
                        .rain-line {
                            position: absolute;
                            width: 1px;
                            height: 100px;
                            background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.3));
                            animation: rain 1s linear infinite;
                        }
                        @keyframes rain {
                            0% { transform: translateY(-100px); }
                            100% { transform: translateY(100vh); }
                        }
                        /* Particles Animation */
                        .particle-dot {
                            position: absolute;
                            background: white;
                            border-radius: 50%;
                            animation: particle 10s linear infinite;
                        }
                        @keyframes particle {
                            0% { transform: translateY(100vh) scale(0); opacity: 0; }
                            50% { opacity: 0.5; }
                            100% { transform: translateY(-10vh) scale(1); opacity: 0; }
                        }
                    `}</style>

                    {/* Background Elements */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900 z-0"></div>
                        {heroBgUrl && (
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-40 transition-opacity duration-500 z-0"
                                style={{ backgroundImage: `url('${heroBgUrl}')` }}
                            ></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-indigo-900/40 to-slate-900/95 z-10"></div>

                        {(heroStyle === 'circles' || heroStyle === 'blob' || !heroStyle) && (
                            <>
                                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-purple-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob z-10"></div>
                                <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-600/20 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000 z-10"></div>
                            </>
                        )}

                        {heroStyle === 'rain' && (
                            <div className="absolute inset-0 z-10 overflow-hidden opacity-40">
                                {[...Array(30)].map((_, i) => (
                                    <div key={i} className="rain-line" style={{
                                        left: `${Math.random() * 100}%`,
                                        animationDelay: `${Math.random()}s`,
                                        animationDuration: `${0.5 + Math.random()}s`,
                                        opacity: 0.3 + Math.random() * 0.5
                                    }}></div>
                                ))}
                            </div>
                        )}

                        {heroStyle === 'particles' && (
                            <div className="absolute inset-0 z-10 overflow-hidden opacity-40">
                                {[...Array(30)].map((_, i) => (
                                    <div key={i} className="particle-dot" style={{
                                        left: `${Math.random() * 100}%`,
                                        width: `${2 + Math.random() * 4}px`,
                                        height: `${2 + Math.random() * 4}px`,
                                        animationDelay: `${Math.random() * 5}s`,
                                        animationDuration: `${5 + Math.random() * 10}s`,
                                        opacity: 0.2 + Math.random() * 0.6
                                    }}></div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content Container */}
                    <div className="relative z-30 container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-5 pt-16 pb-20 lg:pb-32">

                        {/* Left Column: Text & Actions */}
                        <div className="w-full max-w-4xl mx-auto text-center space-y-6 animate-fade-up">

                            {/* Badges Row */}
                            <div className="flex flex-wrap justify-center gap-3 min-h-[38px]">
                                {activity.activity_type !== 'non_batch' && activeBatch && activeBatch.name && (
                                    <span className="glass-badge inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium hover:bg-white/20 transition-colors cursor-default">
                                        <i className="fas fa-layer-group text-cyan-300"></i>
                                        <span>{activeBatch.name}</span>
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                                {activity.title || activity.name}
                            </h1>

                            {/* Additional Info (Location & Time) */}
                            <div className="flex flex-row flex-wrap items-stretch justify-center gap-3 text-gray-300 w-full">
                                {(dateLabel || timeLabel) && (
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10 flex-1 min-w-[200px] justify-start sm:justify-center">
                                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                            <i className="fas fa-calendar-alt text-sm"></i>
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mb-1">Waktu Pelaksanaan</p>
                                            <p className="text-xs sm:text-sm font-semibold text-white break-words">
                                                {dateLabel}
                                            </p>
                                            {timeLabel && (
                                                <p className="text-xs text-amber-400/80 mt-0.5">
                                                    {timeLabel}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activity.location && (
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10 flex-1 min-w-[140px] justify-start sm:justify-center">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                                            <i className="fas fa-map-marker-alt text-sm"></i>
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mb-1">Lokasi</p>
                                            <p className="text-xs sm:text-sm font-semibold text-white truncate max-w-[150px]" title={activity.location}>{activity.location}</p>
                                        </div>
                                    </div>
                                )}

                                {activity.price !== null && (
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10 flex-1 min-w-[140px] justify-start sm:justify-center">
                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                            <i className="fas fa-tag text-sm"></i>
                                        </div>
                                        <div className="text-left min-w-0">
                                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mb-1">Harga</p>
                                            <div className="flex items-center gap-2">
                                                {Number(activity.price) > 0 ? (
                                                    <p className="text-xs sm:text-sm font-semibold text-white">
                                                        {showPrice ? `Rp ${new Intl.NumberFormat('id-ID').format(activity.price)}` : 'Sembunyi'}
                                                    </p>
                                                ) : (
                                                    <p className="text-xs sm:text-sm font-semibold text-emerald-400">GRATIS</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons Row */}
                            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                                {pendingPayment ? (
                                    <button
                                        onClick={handlePaymentClick}
                                        disabled={loadingPaymentModal}
                                        className="inline-flex items-center gap-3 h-14 px-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all transform hover:-translate-y-1"
                                    >
                                        {loadingPaymentModal ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-credit-card"></i>}
                                        <span>Selesaikan Pembayaran</span>
                                    </button>
                                ) : isEnrolled ? (
                                    <button
                                        onClick={() => setIsBulkImportModalOpen(true)}
                                        className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white font-bold cursor-pointer border border-white/10 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                                    >
                                        <i className="fas fa-user-plus"></i>
                                        <span>Daftarkan Peserta Lain</span>
                                    </button>
                                ) : registrationTarget ? (
                                    <>
                                        {registrationTarget.type === 'disabled' ? (
                                            <span className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-gray-500/50 backdrop-blur-sm text-white font-bold cursor-not-allowed border border-white/10">
                                                <i className="fas fa-ban"></i>
                                                {registrationTarget.label}
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (registrationTarget.type === 'login_modal') {
                                                        setIsLoginModalOpen(true);
                                                    } else {
                                                        setRegistrationTypeModalOpen(true);
                                                    }
                                                }}
                                                className="inline-flex items-center gap-3 h-14 px-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all transform hover:-translate-y-1"
                                            >
                                                <i className="fas fa-user-plus text-xl"></i>
                                                <span>{registrationTarget.label}</span>
                                            </button>
                                        )}
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setRegistrationTypeModalOpen(true)}
                                        className="inline-flex items-center gap-3 h-14 px-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all transform hover:-translate-y-1"
                                    >
                                        <i className="fas fa-user-plus text-xl"></i>
                                        <span>Daftar Sekarang</span>
                                    </button>
                                )}

                                {/* Share Button */}
                                <button
                                    type="button"
                                    onClick={handleShare}
                                    className="h-14 px-6 rounded-full glass-button text-white font-medium hover:bg-white/20 inline-flex items-center gap-2 relative"
                                >
                                    <i className="fas fa-share-alt"></i>
                                    <span className="hidden sm:inline">Bagikan</span>
                                </button>
                            </div>
                        </div>

                    </div>

                    {/* Wave Separator */}
                    <div className="absolute -bottom-1 left-0 right-0 z-20 pointer-events-none text-gray-50">
                        <svg className="fill-current w-full h-8 lg:h-12" viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0 48H1440V0C1440 0 1140 48 720 48C300 48 0 0 0 0V48Z" fill="currentColor"></path>
                        </svg>
                    </div>
                </div>

                <div className="bg-gray-50 min-h-screen pb-20">

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
                                                        href={route('activity.enroll', {
                                                            activity: activity.id,
                                                            batch_id: filterBatch || selectedBatchId
                                                        })}
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
                                {canConfigureView && (
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
                                                { id: 'id_card', label: 'Kartu', icon: 'fa-id-card' },
                                                { id: 'certificate', label: 'Sertifikat', icon: 'fa-certificate' },
                                            ].map(section => (
                                                <button
                                                    key={section.id}
                                                    onClick={() => toggleSection(section.id)}
                                                    className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isVisible(section.id)
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



                                {/* Participants List */}
                                {isVisible('participants') && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
                                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <i className="fas fa-user-check text-sm"></i>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm text-gray-500">Status:</div>
                                                <div className="text-sm font-semibold text-indigo-900">
                                                    {enrollmentStatus === 1 ? 'Aktif' : enrollmentStatus === 0 ? 'Menunggu Verifikasi' : enrollmentStatus === 2 ? 'Ditolak' : 'Menunggu Pembayaran'}
                                                </div>
                                            </div>
                                        </div>

                                        {userRoomNumber && (
                                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-orange-50 border border-orange-100">
                                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                                    <i className="fas fa-bed text-sm"></i>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm text-gray-500">Kamar:</div>
                                                    <div className="text-sm font-semibold text-orange-900">
                                                        {userRoomNumber} {userRoomHotelName && `(${userRoomHotelName})`}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* ID Card Display */}
                                        {isEnrolled && enrollmentStatus === 1 && isVisible('id_card') && (
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
                                        {canConfigureView && (
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
                                                {isVisible('id_card') && (printSettings?.id_card_visible ?? true) && cardSetting?.download_card_visible && (
                                                    <a
                                                        href={route('activity.print-cards', activity.id)}
                                                        target="_blank"
                                                        className="block w-full text-center bg-primary text-white py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                                    >
                                                        <i className="fas fa-id-card mr-2"></i>
                                                        Unduh ID Card
                                                    </a>
                                                )}

                                                {isVisible('certificate') && certificatePrintSettings?.download_card_visible && (
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

                        {/* Gallery Section */}
                        {isVisible('gallery') && activity.galleries && activity.galleries.length > 0 && (
                            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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

                        {/* Comment Section */}
                        {isVisible('comments') && (activity.enable_comments ?? true) && (
                            <CommentSection activity={activity} comments={activity.comments} />
                        )}
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

                <LoginModal
                    isOpen={isLoginModalOpen}
                    onClose={() => setIsLoginModalOpen(false)}
                />

                <RegistrationTypeModal
                    isOpen={registrationTypeModalOpen}
                    onClose={() => setRegistrationTypeModalOpen(false)}
                    onSelect={handleEnroll}
                    activity={activity}
                />

                <MissingDataModal
                    show={isMissingDataModalOpen}
                    onClose={() => setIsMissingDataModalOpen(false)}
                    missingData={missingProfileData}
                    onSuccess={() => {
                         setIsMissingDataModalOpen(false);
                         window.location.reload();
                    }}
                />

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
                    return_to="show"
                />

                <BulkPaymentModal
                    show={isBulkPaymentModalOpen}
                    onClose={() => setIsBulkPaymentModalOpen(false)}
                    activity={activity}
                    importResult={bulkImportResult}
                    return_to="show"
                />
            </div>
        </WebLayout>
    );
}

