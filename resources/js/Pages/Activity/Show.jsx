import { Head, usePage, Link, router } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import { useState, useEffect, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { id, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
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
import CustomFieldsFormModal from '@/Components/Activity/CustomFieldsFormModal';

export default function Show({
    activity,
    currentUser,
    isEnrolled,
    isRegistered,
    enrollmentStatus,
    currentStatus,
    canAccessManagement,
    materials,
    participants = {},
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
    certificatePrintSettings,
    requiredProfileLabels, // Added this prop
    enrollmentData,
    contactPersons = []
}) {
    const { t, i18n } = useTranslation();

    const colors = [
        { bg: 'from-blue-500 to-cyan-500', border: 'border-blue-300', text: 'text-secondary' },
        { bg: 'from-purple-500 to-pink-500', border: 'border-purple-300', text: 'text-primary' },
        { bg: 'from-green-500 to-emerald-500', border: 'border-green-300', text: 'text-green-600' },
        { bg: 'from-orange-500 to-red-500', border: 'border-orange-300', text: 'text-orange-600' },
        { bg: 'from-indigo-500 to-purple-500', border: 'border-indigo-300', text: 'text-primary' },
        { bg: 'from-pink-500 to-rose-500', border: 'border-pink-300', text: 'text-pink-600' },
    ];
    const { auth, appSettings } = usePage().props;
    const [search, setSearch] = useState('');
    const [perPage, setPerPage] = useState(participants?.per_page || 20);
    const [filterBatch, setFilterBatch] = useState(selectedBatchId || '');
    const [showCardModal, setShowCardModal] = useState(false);
    const cardContainerRef = useRef(null);
    const [cardScale, setCardScale] = useState(0.8);
    const [modalScale, setModalScale] = useState(1);

    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentModalData, setPaymentModalData] = useState(null);
    const [loadingPaymentModal, setLoadingPaymentModal] = useState(false);

    // Custom Fields Logic
    const [isCustomFieldsModalOpen, setIsCustomFieldsModalOpen] = useState(false);
    const [pendingEnrollmentData, setPendingEnrollmentData] = useState(null);

    // Visibility & Edit Mode Logic
    const [visibleSections, setVisibleSections] = useState(activity.visible_sections || {});
    const [editMode, setEditMode] = useState(false);
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

    useEffect(() => {
        const stored = localStorage.getItem('editMode');
        if (stored != null) setEditMode(stored === 'true');
        const handler = () => {
            const s = localStorage.getItem('editMode');
            setEditMode(s === 'true');
        };
        window.addEventListener('editModeChanged', handler);
        return () => window.removeEventListener('editModeChanged', handler);
    }, []);

    const handleMandiriAttendance = (attendanceId) => {
        if (!auth.user) {
            setIsLoginModalOpen(true);
            return;
        }

        Swal.fire({
            title: t('activities.attendance_confirmation_title', 'Konfirmasi Absensi'),
            text: t('activities.attendance_confirmation_text', 'Apakah Anda yakin ingin melakukan absensi sekarang?'),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: t('activities.attendance_confirm_yes', 'Ya, Absen'),
            cancelButtonText: t('common.cancel', 'Batal')
        }).then((result) => {
            if (result.isConfirmed) {
                // Gunakan axios manual agar bisa handle response JSON (403/500) dengan baik tanpa error Inertia modal
                axios.post(route('attendance.mandiri'), {
                    activity_id: activity.id,
                    attendance_id: attendanceId
                })
                    .then((response) => {
                        Swal.fire(
                            t('common.success', 'Berhasil'),
                            t('activities.attendance_success', 'Absensi berhasil dicatat!'),
                            'success'
                        ).then(() => {
                            // Reload page data to update UI
                            router.reload({ only: ['mandiriAttendances', 'manualAttendances', 'userHasAnyAttendance'] });
                        });
                    })
                    .catch((error) => {
                        const message = error.response?.data?.message || t('activities.attendance_failed', 'Terjadi kesalahan saat absensi');
                        Swal.fire(
                            t('common.error', 'Gagal'),
                            message,
                            'error'
                        );
                    });
            }
        });
    };

    // Hero Animation Logic
    const heroAnim = appSettings?.hero_animation_style || 'circles';
    const heroBg1 = appSettings?.hero_background_1 || null;

    const getStorageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        // Fix: Ensure proper flash prefix and avoid treating 'storage' as a domain
        if (path.startsWith('storage')) return '/' + path;
        if (path.startsWith('/storage')) return path;
        return '/storage/' + path.replace(/^\/+/, '');
    };

    const heroBgUrl = heroBg1 ? getStorageUrl(heroBg1) : null;
    const heroStyle = heroAnim;

    const rainLines = useMemo(() => {
        return Array.from({ length: 30 }, () => ({
            left: Math.random() * 100,
            delay: Math.random(),
            duration: 0.5 + Math.random(),
            opacity: 0.3 + Math.random() * 0.5
        }));
    }, [heroStyle]);

    const particleDots = useMemo(() => {
        return Array.from({ length: 30 }, () => ({
            left: Math.random() * 100,
            size: 2 + Math.random() * 4,
            delay: Math.random() * 5,
            duration: 5 + Math.random() * 10,
            opacity: 0.2 + Math.random() * 0.6
        }));
    }, [heroStyle]);

    // Batch Logic
    const activeBatch = batches?.find(b => b.id == (filterBatch || selectedBatchId));

    const handlePaymentClick = (e) => {
        e.preventDefault();
        openManualPaymentModal({ batch_id: filterBatch || selectedBatchId });
    };

    // Access Control for View Configuration (Owner, Admin, Superadmin, and Management Access)
    const isOwner = currentUser && activity && currentUser.id === activity.user_id;
    const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'superadmin');
    const canConfigureView = isOwner || isAdmin || canAccessManagement;

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
                            params: { modal: '1', ajax: '1' }
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

    const processEnrollment = async (type, force = false, customData = {}) => {
        if (registrationTarget.type === 'link' || registrationTarget.type === 'form') {
            try {
                const hasFile =
                    customData &&
                    Object.values(customData).some(value => value instanceof File);

                let payload;
                const config = {
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest',
                        'Accept': 'application/json',
                    }
                };

                if (hasFile) {
                    const formData = new FormData();
                    formData.append('modal', 'true');
                    if (activeBatch?.id) {
                        formData.append('batch_id', activeBatch.id);
                    }

                    Object.entries(customData).forEach(([key, value]) => {
                        if (value instanceof File) {
                            formData.append(`custom_files[${key}]`, value);
                        } else if (value !== undefined && value !== null) {
                            formData.append(`custom_data[${key}]`, value);
                        }
                    });

                    payload = formData;
                } else {
                    payload = {
                        modal: true,
                        batch_id: activeBatch?.id,
                        custom_data: customData
                    };
                    if (customData?.committee_voucher_code) {
                        payload.committee_voucher_code = customData.committee_voucher_code;
                    }
                }

                const response = await axios.post(registrationTarget.url, payload, config);

                if (response.data.success) {
                    if (response.data.redirect_url) {
                        const isMidtransUrl = response.data.redirect_url.includes('/midtrans/payment/');

                        if (isMidtransUrl && window.snap) {
                            try {
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

                        window.location.href = response.data.redirect_url;
                        return;
                    } else if (response.data.snapToken && window.snap) {
                        window.snap.pay(response.data.snapToken, {
                            onSuccess: () => window.location.reload(),
                            onPending: () => window.location.reload(),
                            onError: () => window.location.reload(),
                            onClose: () => window.location.reload()
                        });
                    } else {
                        window.location.reload();
                    }
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: response.data.message || 'Gagal memproses pendaftaran.'
                    });
                }
            } catch (error) {
                if (error.response && error.response.status === 422) {
                    if (error.response.data.missing_data) {
                        setLocalMissingProfileData(error.response.data.missing_data);
                        setIsMissingDataModalOpen(true);
                        sessionStorage.setItem('pending_enrollment', JSON.stringify({
                            activityId: activity.id,
                            type: type
                        }));
                        return;
                    }

                    if (error.response.data.missing_fields) {
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
                } else if (error.response && error.response.status === 401) {
                    sessionStorage.setItem('pending_enrollment', JSON.stringify({
                        activityId: activity.id,
                        type: type,
                        voucherCode: customData?.committee_voucher_code || null
                    }));
                    window.location.href = route('login') + '?return_url=' + encodeURIComponent(window.location.href);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: error.response?.data?.message || 'Terjadi kesalahan saat memproses pendaftaran.'
                    });
                }
            }
        }
    };

    const handleEnroll = async (type = 'mandiri', force = false, voucherCode = null) => {
        setRegistrationTypeModalOpen(false);

        setTimeout(async () => {
            if (type === 'mandiri') {
                const photoUrl = (auth?.user?.profile_photo_url || '').toLowerCase();
                const hasDefaultPhoto = !photoUrl || photoUrl.includes('default-profile.png') || photoUrl.includes('ui-avatars.com');
                // Jika pakai voucher panitia, tidak perlu isi profil/custom field — langsung daftar jadi panitia
                const skipProfileAndCustomCheck = Boolean(voucherCode);

                if (!skipProfileAndCustomCheck && !force && ((missingProfileFields && missingProfileFields.length > 0) || hasDefaultPhoto)) {
                    sessionStorage.setItem('pending_enrollment', JSON.stringify({
                        activityId: activity.id,
                        type: type,
                        voucherCode: voucherCode // Save voucher code
                    }));
                    setLocalMissingProfileData(missingProfileData || []);
                    setIsMissingDataModalOpen(true);
                    return;
                }

                // Check for Custom Fields (skip jika pakai voucher panitia)
                if (!skipProfileAndCustomCheck && activity.custom_fields && Array.isArray(activity.custom_fields) && activity.custom_fields.length > 0) {
                    setPendingEnrollmentData({ type, force, voucherCode });
                    setIsCustomFieldsModalOpen(true);
                    return;
                }

                // Proceed directly (atau dengan voucher)
                processEnrollment(type, force, { committee_voucher_code: voucherCode });
            }
        }, 100);
    };

    const handleCustomFieldsSubmit = (formData) => {
        setIsCustomFieldsModalOpen(false);
        if (pendingEnrollmentData) {
            // Merge voucher code into form data if it exists
            const finalData = { ...formData };
            if (pendingEnrollmentData.voucherCode) {
                finalData.committee_voucher_code = pendingEnrollmentData.voucherCode;
            }

            processEnrollment(pendingEnrollmentData.type, pendingEnrollmentData.force, finalData);
            setPendingEnrollmentData(null);
        }
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

    // Helper for pagination (participants may be {} if not passed)
    const paginationLinks = participants?.links || [];
    const participantsList = Array.isArray(participants?.data) ? participants.data : (Array.isArray(participants) ? participants : []);

    const DEFAULT_ACTIVITY_IMAGE = '/assets/images/hero/defoult.webp';
    const getActivityImageUrl = (img) => {
        if (!img) return DEFAULT_ACTIVITY_IMAGE;
        if (img.startsWith('http') || img.startsWith('/')) return img;
        return `/storage/${img.replace(/^storage\//, '')}`;
    };
    const heroCoverPath = getActivityImageUrl(activity.image);

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

    // Handle Auto Enroll after Profile Update (Resume from MissingDataModal)
    useEffect(() => {
        const pendingEnroll = sessionStorage.getItem('pending_enrollment');

        if (pendingEnroll) {
            try {
                const { activityId, type } = JSON.parse(pendingEnroll);
                if (activityId === activity.id) {
                    // Check if profile is now complete
                    if (!missingProfileData || missingProfileData.length === 0) {
                        sessionStorage.removeItem('pending_enrollment');
                        handleEnroll(type || 'mandiri', true);
                    }
                }
            } catch (e) {
                console.error('Failed to parse pending enrollment', e);
                sessionStorage.removeItem('pending_enrollment');
            }
        }
    }, [activity.id, missingProfileData]);

    const togglePriceVisibility = async () => {
        const result = await Swal.fire({
            title: t('activities.change_visibility_title'),
            text: t('activities.change_visibility_desc'),
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: t('activities.confirm_change'),
            cancelButtonText: t('activities.cancel')
        });

        if (!result.isConfirmed) return;

        router.post(route('activity.toggle-price', activity.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setShowPrice(!showPrice);
                Swal.fire({
                    icon: 'success',
                    title: t('activities.success'),
                    text: showPrice ? t('activities.price_hidden') : t('activities.price_shown'),
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            onError: () => Swal.fire({
                icon: 'error',
                title: t('activities.error'),
                text: t('activities.visibility_change_failed')
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
            title: t('activities.success'),
            text: t('activities.link_copied'),
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
        <WebLayout hasHeaderSpacer={false} transparentNavbar={true} fluid={true} noPadding={true}>
            <div className="pb-4 sm:pb-6">
                <Head title={`Detail - ${activity.name}`} />

                {/* Hero Section */}
                <div className="relative bg-slate-900 overflow-hidden min-h-[80px] sm:min-h-[480px] lg:min-h-[600px] flex items-center">
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
                                {rainLines.map((rl, i) => (
                                    <div key={i} className="rain-line" style={{
                                        left: `${rl.left}%`,
                                        animationDelay: `${rl.delay}s`,
                                        animationDuration: `${rl.duration}s`,
                                        opacity: rl.opacity
                                    }}></div>
                                ))}
                            </div>
                        )}

                        {heroStyle === 'particles' && (
                            <div className="absolute inset-0 z-10 overflow-hidden opacity-40">
                                {particleDots.map((pd, i) => (
                                    <div key={i} className="particle-dot" style={{
                                        left: `${pd.left}%`,
                                        width: `${pd.size}px`,
                                        height: `${pd.size}px`,
                                        animationDelay: `${pd.delay}s`,
                                        animationDuration: `${pd.duration}s`,
                                        opacity: pd.opacity
                                    }}></div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content Container */}
                    <div className="relative z-30 container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-3 sm:gap-5 pt-2 pb-2 sm:pt-8 sm:pb-10 lg:pb-16">

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
                                            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider leading-none mb-1">{t('activities.implementation_time')}</p>
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
                                                    <p className="text-xs sm:text-sm font-semibold text-white">
                                                        {showPrice ? `Rp ${new Intl.NumberFormat('id-ID').format(activity.price)}` : t('activities.cost_in_register')}
                                                    </p>
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
                                {pendingPayment ? (
                                    <button
                                        onClick={handlePaymentClick}
                                        disabled={loadingPaymentModal}
                                        className="inline-flex items-center gap-3 h-14 px-8 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold hover:shadow-lg hover:shadow-amber-500/30 transition-all transform hover:-translate-y-1"
                                    >
                                        {loadingPaymentModal ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-credit-card"></i>}
                                        <span>{pendingPayment.proof_of_payment && pendingPayment.proof_of_payment !== 'imported' ? 'Menunggu Verifikasi' : t('activities.finish_payment')}</span>
                                    </button>
                                ) : registrationTarget?.type === 'disabled' ? (
                                    <span className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-gray-500/50 backdrop-blur-sm text-white font-bold cursor-not-allowed border border-white/10">
                                        <i className="fas fa-ban"></i>
                                        {registrationTarget.label}
                                    </span>
                                ) : (
                                    <button
                                        onClick={() => {
                                            if (auth?.user) {
                                                setIsBulkImportModalOpen(true);
                                            } else {
                                                setIsLoginModalOpen(true);
                                            }
                                        }}
                                        className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white font-bold cursor-pointer border border-white/10 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
                                    >
                                        <i className="fas fa-user-plus"></i>
                                        <span>{t('activities.register_others')}</span>
                                    </button>
                                )}

                                {/* Share Button */}
                                <button
                                    type="button"
                                    onClick={handleShare}
                                    className="h-14 px-6 rounded-full glass-button text-white font-medium hover:bg-white/20 inline-flex items-center gap-2 relative"
                                >
                                    <i className="fas fa-share-alt"></i>
                                    <span className="hidden sm:inline">{t('activities.share')}</span>
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

                <div className="bg-gray-50 min-h-screen pb-2 sm:pb-10">

                    {/* Registration Type Modal Removed (Moved to Component) */}

                    <div id="content" className="container mx-auto px-4 pt-2 sm:pt-6 relative z-10">

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 items-start">
                            {/* Main Content (Left) */}
                            <div className="lg:col-span-2 space-y-4 sm:space-y-6 order-2 lg:order-1">

                                {/* Visibility Controls */}
                                {canConfigureView && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                                        <h3 className="text-sm font-bold text-gray-900 mb-3">{t('activities.admin_controls')}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { id: 'description', label: t('activities.about'), icon: 'fa-info-circle' },
                                                { id: 'speakers', label: t('activities.speakers'), icon: 'fa-user-tie' },
                                                { id: 'materials', label: t('activities.materials'), icon: 'fa-file-alt' },
                                                { id: 'rundown', label: t('activities.rundown'), icon: 'fa-list-ol' },
                                                { id: 'gallery', label: t('activities.gallery'), icon: 'fa-images' },
                                                { id: 'participants', label: t('activities.participants_list'), icon: 'fa-users' },
                                                { id: 'contact_person', label: t('activities.narahubung_label'), icon: 'fa-address-book' },
                                                { id: 'id_card', label: t('activities.id_card'), icon: 'fa-id-card' },
                                                { id: 'certificate', label: t('activities.certificate'), icon: 'fa-certificate' },
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
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5">
                                        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                            <i className="fas fa-info-circle text-primary text-sm"></i>
                                            {t('activities.about')}
                                        </h3>
                                        <div
                                            className="prose prose-sm max-w-none text-gray-600 leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: activity.description }}
                                        />
                                    </div>
                                )}

                                {/* Speakers Section */}
                                {isVisible('speakers') && activity.speakers && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
                                        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                            <i className="fas fa-user-tie text-primary text-sm"></i>
                                            {t('activities.speakers')}
                                        </h3>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                                            {activity.speakers.length > 0 ? (
                                                activity.speakers.map((speaker, index) => {
                                                    const color = colors[index % colors.length];
                                                    return (
                                                        <div key={speaker.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group flex flex-col h-full">
                                                            <div className={`bg-gradient-to-br ${color.bg} relative aspect-square overflow-hidden`}>
                                                                {speaker.photo ? (
                                                                    <img
                                                                        src={route('activity.speakers.photo', speaker.id)}
                                                                        alt={speaker.name}
                                                                        loading="lazy"
                                                                        className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-500"
                                                                        onError={(e) => {
                                                                            e.target.onerror = null;
                                                                            e.target.src = '/assets/images/profilefoto/default-profile.png';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-white">
                                                                        <i className="fas fa-user text-4xl opacity-50"></i>
                                                                    </div>
                                                                )}

                                                                {/* CV Button Overlay on Hover */}
                                                                {speaker.cv && (
                                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                        <a
                                                                            href={route('activity.speakers.cv', speaker.id)}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="bg-white text-gray-900 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform"
                                                                        >
                                                                            <i className="fas fa-file-pdf text-red-500"></i> Lihat CV
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="p-2 bg-white flex flex-col flex-1">
                                                                <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-1" title={speaker.name}>{speaker.name}</h4>
                                                                <p className={`text-[10px] ${color.text} font-bold mb-0.5 flex items-center gap-1 uppercase tracking-tight`}>
                                                                    <i className="fas fa-briefcase text-[8px]"></i>
                                                                    {speaker.title || 'Narasumber'}
                                                                </p>
                                                                <p className="text-[10px] text-gray-500 mb-2 flex items-center gap-1 line-clamp-1">
                                                                    <i className="fas fa-building text-gray-300 text-[8px]"></i>
                                                                    {speaker.institution || '-'}
                                                                </p>

                                                                <div className="mt-auto pt-2 border-t border-gray-50 flex items-center justify-between">
                                                                    <div className="flex gap-2">
                                                                        {speaker.linkedin && (
                                                                            <a href={speaker.linkedin.startsWith('http') ? speaker.linkedin : `https://linkedin.com/in/${speaker.linkedin}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-secondary transition-colors">
                                                                                <i className="fab fa-linkedin text-xs"></i>
                                                                            </a>
                                                                        )}
                                                                        {speaker.instagram && (
                                                                            <a href={`https://instagram.com/${speaker.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-600 transition-colors">
                                                                                <i className="fab fa-instagram text-xs"></i>
                                                                            </a>
                                                                        )}
                                                                        {speaker.email && (
                                                                            <a href={`mailto:${speaker.email}`} className="text-gray-400 hover:text-gray-600 transition-colors">
                                                                                <i className="fas fa-envelope text-xs"></i>
                                                                            </a>
                                                                        )}
                                                                    </div>

                                                                    {speaker.cv && (
                                                                        <a
                                                                            href={route('activity.speakers.cv', speaker.id)}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="text-[10px] font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
                                                                        >
                                                                            <i className="fas fa-file-pdf"></i> CV
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="col-span-full text-gray-500 text-sm italic py-2">
                                                    Belum ada data narasumber.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Materials Section */}
                                {isVisible('materials') && materials && materials.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-5">
                                        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <i className="fas fa-file-alt text-indigo-500 text-sm"></i>
                                            {t('activities.materi_kegiatan')}
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {materials.map((material) => {
                                                const isPdf = material.file_type === 'pdf' || (material.file_path && material.file_path.toLowerCase().endsWith('.pdf'));

                                                let iconSrc = '/assets/images/icon/iconpdf.jpg';
                                                if (material.file_type === 'ppt') iconSrc = '/assets/images/icon/iconppt.jpg';
                                                else if (material.file_type === 'link' || material.file_type === 'youtube') iconSrc = '/assets/images/icon/iconlink.jpg';

                                                return (
                                                    <div key={material.id} className="border border-gray-100 rounded-xl p-3 hover:shadow-md transition bg-gray-50 flex items-start gap-3">
                                                        <div className="shrink-0">
                                                            <img src={iconSrc} alt="Icon" className="w-10 h-10 object-contain" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-sm font-bold text-gray-800 truncate mb-0.5">{material.title || material.name}</h4>
                                                            <p className="text-[10px] text-gray-500 mb-2 line-clamp-1">{material.description || t('activities.no_description')}</p>

                                                            <div className="flex items-center gap-3">
                                                                {/* PDF Preview Link */}
                                                                {isPdf && (
                                                                    <a
                                                                        href={route('activity.preparation.view-material', { activityId: activity.id, materialId: material.id })}
                                                                        className="inline-flex items-center text-xs font-medium text-primary hover:text-primary"
                                                                    >
                                                                        <i className="fas fa-eye mr-1"></i> Preview
                                                                    </a>
                                                                )}

                                                                {/* Download Link (for all files) */}
                                                                {material.file_type !== 'link' && material.file_type !== 'youtube' && (
                                                                    <a
                                                                        href={route('activity.preparation.download-material', { activityId: activity.id, materialId: material.id })}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-primary"
                                                                    >
                                                                        <i className="fas fa-download mr-1"></i> Unduh
                                                                    </a>
                                                                )}

                                                                {/* External Link */}
                                                                {(material.file_type === 'link' || material.file_type === 'youtube') && (
                                                                    <a
                                                                        href={material.file_path}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center text-xs font-medium text-primary hover:text-primary"
                                                                    >
                                                                        <i className="fas fa-external-link-alt mr-1"></i> Buka Link
                                                                    </a>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Rundown Section */}
                                {isVisible('rundown') && activity.rundowns && activity.rundowns.length > 0 && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-6">
                                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                            <i className="fas fa-list-ol text-indigo-500"></i>
                                            {t('activities.rangkaian_acara')}
                                        </h3>
                                        <div className="overflow-hidden border border-gray-200 rounded-lg">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('activities.implementation_time')}</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('activities.activity_item')}</th>
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





                                {/* Participants List */}
                                {isVisible('participants') && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        {/* Controls */}
                                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                                            <div className="relative flex-1">
                                                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 text-sm"></i>
                                                <input
                                                    type="text"
                                                    placeholder={t('activities.search_participants')}
                                                    className="w-full border border-indigo-200 rounded-xl pl-10 pr-3 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400"
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex items-center gap-2 bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-200">
                                                <label className="text-xs font-semibold text-indigo-700 whitespace-nowrap">{t('activities.show')}:</label>
                                                <select
                                                    className="border border-indigo-300 bg-white rounded-lg px-2 py-1 text-sm text-indigo-700 font-semibold focus:ring-2 focus:ring-indigo-500"
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
                                                        statusText = t('activities.active');
                                                        statusClass = 'bg-green-100 text-green-700 border-green-200';
                                                    } else if (status === 0) { // PENDING
                                                        statusText = t('activities.menunggu_verifikasi');
                                                        statusClass = 'bg-yellow-100 text-yellow-700 border-yellow-200';
                                                    } else if (status === 2) { // REJECTED
                                                        statusText = t('activities.rejected');
                                                        statusClass = 'bg-red-100 text-red-700 border-red-200';
                                                    }

                                                    return (
                                                        <div key={participant.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 w-full gap-3 bg-white">
                                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                <img
                                                                    src={fotoUrl}
                                                                    loading="lazy"
                                                                    className="flex-shrink-0 rounded-full w-9 h-9 object-cover border border-gray-200"
                                                                    alt={participant.name}
                                                                    onError={(e) => {
                                                                        e.target.onerror = null;
                                                                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(participant.name)}&color=7F9CF5&background=EBF4FF`;
                                                                    }}
                                                                />
                                                                <div className="min-w-0">
                                                                    <div className="text-gray-900 font-semibold whitespace-normal break-words sm:truncate">{participant.name}</div>
                                                                    <div className="text-xs text-gray-600 truncate flex flex-wrap gap-1">
                                                                        {participant.profile?.instansi && (
                                                                            <span>{participant.profile.instansi} - </span>
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
                                                <div className="text-center py-2 sm:py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                                    Belum ada peserta terdaftar.
                                                </div>
                                            )}
                                        </div>

                                        {/* Pagination */}
                                        {participants.links && participants.last_page > 1 && (
                                            <div className="mt-4 sm:mt-8 flex flex-col items-center gap-3 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-lg shadow-sm border border-purple-100 p-4">
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
                                                    {t('activities.showing')} <span className="font-semibold text-indigo-700">{participants.from || 0}</span> {t('activities.to')} <span className="font-semibold text-indigo-700">{participants.to || 0}</span> {t('activities.of_results', { total: participants.total || 0 })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}


                            </div>

                            {/* Sidebar (Right) */}
                            <div className="space-y-6 order-1 lg:order-2 lg:sticky lg:top-24 h-fit">
                                {/* User Status Card */}
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">{t('activities.participation_status')}</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-indigo-50 border border-indigo-100">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <i className="fas fa-user-check text-sm"></i>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-sm text-gray-500">{t('activities.status')}:</div>
                                                <div className="text-sm font-semibold text-indigo-900">
                                                    {enrollmentStatus === 1 ? t('activities.active') : enrollmentStatus === 0 ? t('activities.menunggu_verifikasi') : enrollmentStatus === 2 ? t('activities.rejected') : t('activities.menunggu_pembayaran')}
                                                </div>
                                            </div>
                                        </div>

                                        {userRoomNumber && (
                                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-orange-50 border border-orange-100">
                                                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                                                    <i className="fas fa-bed text-sm"></i>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm text-gray-500">{t('activities.room')}:</div>
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
                                                        customData={(enrollmentData && enrollmentData.custom_data) ? { ...enrollmentData.custom_data, group: enrollmentData.group_name } : (enrollmentData ? { group: enrollmentData.group_name } : {})}
                                                        scale={cardScale}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => setShowCardModal(true)}
                                                    className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white border border-indigo-200 text-primary hover:bg-indigo-50 rounded-xl font-medium transition text-sm"
                                                >
                                                    <i className="fas fa-expand"></i>
                                                    {t('activities.perbesar')}
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
                                                        {t('activities.unduh_id_card')}
                                                    </a>
                                                )}

                                                {isVisible('certificate') && (
                                                    <a
                                                        href={route('activity.download-certificate', activity.id)}
                                                        target="_blank"
                                                        className="block w-full text-center bg-emerald-600 text-white py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                                    >
                                                        <i className="fas fa-certificate mr-2"></i>
                                                        {t('activities.unduh_certificate')}
                                                    </a>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Attendance Section if any */}
                                {(mandiriAttendances?.length > 0 || manualAttendances?.length > 0) && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                                <i className="fas fa-clipboard-check text-xl"></i>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900">{t('activities.attendance')}</h3>
                                                <p className="text-xs text-gray-500">Silakan lakukan absensi sesuai jadwal kegiatan.</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {Array.isArray(mandiriAttendances) && mandiriAttendances.length > 0 && mandiriAttendances.map(att => (
                                                <div
                                                    key={att.id}
                                                    className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${att.has_attended
                                                        ? 'bg-emerald-50/50 border-emerald-100'
                                                        : 'bg-white border-gray-200 hover:border-blue-300 shadow-sm hover:shadow-md'
                                                        }`}
                                                >
                                                    {att.has_attended && (
                                                        <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden">
                                                            <div className="absolute top-[6px] right-[-24px] rotate-45 bg-emerald-500 text-white text-[9px] font-bold py-1 w-24 text-center shadow-sm">
                                                                HADIR
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="p-4 flex items-start gap-4">
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors ${att.has_attended
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : 'bg-blue-50 text-blue-600'
                                                            }`}>
                                                            <i className={`fas ${att.has_attended ? 'fa-check' : 'fa-qrcode'} text-lg`}></i>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className={`font-bold text-base ${att.has_attended ? 'text-emerald-900' : 'text-gray-800'}`}>
                                                                {att.name}
                                                            </h4>

                                                            <div className="mt-2">
                                                                {!att.has_attended ? (
                                                                    <button
                                                                        onClick={() => handleMandiriAttendance(att.id)}
                                                                        className="group relative inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-200 active:scale-95 transition-all overflow-hidden"
                                                                    >
                                                                        <i className="fas fa-fingerprint animate-pulse text-sm"></i>
                                                                        <span>Klik untuk Absen</span>
                                                                    </button>
                                                                ) : (
                                                                    <div className="flex items-center gap-2 text-xs font-medium text-emerald-600">
                                                                        <i className="fas fa-check-circle"></i>
                                                                        <span>Tercatat</span>
                                                                        <span className="text-gray-400 mx-1">•</span>
                                                                        <span className="text-gray-500">Terverifikasi</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}

                                            {Array.isArray(manualAttendances) && manualAttendances.length > 0 && manualAttendances.map(att => (
                                                <div
                                                    key={att.id}
                                                    className={`relative rounded-xl border transition-all duration-300 ${att.has_attended
                                                        ? 'bg-emerald-50/50 border-emerald-100'
                                                        : 'bg-gray-50/50 border-gray-200'
                                                        }`}
                                                >
                                                    <div className="p-4 flex items-start gap-4">
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${att.has_attended
                                                            ? 'bg-emerald-100 text-emerald-600'
                                                            : 'bg-gray-200 text-gray-500'
                                                            }`}>
                                                            <i className={`fas ${att.has_attended ? 'fa-user-check' : 'fa-user-clock'} text-lg`}></i>
                                                        </div>
                                                        <div className="flex-1">
                                                            <h4 className={`font-bold text-base ${att.has_attended ? 'text-emerald-900' : 'text-gray-700'}`}>
                                                                {att.name}
                                                            </h4>
                                                            <div className="mt-2 flex items-center gap-2">
                                                                <span className="text-xs text-gray-500">
                                                                    {att.has_attended
                                                                        ? 'Dikonfirmasi oleh Panitia'
                                                                        : 'Menunggu konfirmasi panitia'
                                                                    }
                                                                </span>
                                                                {att.has_attended && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 ml-2">
                                                                        Hadir
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Narahubung - di atas Komentar & Ulasan */}
                                {isVisible('contact_person') && (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mt-6">
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
                                                                loading="lazy"
                                                                onError={(e) => { e.target.onerror = null; e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                                            />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-gray-900">{person.name}</p>
                                                            <p className="text-xs text-indigo-600 font-medium">
                                                                {person.daerah_layanan ? `${person.position} : ${person.daerah_layanan}` : person.position}
                                                            </p>
                                                            <div className="mt-1 space-y-0.5 text-sm text-gray-600">
                                                                <p className="flex items-center gap-2">
                                                                    <i className="fas fa-envelope text-gray-400 w-4"></i>
                                                                    <span>{person.email || '-'}</span>
                                                                </p>
                                                                <p className="flex items-center gap-2">
                                                                    <i className="fas fa-phone text-gray-400 w-4"></i>
                                                                    <span>{person.phone || '-'}</span>
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                                        <img
                                                            src={activity.user?.profile_photo_url || '/assets/images/profilefoto/default-profile.png'}
                                                            alt={activity.user?.name}
                                                            className="w-full h-full object-cover"
                                                            loading="lazy"
                                                            onError={(e) => { e.target.onerror = null; e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{activity.user?.name}</p>
                                                        <p className="text-sm text-gray-500">{activity.user?.email}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Desktop Comment Section */}
                                <div className="hidden lg:block mt-6">
                                    {isVisible('comments') && (activity.enable_comments ?? true) && (
                                        <CommentSection activity={activity} comments={activity.comments} />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Gallery Section */}
                        {isVisible('gallery') && activity.galleries && activity.galleries.length > 0 && (
                            <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <i className="fas fa-images text-indigo-500"></i>
                                    {t('activities.gallery')}
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Array.isArray(activity.galleries) && activity.galleries.length > 0 ? (
                                        activity.galleries.map((gallery) => {
                                            const getGalleryImageUrl = (rec) => {
                                                if (!rec?.image) return DEFAULT_ACTIVITY_IMAGE;
                                                const raw = rec.image;
                                                if (raw.startsWith('http')) return raw;
                                                const clean = raw.replace(/^activities\/gallery\//, '').replace(/^storage\/activities\/gallery\//, '');
                                                return clean ? `/storage/activities/gallery/${clean}` : DEFAULT_ACTIVITY_IMAGE;
                                            };
                                            const gallerySrc = getGalleryImageUrl(gallery);

                                            return (
                                                <div key={gallery.id} className="aspect-video relative group rounded-xl overflow-hidden cursor-pointer shadow-sm">
                                                    <img
                                                        src={gallerySrc}
                                                        alt="Galeri"
                                                        loading="lazy"
                                                        className="w-full h-full object-cover transition transform group-hover:scale-110"
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = DEFAULT_ACTIVITY_IMAGE;
                                                        }}
                                                    />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full text-center py-8 text-gray-500">
                                            <p>{t('activities.no_gallery')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Mobile Comment Section */}
                        <div className="lg:hidden">
                            {isVisible('comments') && (activity.enable_comments ?? true) && (
                                <CommentSection activity={activity} comments={activity.comments} />
                            )}
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
                                customData={(enrollmentData && enrollmentData.custom_data) ? { ...enrollmentData.custom_data, group: enrollmentData.group_name } : (enrollmentData ? { group: enrollmentData.group_name } : {})}
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
                    onSelectType={handleEnroll}
                    activity={activity}
                    requiredFields={requiredProfileLabels}
                />

                <MissingDataModal
                    show={isMissingDataModalOpen}
                    onClose={() => setIsMissingDataModalOpen(false)}
                    missingData={missingProfileData}
                    onSuccess={() => {
                        setIsMissingDataModalOpen(false);
                        try { sessionStorage.removeItem('pending_enrollment'); } catch (e) {}
                        const price = Number(activity?.price || 0);
                        if (price > 0) {
                            openManualPaymentModal();
                        } else {
                            handleEnroll('mandiri', true);
                        }
                    }}
                />

                <CustomFieldsFormModal
                    isOpen={isCustomFieldsModalOpen}
                    onClose={() => setIsCustomFieldsModalOpen(false)}
                    customFields={activity.custom_fields}
                    onSubmit={handleCustomFieldsSubmit}
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
                    activity={activity}
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
