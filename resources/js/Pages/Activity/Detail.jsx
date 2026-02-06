import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, usePage, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import WebLayout from '@/Layouts/WebLayout';
import LoginModal from '@/Components/Auth/LoginModal';
import MissingDataModal from '@/Components/Activity/MissingDataModal';
import ProfileEditModal from '@/Components/Activity/ProfileEditModal';
import PaymentDetailModal from '@/Components/Activity/PaymentDetailModal';
import BulkImportModal from '@/Components/Activity/BulkImportModal';
import BulkPaymentModal from '@/Components/Activity/BulkPaymentModal';
import RegistrationTypeModal from '@/Components/Activity/RegistrationTypeModal';
import ManualForm from '@/Pages/Payments/ManualForm';
import PaymentModalWrapper from '@/Pages/Payments/PaymentModal';
import ChatWidget from '@/Components/Activity/ChatWidget';
import GalleryLightbox from '@/Components/Activity/GalleryLightbox';
import { format } from 'date-fns';
import { id, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';

export default function Detail({
    activity,
    activeBatch,
    batches,
    participants, // paginated
    userRating,
    isJoined,
    showCompletePaymentCTA,
    completePaymentUrl,
    completePaymentInfo,
    completePaymentLabel,
    missingProfileFields,
    missingProfileData,
    requiredProfileLabels,
    roomMap,
    provinces,
    registerTarget: registrationTarget, // We will calculate this in controller
    heroCoverPath, // We will calculate this in controller
    heroAnimationStyle,
    buttonText,
    flash,
    contactPersons = []
}) {
    const { t, i18n } = useTranslation();
    const { auth, appSettings } = usePage().props;
    const user = auth?.user;

    // Global Settings Logic
    const heroAnim = appSettings?.hero_animation_style || heroAnimationStyle || 'circles';
    const heroBg1 = appSettings?.hero_background_1 || null;

    const getStorageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        if (path.startsWith('/')) return path;
        return '/' + path;
    };

    const heroBgUrl = heroBg1 ? getStorageUrl(heroBg1) : null;
    const heroStyle = heroAnim; // Use the resolved animation style

    // Normalize participants data (handle both pagination and collection)
    const filteredParticipants = Array.isArray(participants)
        ? participants
        : (participants?.data || []);

    const [showPrice, setShowPrice] = useState(activity.show_price);
    const [visibleSections, setVisibleSections] = useState(activity.visible_sections || {});
    const isVisible = (section) => {
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
        });
    };

    // Fix: Use local state for missing data to allow updates without reload
    const [localMissingProfileData, setLocalMissingProfileData] = useState(missingProfileData || []);

    // Sync props to state if props change (e.g. after reload)
    useEffect(() => {
        if (missingProfileData) {
            setLocalMissingProfileData(missingProfileData);
        }
    }, [missingProfileData]);

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isProfileEditModalOpen, setIsProfileEditModalOpen] = useState(false);
    const [isRegistrationTypeModalOpen, setIsRegistrationTypeModalOpen] = useState(false);
    const [isMissingDataModalOpen, setIsMissingDataModalOpen] = useState(false);
    const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
    const [isPaymentDetailModalOpen, setIsPaymentDetailModalOpen] = useState(false);
    const [paymentDetailData, setPaymentDetailData] = useState(null);
    const [isPaymentDetailLoading, setIsPaymentDetailLoading] = useState(false);
    const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
    const [isBulkPaymentModalOpen, setIsBulkPaymentModalOpen] = useState(false);
    const [bulkImportResult, setBulkImportResult] = useState(null);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Manual Payment Modal State
    const [isManualPaymentModalOpen, setIsManualPaymentModalOpen] = useState(false);
    const [manualPaymentData, setManualPaymentData] = useState(null);
    const [isManualPaymentLoading, setIsManualPaymentLoading] = useState(false);

    // Comments & Rating State
    const [rating, setRating] = useState(userRating || 0);
    const [commentBody, setCommentBody] = useState('');
    const [perPage, setPerPage] = useState(participants?.per_page || 20);
    const [participantSearch, setParticipantSearch] = useState('');

    // Debounce search for participants
    useEffect(() => {
        const timer = setTimeout(() => {
            if (participantSearch.trim() !== '' || perPage !== (participants?.per_page || 20)) {
                router.reload({
                    data: { search: participantSearch, per_page: perPage },
                    only: ['participants'],
                    preserveState: true,
                    preserveScroll: true,
                });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [participantSearch, perPage]);

    const handlePerPageChange = (e) => {
        const value = e.target.value;
        setPerPage(value);
    };

    // Handle Auto Enroll after Profile Update
    useEffect(() => {
        const pendingEnroll = sessionStorage.getItem('pending_enrollment');

        if (pendingEnroll) {
            const { activityId, type } = JSON.parse(pendingEnroll);
            if (activityId === activity.id) {
                // Check if profile is now complete (assuming props are updated after reload)
                if (!missingProfileFields || missingProfileFields.length === 0) {
                    sessionStorage.removeItem('pending_enrollment');
                    handleEnroll(type || 'mandiri', true);
                }
            }
        }
    }, [activity.id, missingProfileFields]);

    // Handle Bulk Import Payment Redirect
    useEffect(() => {
        if (flash?.show_import_bulk_payment_once) {
            // Open modal for bulk payment
            openManualPaymentModal({ is_bulk: 1 });
        }
    }, [flash, activity.id, activeBatch]);

    // Handle Show Login Modal from Flash
    useEffect(() => {
        if (flash?.show_login_modal) {
            setIsLoginModalOpen(true);
        }
    }, [flash]);

    const descriptionRef = useRef(null);

    useEffect(() => {
        if (descriptionRef.current) {
            const images = descriptionRef.current.querySelectorAll('img');
            images.forEach(img => {
                img.onerror = () => {
                    img.style.display = 'none';
                };
            });
        }
    }, [activity.description]);

    const handleCommentSubmit = (e) => {
        e.preventDefault();
        router.post(route('activity.comments.store', activity.id), {
            body: commentBody,
            rating: rating
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setCommentBody('');
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Komentar berhasil dikirim',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    };

    const handleRating = (val) => {
        setRating(val);
        router.post(route('activity.rate', activity.id), { rating: val }, {
            preserveScroll: true,
        });
    };

    // Helper for date formatting
    const formatDateRange = (start, end) => {
        if (!start) return '';
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : null;
        const currentLocale = i18n.language === 'en' ? enUS : id;

        if (endDate && endDate > startDate) {
            // Same year check
            if (startDate.getFullYear() === endDate.getFullYear()) {
                // Same month check
                if (startDate.getMonth() === endDate.getMonth()) {
                    // Format: Senin, 26 - Rabu, 28 Januari 2026
                    return `${format(startDate, 'EEEE, d', { locale: currentLocale })} - ${format(endDate, 'EEEE, d MMMM yyyy', { locale: currentLocale })}`;
                }
                // Different month: Senin, 26 Januari - Rabu, 3 Februari 2026
                return `${format(startDate, 'EEEE, d MMMM', { locale: currentLocale })} - ${format(endDate, 'EEEE, d MMMM yyyy', { locale: currentLocale })}`;
            }
            // Different year: Senin, 26 Des 2025 - Rabu, 2 Jan 2026
            return `${format(startDate, 'EEEE, d MMMM yyyy', { locale: currentLocale })} - ${format(endDate, 'EEEE, d MMMM yyyy', { locale: currentLocale })}`;
        }
        // Single date: Senin, 26 Januari 2026
        return format(startDate, 'EEEE, d MMMM yyyy', { locale: currentLocale });
    };

    const formatTimeRange = (start, end) => {
        if (!start) return '';
        // If inputs are dates/datetimes (contain '-'), try to parse time or return empty if no time component
        if (start.includes('-') && !start.includes(':')) return ''; // Date only string

        // Helper to extract HH:mm from various formats
        const extractTime = (str) => {
            if (!str) return null;
            if (str.includes('T')) {
                // ISO format 2026-01-26T08:00:00
                const date = new Date(str);
                return format(date, 'HH:mm');
            }
            if (str.includes(' ')) {
                // DB format 2026-01-26 08:00:00
                const parts = str.split(' ');
                if (parts.length > 1) return parts[1].substring(0, 5);
            }
            // Plain time string 08:00:00
            return str.substring(0, 5);
        };

        const startTime = extractTime(start);
        const endTime = extractTime(end);

        if (!startTime) return ''; // Fallback or empty
        return endTime ? `${startTime} - ${endTime} WIB` : `${startTime} WIB`;
    };

    const openPaymentDetailLookup = (activityId, userId) => {
        setIsPaymentDetailLoading(true);
        setIsPaymentDetailModalOpen(true);
        setPaymentDetailData(null);

        // Use fetch or axios
        fetch(route('payments.lookup') + `?activity_id=${activityId}&user_id=${userId}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setPaymentDetailData(data.payment);
                } else {
                    // Handle error or empty
                }
                setIsPaymentDetailLoading(false);
            })
            .catch(err => {
                console.error(err);
                setIsPaymentDetailLoading(false);
            });
    };

    const openManualPaymentModal = async (extraParams = {}) => {
        setIsManualPaymentLoading(true);
        setIsManualPaymentModalOpen(true);

        try {
            const response = await axios.get(route('payments.create', {
                activity: activity.id,
                batch_id: activeBatch?.id,
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
                            setIsManualPaymentModalOpen(false); // Close the loading modal
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
                setManualPaymentData(response.data);
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
            setIsManualPaymentModalOpen(false);
        } finally {
            setIsManualPaymentLoading(false);
        }
    };

    const handleEnroll = async (type = 'mandiri', force = false, voucherCode = null) => {
        setIsRegistrationTypeModalOpen(false);

        setTimeout(async () => {
            if (type === 'mandiri') {
                const hasDefaultPhoto = auth?.user?.profile_photo_url?.includes('default-profile.png') ||
                    auth?.user?.profile_photo_url?.includes('ui-avatars.com');

                if (!force && ((missingProfileFields && missingProfileFields.length > 0) || hasDefaultPhoto)) {
                    // Save intent for auto-enroll after profile update
                    sessionStorage.setItem('pending_enrollment', JSON.stringify({
                        activityId: activity.id,
                        type: type,
                        voucherCode: voucherCode
                    }));
                    setLocalMissingProfileData(missingProfileData || []);
                    setIsMissingDataModalOpen(true);
                    return;
                }

                // Cek apakah kegiatan berbayar
                const currentPrice = activeBatch?.price !== undefined && activeBatch?.price !== null
                    ? Number(activeBatch.price)
                    : Number(activity.price);

                // Jika berbayar DAN tidak ada voucher code, arahkan langsung ke form pembayaran
                if (currentPrice > 0 && !voucherCode) {
                    openManualPaymentModal();
                    return;
                }

                if (registrationTarget.type === 'link' || registrationTarget.type === 'form') {
                    // Gunakan Axios untuk menangani respons JSON dan redirect ke pembayaran (modal/page)
                    try {
                        // Ensure we use axios directly
                        const response = await axios.post(registrationTarget.url, {
                            modal: true, // Meminta respons JSON
                            batch_id: activeBatch?.id,
                            committee_voucher_code: voucherCode
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
                                // Jika sukses tanpa redirect (misal kegiatan gratis atau voucher valid), reload untuk update status
                                window.location.reload();
                            }
                        } else {
                            // Handle if success is false but no error status code
                            Swal.fire({
                                icon: 'error',
                                title: t('activities.error'),
                                text: response.data.message || t('activities.registration_failed')
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

                                // Optional: Show toast instead of blocking alert
                                // Swal.fire({ ... });
                                return;
                            }

                            // Jika error validasi (misal data belum lengkap yang terlewat), refresh atau tampilkan pesan
                            if (error.response.data.missing_fields) {
                                // Harusnya sudah dicek di awal, tapi untuk jaga-jaga
                                await Swal.fire({
                                    icon: 'warning',
                                    title: t('activities.complete_profile_warning'),
                                    text: t('activities.complete_profile_warning')
                                });
                                window.location.reload();
                            } else {
                                Swal.fire({
                                    icon: 'error',
                                    title: t('activities.error'),
                                    text: error.response.data.message || t('activities.registration_failed')
                                });
                            }
                        } else {
                            console.error('Enroll error:', error);
                            Swal.fire({
                                icon: 'error',
                                title: t('activities.error'),
                                text: t('activities.system_error')
                            });
                        }
                    }
                } else if (registrationTarget.type === 'modal') {
                    window.location.href = registrationTarget.url;
                }
            } else if (type === 'kelompok') {
                setIsBulkImportModalOpen(true);
            }
        }, 100);
    };

    const handleMissingDataSuccess = () => {
        setIsMissingDataModalOpen(false);

        // Immediate check for pending enrollment to trigger payment modal without reload
        const pendingEnroll = sessionStorage.getItem('pending_enrollment');
        if (pendingEnroll) {
            try {
                const { activityId, type } = JSON.parse(pendingEnroll);
                if (activityId === activity.id && type === 'mandiri') {
                    const voucherCode = JSON.parse(pendingEnroll).voucherCode; // Retrieve voucher code
                    sessionStorage.removeItem('pending_enrollment');

                    // Re-trigger enroll flow which handles price check (paid vs free)
                    handleEnroll(type, true, voucherCode);
                    return;
                }
            } catch (e) {
                console.error('Error parsing pending enrollment', e);
            }
        }

        // Fallback for other cases (e.g. non-mandiri or just profile update)
        window.location.reload();
    };

    const togglePriceVisibility = async () => {
        const result = await Swal.fire({
            title: t('activities.change_visibility_title'),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: t('activities.confirm_change'),
            cancelButtonText: t('activities.cancel')
        });

        if (!result.isConfirmed) return;

        // Use Inertia to toggle price
        router.post(route('activity.toggle-price', activity.id), {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                setShowPrice(!showPrice);
                Swal.fire({
                    icon: 'success',
                    title: t('activities.success'),
                    text: page.props.flash?.message || t('activities.visibility_changed'),
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            onError: () => {
                Swal.fire({
                    icon: 'error',
                    title: t('activities.error'),
                    text: t('activities.visibility_change_failed')
                });
            }
        });
    };

    const copyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        Swal.fire({
            icon: 'success',
            title: t('activities.success'),
            text: t('activities.link_copied'),
            timer: 1500,
            showConfirmButton: false
        });
        setIsShareMenuOpen(false);
    };

    const shareNative = () => {
        if (navigator.share) {
            navigator.share({
                title: activity.title || activity.name,
                url: window.location.href
            }).catch(console.error);
        }
        setIsShareMenuOpen(false);
    };

    const canEdit = user && (user.is_super_admin || user.id === activity.user_id);
    // Modified: Admin should not see the big box if hidden, to keep layout clean.
    // We will show a small toggle button instead.
    const shouldShowPrice = showPrice;

    return (
        <WebLayout hasHeaderSpacer={false} transparentNavbar={true} fluid={true} noPadding={true}>
            <Head title={activity.title || activity.name} />

            {/* Hero Section */}
            <div className="relative bg-slate-900 overflow-hidden min-h-[80px] sm:min-h-[400px] lg:min-h-[500px] flex items-center">
                <style>{`
                    @keyframes fade-up {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-fade-up {
                        animation: fade-up 0.8s ease-out forwards;
                    }
                    .delay-100 { animation-delay: 0.1s; }
                    .delay-200 { animation-delay: 0.2s; }
                    .delay-300 { animation-delay: 0.3s; }
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
                    .gradient-text {
                        background: linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));
                    }
                    .text-glow {
                        text-shadow: 0 0 20px rgba(165, 180, 252, 0.5);
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
                    .animation-delay-4000 {
                        animation-delay: 4s;
                    }
                    @keyframes float {
                        0% { transform: translateY(0px); }
                        50% { transform: translateY(-10px); }
                        100% { transform: translateY(0px); }
                    }
                    .animate-float {
                        animation: float 6s ease-in-out infinite;
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
                    {/* Base Background */}
                    <div className="absolute inset-0 bg-slate-900 z-0"></div>

                    {/* Dynamic Background Image from Settings */}
                    {heroBgUrl && (
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-40 transition-opacity duration-500 z-0"
                            style={{ backgroundImage: `url('${heroBgUrl}')` }}
                        ></div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-indigo-900/40 to-slate-900/95 z-10"></div>

                    {/* Dynamic Animations based on Settings */}
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
                <div className="relative z-30 container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-2 sm:gap-5 pt-0 pb-2 sm:pt-8 sm:pb-10 lg:pb-16">

                    {/* Left Column: Text & Actions */}
                    <div className="w-full max-w-4xl mx-auto text-center space-y-3 sm:space-y-6 animate-fade-up">

                        {/* Badges Row */}
                        <div className="flex flex-wrap justify-center gap-3">
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
                            {(activity.date || activity.start_date || activity.time || activity.start_time) && (
                                <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl backdrop-blur-sm border border-white/10 flex-1 min-w-[200px] justify-start sm:justify-center">
                                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                                        <i className="fas fa-calendar-alt text-sm"></i>
                                    </div>
                                    <div className="text-left min-w-0">
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mb-1">{t('activities.implementation_time')}</p>
                                        <p className="text-xs sm:text-sm font-semibold text-white break-words">
                                            {formatDateRange(activity.date || activity.start_date, activity.end_date)}
                                        </p>
                                        {(activity.time || activity.start_time) && (
                                            <p className="text-xs text-amber-400/80 mt-0.5">
                                                {formatTimeRange(activity.time || activity.start_time, activity.end_time)}
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
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mb-1">{t('activities.location')}</p>
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
                                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mb-1">{t('activities.price')}</p>
                                        <div className="flex items-center gap-2">
                                            {Number(activity.price) > 0 ? (
                                                <>
                                                    <p className="text-xs sm:text-sm font-semibold text-white">
                                                        {(showPrice || canEdit) ? `Rp ${new Intl.NumberFormat('id-ID').format(activity.price)}` : t('activities.hidden')}
                                                    </p>
                                                    {canEdit && (
                                                        <button
                                                            onClick={(e) => { e.preventDefault(); togglePriceVisibility(); }}
                                                            className="w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                                                            title={showPrice ? t('activities.hide') : t('activities.show')}
                                                        >
                                                            <i className={`fas ${showPrice ? 'fa-eye' : 'fa-eye-slash'} text-[8px] text-gray-300`}></i>
                                                        </button>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-xs sm:text-sm font-semibold text-emerald-400">{t('activities.free')}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons Row */}
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                            {isJoined ? null : registrationTarget ? (
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
                                                    setIsRegistrationTypeModalOpen(true);
                                                }
                                            }}
                                            className="inline-flex items-center gap-3 h-14 px-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all transform hover:-translate-y-1"
                                        >
                                            <i className="fas fa-user-plus text-xl"></i>
                                            <span>{registrationTarget.label}</span>
                                        </button>
                                    )}
                                </>
                            ) : null}

                            {/* Share Button */}
                            <button
                                type="button"
                                onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                                className="h-14 px-6 rounded-full glass-button text-white font-medium hover:bg-white/20 inline-flex items-center gap-2 relative"
                            >
                                <i className="fas fa-share-alt"></i>
                                <span className="hidden sm:inline">{t('activities.share')}</span>
                                {isShareMenuOpen && (
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 text-left text-gray-800 animate-fade-up z-50 overflow-hidden">
                                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            {t('activities.share_to')}
                                        </div>
                                        <button type="button" onClick={copyShareLink} className="flex items-center w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors text-gray-700">
                                            <i className="fas fa-link text-gray-400 mr-3 w-4 text-center"></i> {t('activities.copy_link')}
                                        </button>
                                        <button type="button" onClick={shareNative} className="flex items-center w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors text-gray-700">
                                            <i className="fas fa-mobile-alt text-gray-400 mr-3 w-4 text-center"></i> {t('activities.other_app')}
                                        </button>
                                    </div>
                                )}
                            </button>

                            {user && (
                                <button
                                    onClick={() => setIsBulkImportModalOpen(true)}
                                    className={`h-14 px-6 rounded-full glass-button text-white font-medium hover:bg-white/20 inline-flex items-center gap-2 ${isJoined ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 border-none min-w-[200px] justify-center' : ''}`}
                                    title={isJoined ? t('activities.register_others') : 'Daftar Kolektif'}
                                >
                                    <i className="fas fa-users"></i>
                                    {isJoined && <span>{t('activities.register_others')}</span>}
                                </button>
                            )}
                        </div>

                    </div>



                </div>

                {/* Wave Separator */}
                <div className="absolute -bottom-1 left-0 right-0 z-20 pointer-events-none text-gray-50">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto fill-current">
                        <path fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,202.7C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    </svg>
                </div>
            </div>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1 sm:py-6">
                {/* Admin Controls */}
                {canEdit && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 mb-4 sm:mb-8">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">{t('activities.admin_controls')}</h3>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'detail_description', label: t('activities.description_label'), icon: 'fa-info-circle' },
                                { id: 'detail_contact_person', label: t('activities.narahubung_label'), icon: 'fa-address-book' },
                                { id: 'detail_gallery', label: t('activities.gallery_label'), icon: 'fa-images' },
                                { id: 'detail_participants', label: t('activities.participants_label'), icon: 'fa-users' },
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-4 sm:space-y-8">
                        {/* Activity Image - Moved from Hero */}
                        <div className="bg-white rounded-2xl shadow-sm p-2 overflow-hidden">
                            <div className="aspect-video w-full bg-slate-100 relative rounded-xl overflow-hidden group">
                                <div
                                    className="absolute inset-0 bg-cover bg-center blur-xl opacity-20 scale-110 transition-opacity duration-700"
                                    style={{ backgroundImage: `url(${heroCoverPath})` }}
                                ></div>
                                <img
                                    src={heroCoverPath}
                                    alt={activity.name}
                                    className="relative w-full h-full object-contain z-10 transition-transform duration-500 group-hover:scale-[1.02]"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/assets/images/hero/defoult.webp';
                                        e.target.className = "relative w-full h-full object-cover z-10";
                                    }}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        {isVisible('detail_description') && (
                            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('activities.about')}</h2>
                                <div
                                    ref={descriptionRef}
                                    className="prose max-w-none text-gray-600"
                                    dangerouslySetInnerHTML={{ __html: activity.description }}
                                />
                            </div>
                        )}

                        {/* Gallery */}
                        {isVisible('detail_gallery') && (
                            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 md:p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold text-gray-900">{t('activities.gallery')}</h2>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => document.getElementById('galleryInput').click()}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm"
                                        >
                                            <i className="fas fa-plus mr-2"></i> {t('activities.add_image')}
                                        </button>
                                    )}
                                </div>

                                {canEdit && (
                                    <input
                                        type="file"
                                        id="galleryInput"
                                        multiple
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files.length > 0) {
                                                const formData = new FormData();
                                                Array.from(e.target.files).forEach(file => {
                                                    formData.append('image[]', file);
                                                });
                                                router.post(route('gallery.store', activity.id), formData, {
                                                    forceFormData: true,
                                                    preserveScroll: true,
                                                    onSuccess: () => Swal.fire({
                                                        icon: 'success',
                                                        title: t('activities.success'),
                                                        text: t('activities.comment_sent'),
                                                        timer: 1500,
                                                        showConfirmButton: false
                                                    }),
                                                    onError: () => Swal.fire({
                                                        icon: 'error',
                                                        title: 'Gagal',
                                                        text: 'Gagal mengunggah foto'
                                                    }),
                                                });
                                                e.target.value = ''; // Reset input
                                            }
                                        }}
                                    />
                                )}

                                {activity.galleries && activity.galleries.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {activity.galleries.map((image, index) => (
                                            <div key={image.id} className="relative group aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                <img
                                                    src={`/storage/activities/gallery/${image.image.replace('activities/gallery/', '').replace('storage/activities/gallery/', '')}`}
                                                    alt="Gallery"
                                                    className="object-cover w-full h-full transform transition-transform duration-300 group-hover:scale-105 cursor-zoom-in"
                                                    onClick={() => {
                                                        setLightboxIndex(index);
                                                        setIsLightboxOpen(true);
                                                    }}
                                                    onError={(e) => e.target.src = '/assets/images/begron/defoult.png'}
                                                />
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            Swal.fire({
                                                                title: 'Hapus foto ini?',
                                                                text: "Foto tidak dapat dikembalikan",
                                                                icon: 'warning',
                                                                showCancelButton: true,
                                                                confirmButtonColor: '#d33',
                                                                cancelButtonColor: '#3085d6',
                                                                confirmButtonText: 'Ya, Hapus!'
                                                            }).then((result) => {
                                                                if (result.isConfirmed) {
                                                                    router.delete(route('gallery.destroy', { activity: activity.id, gallery: image.id }), {
                                                                        preserveScroll: true
                                                                    });
                                                                }
                                                            });
                                                        }}
                                                        className="absolute top-2 right-2 p-2 bg-danger/90 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger shadow-sm"
                                                        title="Hapus"
                                                    >
                                                        <i className="fas fa-trash-alt text-xs"></i>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                        <p className="text-gray-500">{t('activities.no_gallery')}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Rating & Comments */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6 md:p-8">
                            <div className="border-b border-gray-100 pb-4 mb-4 sm:mb-6">
                                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('activities.rating_comments')}</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 items-center mb-6 sm:mb-8">
                                <div className="col-span-1 flex items-center gap-4">
                                    <div>
                                        <div className="text-5xl font-bold text-gray-900">{Number(activity.rating_avg || 0).toFixed(1)}</div>
                                        <div className="text-gray-500 text-sm mt-1">{t('activities.based_on_rating', { count: activity.rating_count || 0 })}</div>
                                    </div>
                                    <div className="text-amber-400 text-2xl">
                                        {[1, 2, 3, 4, 5].map(i => (
                                            <i key={i} className={`fas fa-star ${i <= Math.round(activity.rating_avg || 0) ? '' : 'text-gray-200'}`}></i>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {auth.user ? (
                                <form onSubmit={handleCommentSubmit} className="mb-6 sm:mb-8 bg-gray-50 rounded-xl p-3 sm:p-6 border border-gray-100">
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('activities.give_rating')}</label>
                                        <div className="flex items-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    onClick={() => setRating(star)}
                                                    className={`text-2xl transition-colors ${rating >= star ? 'text-amber-400' : 'text-gray-300 hover:text-amber-200'}`}
                                                >
                                                    <i className="fas fa-star"></i>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('activities.your_comment')}</label>
                                        <textarea
                                            value={commentBody}
                                            onChange={(e) => setCommentBody(e.target.value)}
                                            className="w-full border-gray-300 rounded-lg shadow-sm focus:border-primary focus:ring-primary"
                                            rows="3"
                                            placeholder="Bagikan pengalaman Anda..."
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                        >
                                            {t('activities.send_comment')}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div className="bg-gray-50 rounded-xl p-4 sm:p-6 text-center mb-8 border border-gray-100">
                                    <p className="text-gray-600 mb-4">{t('activities.login_to_comment')}</p>
                                    <button
                                        onClick={() => router.visit(route('login'), { data: { return_url: window.location.href } })}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
                                    >
                                        {t('activities.login')}
                                    </button>
                                </div>
                            )}

                            <div className="space-y-4">
                                {activity.comments && activity.comments.length > 0 ? (
                                    activity.comments.map(comment => (
                                        <CommentItem key={comment.id} comment={comment} activity={activity} auth={auth} />
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-4">{t('activities.no_comment')}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Map / Location */}
                        {activity.location && (
                            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('activities.location')}</h3>
                                <p className="text-gray-600 mb-4">
                                    <i className="fas fa-map-marker-alt text-primary mr-2"></i>
                                    {activity.location}
                                </p>
                                {/* If lat/lng exists, show map */}
                                {(activity.latitude && activity.longitude) && (
                                    <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                                        <iframe
                                            width="100%"
                                            height="100%"
                                            frameBorder="0"
                                            style={{ border: 0 }}
                                            src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}&q=${activity.latitude},${activity.longitude}`}
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Contact Person */}
                        {isVisible('detail_contact_person') && (
                            <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">{t('activities.contact_person')}</h3>
                                <div className="space-y-4">
                                    {contactPersons && contactPersons.length > 0 ? (
                                        contactPersons.map((person, idx) => (
                                            <div key={person.id || idx} className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                                    <img
                                                        src={person.avatar || '/assets/images/profilefoto/default-profile.png'}
                                                        alt={person.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => e.target.src = '/assets/images/profilefoto/default-profile.png'}
                                                    />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{person.name}</p>
                                                    <p className="text-xs text-indigo-600 font-medium">{person.position}</p>
                                                    {person.email && <p className="text-sm text-gray-500">{person.email}</p>}
                                                    {person.phone && <p className="text-sm text-gray-500">{person.phone}</p>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                                <img
                                                    src={activity.user?.profile_photo_url || activity.creator?.avatar || '/assets/images/profilefoto/default-profile.png'}
                                                    alt={activity.user?.name || activity.creator?.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => e.target.src = '/assets/images/profilefoto/default-profile.png'}
                                                />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{activity.user?.name || activity.creator?.name}</p>
                                                <p className="text-sm text-gray-500">{activity.user?.email || activity.creator?.email}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ID Card Section - Removed */}

                        {/* Certificate Section - Removed */}

                        {/* Speakers */}
                        {isVisible('detail_speakers') && activity.speakers && activity.speakers.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm p-3 sm:p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-3 sm:mb-4">{t('activities.speakers')}</h3>
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
                        {isVisible('detail_participants') && (
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 flex flex-col h-[500px] overflow-hidden transition-all duration-300 hover:shadow-2xl">
                                <div className="px-3 py-3 sm:px-6 sm:py-4 border-b flex items-center justify-between bg-indigo-600 border-indigo-700">
                                    <h5 className="m-0 font-bold text-white">{t('activities.participants_list')}</h5>
                                </div>
                                <div className="px-3 py-3 sm:px-6 sm:py-5 flex-1 flex flex-col min-h-0">
                                    <div className="mb-4 flex flex-col sm:flex-row gap-3">
                                        <div className="relative flex-1 group">
                                            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors"></i>
                                            <input
                                                type="search"
                                                value={participantSearch}
                                                onChange={(e) => setParticipantSearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none text-sm"
                                                placeholder={t('activities.search_participants')}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-xl border border-gray-100">
                                            <label className="text-[10px] font-bold uppercase tracking-tight text-gray-400 whitespace-nowrap">{t('activities.show')}:</label>
                                            <select
                                                className="bg-transparent border-none focus:ring-0 text-sm font-semibold text-gray-700 cursor-pointer"
                                                value={perPage}
                                                onChange={handlePerPageChange}
                                            >
                                                <option value="10">10</option>
                                                <option value="20">20</option>
                                                <option value="25">25</option>
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                                <option value="250">250</option>
                                                <option value="500">500</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                                        {filteredParticipants && filteredParticipants.length > 0 ? (
                                            <ul className="space-y-3">
                                                {filteredParticipants.map((participant, index) => (
                                                    <li key={participant.id || index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                                        <div className="flex-shrink-0">
                                                            <img
                                                                src={participant.profile_photo_url || '/assets/images/profilefoto/default-profile.png'}
                                                                alt={participant.name}
                                                                className="w-10 h-10 rounded-full object-cover"
                                                                onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                                {participant.name || 'Peserta'}
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {participant.pivot?.created_at ? new Date(participant.pivot.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : (participant.created_at ? new Date(participant.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '')}
                                                            </p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                {participantSearch ? t('activities.no_activities_found') : t('activities.no_participants')}
                                            </div>
                                        )}
                                    </div>
                                    {participants.links && participants.last_page > 1 && (
                                        <div className="px-3 pb-3">
                                            <div className="flex flex-wrap justify-center gap-1">
                                                {participants.links.map((link, i) => (
                                                    link.url ? (
                                                        <Link
                                                            key={i}
                                                            href={link.url}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${link.active
                                                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                                                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                                                }`}
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                            preserveScroll={true}
                                                            preserveState={true}
                                                            only={['participants']}
                                                        />
                                                    ) : (
                                                        <span
                                                            key={i}
                                                            className="px-2 py-1 rounded text-xs text-gray-400 bg-gray-50 border border-gray-200 cursor-not-allowed"
                                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                                        />
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <LoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
            />

            {/* Manual Payment Modal */}
            <PaymentModalWrapper
                open={isManualPaymentModalOpen}
                onClose={() => setIsManualPaymentModalOpen(false)}
                title={t('activities.payment')}
            >
                {isManualPaymentLoading ? (
                    <div className="flex justify-center items-center p-8">
                        <i className="fas fa-circle-notch fa-spin text-3xl text-gray-400"></i>
                    </div>
                ) : manualPaymentData ? (
                    <ManualForm
                        activity={manualPaymentData.activity}
                        paymentMethods={manualPaymentData.paymentMethods}
                        bulk_import_payment={manualPaymentData.bulk_import_payment}
                        defaultSenderName={manualPaymentData.defaultSenderName}
                        is_modal={true}
                        onSuccess={() => {
                            setIsManualPaymentModalOpen(false);
                            window.location.reload();
                        }}
                    />
                ) : (
                    <div className="p-4 text-center text-gray-500">
                        {t('activities.failed_to_load_payment_form')}
                    </div>
                )}
            </PaymentModalWrapper>

            <RegistrationTypeModal
                isOpen={isRegistrationTypeModalOpen}
                onClose={() => setIsRegistrationTypeModalOpen(false)}
                onSelectType={handleEnroll}
                requiredFields={requiredProfileLabels}
            />

            <ProfileEditModal
                show={isProfileEditModalOpen}
                onClose={() => setIsProfileEditModalOpen(false)}
            />

            <MissingDataModal
                show={isMissingDataModalOpen}
                onClose={() => setIsMissingDataModalOpen(false)}
                missingFields={missingProfileFields}
                missingData={localMissingProfileData}
                userId={user?.id}
                onSuccess={handleMissingDataSuccess}
            />

            <PaymentDetailModal
                show={isPaymentDetailModalOpen}
                onClose={() => setIsPaymentDetailModalOpen(false)}
                payment={paymentDetailData}
                loading={isPaymentDetailLoading}
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
                return_to="detail"
            />

            <BulkPaymentModal
                show={isBulkPaymentModalOpen}
                onClose={() => setIsBulkPaymentModalOpen(false)}
                activity={activity}
                importResult={bulkImportResult}
                return_to="detail"
            />

            <ChatWidget
                activityId={activity.id}
                ownerId={activity.user_id}
                ownerName={activity.creator?.name || 'Penyelenggara'}
            />

            <GalleryLightbox
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                images={activity.galleries}
                initialIndex={lightboxIndex}
            />
        </WebLayout>
    );
}

const CommentItem = ({ comment, activity, auth }) => {
    const { t } = useTranslation();
    const [isReplying, setIsReplying] = useState(false);
    const [replyBody, setReplyBody] = useState('');

    const handleReplySubmit = (e) => {
        e.preventDefault();
        router.post(route('activity.comments.store', activity.id), {
            body: replyBody,
            parent_id: comment.id
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setReplyBody('');
                setIsReplying(false);
            }
        });
    };

    if (comment.rating && !comment.body) return null; // Skip rating-only comments

    return (
        <div className="comment-card rounded-md border border-gray-200 p-3 mb-3">
            <div className="flex justify-between items-center">
                <div>
                    <strong>{comment.user?.name || 'Pengguna'}</strong>
                    <small className="text-gray-500 ml-2 text-xs">
                        {comment.created_at ? new Date(comment.created_at).toLocaleDateString() : ''}
                    </small>
                </div>
                <div className="flex items-center">
                    <button
                        type="button"
                        onClick={() => setIsReplying(!isReplying)}
                        className="inline-flex items-center text-sm text-primary hover:text-primary/80 p-0"
                    >
                        <i className="fas fa-reply mr-1"></i>{t('activities.reply')}
                    </button>
                </div>
            </div>

            <div className="mt-2 text-gray-700" dangerouslySetInnerHTML={{ __html: comment.body }}></div>

            {isReplying && (
                <div className="mt-3">
                    {auth?.user ? (
                        <form onSubmit={handleReplySubmit} className="mb-3">
                            <div className="mb-2">
                                <textarea
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value)}
                                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    rows="2"
                                    placeholder={t('activities.write_reply')} // Add this key too
                                    required
                                ></textarea>
                            </div>
                            <button type="submit" className="inline-flex items-center h-9 px-3 rounded-md bg-gray-700 text-white hover:bg-gray-800">
                                {t('activities.send_reply')}
                            </button>
                        </form>
                    ) : (
                        <div className="text-sm text-gray-600 mb-2">{t('activities.login_to_reply')}</div>
                    )}
                </div>
            )}

            {comment.children && comment.children.length > 0 && (
                <div className="ml-4 mt-3 border-l-2 border-gray-100 pl-3">
                    {comment.children.map(reply => (
                        <CommentItem key={reply.id} comment={reply} activity={activity} auth={auth} />
                    ))}
                </div>
            )}
        </div>
    );
};

