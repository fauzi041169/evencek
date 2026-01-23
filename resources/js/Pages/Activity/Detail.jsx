import React, { useState, useEffect, useRef } from 'react';
import { Head, usePage, router, useForm } from '@inertiajs/react';
import axios from 'axios';
import WebLayout from '@/Layouts/WebLayout';
import LoginModal from '@/Components/Activity/LoginModal';
import MissingDataModal from '@/Components/Activity/MissingDataModal';
import ProfileEditModal from '@/Components/Activity/ProfileEditModal';
import PaymentDetailModal from '@/Components/Activity/PaymentDetailModal';
import BulkImportModal from '@/Components/Activity/BulkImportModal';
import BulkPaymentModal from '@/Components/Activity/BulkPaymentModal';
import RegistrationTypeModal from '@/Components/Activity/RegistrationTypeModal';
import ChatWidget from '@/Components/Activity/ChatWidget';
import GalleryLightbox from '@/Components/Activity/GalleryLightbox';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

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
    flash
}) {
    const { auth } = usePage().props;
    const user = auth?.user;
    
    // Normalize participants data (handle both pagination and collection)
    const filteredParticipants = Array.isArray(participants) 
        ? participants 
        : (participants?.data || []);

    const [showPrice, setShowPrice] = useState(activity.show_price);
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
    
    // Comments & Rating State
    const [rating, setRating] = useState(userRating || 0);
    const [commentBody, setCommentBody] = useState('');
    const [participantSearch, setParticipantSearch] = useState('');
    
    // Debounce search for participants
    useEffect(() => {
        const timer = setTimeout(() => {
            if (participantSearch.trim() !== '') {
                router.reload({
                    data: { search: participantSearch },
                    only: ['participants'],
                    preserveState: true,
                    preserveScroll: true,
                });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [participantSearch]);

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
        console.log('[DEBUG] Flash props in Detail:', flash);
        if (flash?.show_import_bulk_payment_once) {
            // Redirect to payment creation with is_bulk=1
            // We use window.location to ensure a full refresh and proper session handling if needed,
            // but router.visit is better for SPA experience.
            router.visit(route('payments.create', { 
                activity: activity.id, 
                is_bulk: 1,
                batch_id: activeBatch?.id 
            }));
        }
    }, [flash, activity.id, activeBatch]);

    const handleCommentSubmit = (e) => {
        e.preventDefault();
        router.post(route('activity.comments.store', activity.id), {
            body: commentBody,
            rating: rating
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setCommentBody('');
                // alert('Komentar berhasil dikirim');
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
        
        if (endDate && endDate > startDate) {
            if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
                return `${format(startDate, 'd')} - ${format(endDate, 'd MMMM yyyy', { locale: id })}`;
            }
            return `${format(startDate, 'd MMMM')} - ${format(endDate, 'd MMMM yyyy', { locale: id })}`;
        }
        return format(startDate, 'd MMMM yyyy', { locale: id });
    };

    const formatTimeRange = (start, end) => {
        if (!start) return '';
        const startTime = start.substring(0, 5);
        const endTime = end ? end.substring(0, 5) : null;
        return endTime ? `${startTime} - ${endTime}` : startTime;
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

    const handleEnroll = async (type = 'mandiri', force = false) => {
        setIsRegistrationTypeModalOpen(false);

        setTimeout(async () => {
            if (type === 'mandiri') {
                 if (!force && missingProfileFields && missingProfileFields.length > 0) {
                     // Save intent for auto-enroll after profile update
                     sessionStorage.setItem('pending_enrollment', JSON.stringify({
                         activityId: activity.id,
                         type: type
                     }));
                     setIsMissingDataModalOpen(true);
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
                                 // Ini akan membuka halaman pembayaran (yang mungkin berisi Midtrans Snap Popup)
                                 window.location.href = response.data.redirect_url;
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
                            alert(response.data.message || 'Gagal memproses pendaftaran.');
                        }
                    } catch (error) {
                         if (error.response && error.response.status === 422) {
                             // Jika error validasi (misal data belum lengkap yang terlewat), refresh atau tampilkan pesan
                             if (error.response.data.missing_fields) {
                                 // Harusnya sudah dicek di awal, tapi untuk jaga-jaga
                                 alert('Mohon lengkapi data profil Anda terlebih dahulu.');
                                 window.location.reload();
                             } else {
                                 alert(error.response.data.message || 'Terjadi kesalahan saat mendaftar.');
                             }
                         } else {
                             console.error('Enroll error:', error);
                             alert('Terjadi kesalahan sistem. Silakan coba lagi.');
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
        // Enrollment will be handled by useEffect detecting sessionStorage and updated props
    };

    const togglePriceVisibility = () => {
        if (!confirm('Ubah visibilitas harga?')) return;
        
        // Use Inertia to toggle price
        router.post(route('activity.toggle-price', activity.id), {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                // Assuming the controller returns updated activity or flash message
                // Update local state if needed, or rely on page reload
                // Since we don't have the controller code, we assume it redirects back
                setShowPrice(!showPrice);
                alert(page.props.flash?.message || 'Visibilitas harga berhasil diubah');
            },
            onError: () => {
                alert('Terjadi kesalahan saat mengubah visibilitas harga');
            }
        });
    };

    const copyShareLink = () => {
        navigator.clipboard.writeText(window.location.href);
        alert('Link berhasil disalin!');
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
    const shouldShowPrice = showPrice || canEdit;

    return (
        <WebLayout hasHeaderSpacer={false}>
            <Head title={activity.title || activity.name} />

            {/* Hero Section */}
            <section className="relative min-h-[600px] flex items-center overflow-hidden bg-slate-900">
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
                        backdrop-filter: blur(8px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    .glass-button {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        transition: all 0.3s ease;
                    }
                    .glass-button:hover {
                        background: rgba(255, 255, 255, 0.25);
                        transform: translateY(-2px);
                        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
                    }
                    .gradient-text {
                        background: linear-gradient(135deg, #fff 0%, var(--color-primary) 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
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
                `}</style>

                {/* Unique Animated Background */}
                <div className="absolute inset-0 bg-slate-900 z-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-hero-start/50 via-primary/50 to-hero-end/50 z-10"></div>
                    
                    {/* Animated Blobs */}
                    {heroStyle === 'circles' && (
                        <>
                            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/30 blur-[120px] animate-blob mix-blend-screen"></div>
                            <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] rounded-full bg-hero-start/30 blur-[120px] animate-blob animation-delay-2000 mix-blend-screen"></div>
                            <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[40%] rounded-full bg-hero-end/30 blur-[120px] animate-blob animation-delay-4000 mix-blend-screen"></div>
                        </>
                    )}

                    {heroStyle === 'waves' && (
                         <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute -inset-[10px] opacity-50">
                                <div className="absolute top-0 -left-4 w-72 h-72 bg-secondary/50 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                                <div className="absolute top-0 -right-4 w-72 h-72 bg-warning/50 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-card-pink/50 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
                            </div>
                        </div>
                    )}
                    
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                </div>

                {/* Content Container */}
                <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-24">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        {/* Left Column: Text Content */}
                        <div className="lg:col-span-7 space-y-6 text-left order-2 lg:order-1">
                            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-tight animate-fade-up">
                                <span className="block text-primary text-lg md:text-xl font-medium tracking-wider uppercase mb-2">Event Spesial</span>
                                <span className="gradient-text">{activity.title || activity.name}</span>
                            </h1>
                            
                            {/* Meta Info */}
                            <div className="flex flex-wrap gap-3 animate-fade-up delay-100">
                                {(activity.date || activity.start_date) && (
                                    <span className="glass-badge inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm">
                                        <i className="far fa-calendar-alt text-primary/80"></i>
                                        <span>{formatDateRange(activity.date || activity.start_date, activity.end_date)}</span>
                                    </span>
                                )}
                                {(activity.time || activity.start_time) && (
                                    <span className="glass-badge inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm">
                                        <i className="fas fa-clock text-primary/80"></i>
                                        <span>{formatTimeRange(activity.time || activity.start_time, activity.end_time)}</span>
                                    </span>
                                )}
                                {activity.location && (
                                    <span className="glass-badge inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm">
                                        <i className="fas fa-map-marker-alt text-primary/80"></i>
                                        <span>{activity.location}</span>
                                    </span>
                                )}
                            </div>
                            
                            {/* Price */}
                            {activity.price !== null && (
                                <div className="py-4 animate-fade-up delay-200">
                                    <div className="inline-flex items-center gap-3">
                                        {Number(activity.price) > 0 ? (
                                            <>
                                                <span className="text-3xl font-bold text-white">
                                                    {shouldShowPrice ? (
                                                        <span className={!showPrice && canEdit ? 'opacity-50' : ''}>
                                                            Rp {new Intl.NumberFormat('id-ID').format(activity.price)}
                                                        </span>
                                                    ) : 'Rp ***.***'}
                                                </span>
                                                {canEdit && (
                                                    <button 
                                                        onClick={(e) => { e.preventDefault(); togglePriceVisibility(); }} 
                                                        className="ml-2 text-white/70 hover:text-white transition-colors" 
                                                        title={showPrice ? 'Sembunyikan Harga' : 'Tampilkan Harga'}
                                                    >
                                                        <i className={`fas ${showPrice ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                                                    </button>
                                                )}
                                            </>
                                        ) : Number(activity.price) <= 0 ? (
                                            <span className="text-3xl font-bold text-emerald-400">GRATIS</span>
                                        ) : null}
                                    </div>
                                </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-4 animate-fade-up delay-300 pt-2 relative z-30">
                                {/* Share Button */}
                                <div className="relative">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsShareMenuOpen(!isShareMenuOpen)}
                                        className="glass-button inline-flex items-center justify-center w-14 h-14 rounded-full text-white" 
                                        title="Bagikan" 
                                    >
                                        <i className="fas fa-share-alt text-xl"></i>
                                    </button>
                                    {isShareMenuOpen && (
                                        <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 text-left text-gray-800 animate-fade-up" style={{ zIndex: 50 }}>
                                            <button type="button" onClick={copyShareLink} className="flex items-center w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors">
                                                <i className="fas fa-link text-gray-500 mr-3"></i> Salin URL
                                            </button>
                                            <button type="button" onClick={shareNative} className="flex items-center w-full text-left px-4 py-3 text-sm hover:bg-gray-50 transition-colors">
                                                <i className="fas fa-share text-gray-600 mr-3"></i> Bagikan Perangkat
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isJoined ? (
                                    <>
                                        <button 
                                            onClick={() => openPaymentDetailLookup(activity.id, user?.id)}
                                            className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-bold hover:shadow-lg hover:shadow-primary/30 transition-all transform hover:-translate-y-1"
                                        >
                                            <i className="fas fa-file-invoice"></i>
                                            {buttonText || 'Lihat Detail'}
                                        </button>
                                        
                                        <button 
                                            onClick={() => setIsBulkImportModalOpen(true)}
                                            className="glass-button inline-flex items-center gap-2 h-14 px-8 rounded-full text-white font-bold"
                                        >
                                            <i className="fas fa-user-plus"></i>
                                            Daftarkan Lain
                                        </button>
                                    </>
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
                                                        setIsRegistrationTypeModalOpen(true);
                                                    }
                                                }}
                                                className="inline-flex items-center gap-2 h-14 px-8 rounded-full bg-white text-primary font-bold hover:bg-secondary/5 hover:shadow-lg hover:shadow-white/20 transition-all transform hover:-translate-y-1"
                                            >
                                                <i className="fas fa-user-plus"></i>
                                                {registrationTarget.label}
                                            </button>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        </div>
                        
                        {/* Right Column: Poster Card */}
                        <div className="hidden lg:block lg:col-span-5 order-1 lg:order-2 animate-fade-up delay-200">
                            <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 group transform transition-all duration-500 hover:scale-[1.02] hover:shadow-indigo-500/20">
                                <img 
                                    src={heroCoverPath} 
                                    alt={activity.title || activity.name} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>
                            </div>
                        </div>
                        
                    </div>
                </div>

                {/* Wave Separator */}
                <div className="absolute -bottom-1 left-0 right-0 z-20 pointer-events-none text-gray-50">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 320" className="w-full h-auto fill-current">
                        <path fillOpacity="1" d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,202.7C1248,181,1344,171,1392,165.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    </svg>
                </div>
            </section>

            {/* Content Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Description */}
                        {(activity.detail_description_visible !== 0 && activity.detail_description_visible !== '0' && activity.detail_description_visible !== false) && (
                            <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4">Tentang Kegiatan</h2>
                                <div 
                                    className="prose max-w-none text-gray-600"
                                    dangerouslySetInnerHTML={{ __html: activity.description }}
                                />
                            </div>
                        )}

                        {/* Gallery */}
                        {(activity.detail_gallery_visible !== 0 && activity.detail_gallery_visible !== '0' && activity.detail_gallery_visible !== false) && (activity.show_gallery || canEdit) && (
                             <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-2xl font-bold text-gray-900">Galeri</h2>
                                    {canEdit && (
                                        <button 
                                            type="button"
                                            onClick={() => document.getElementById('galleryInput').click()}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm"
                                        >
                                            <i className="fas fa-plus mr-2"></i> Tambah Gambar
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
                                                    onSuccess: () => alert('Foto berhasil diunggah'),
                                                    onError: () => alert('Gagal mengunggah foto'),
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
                                                    src={`/storage/activities/gallery/${image.image}`} 
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
                                                            if(confirm('Hapus foto ini?')) {
                                                                router.delete(route('gallery.destroy', { activity: activity.id, gallery: image.id }), {
                                                                    preserveScroll: true
                                                                });
                                                            }
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
                                        <p className="text-gray-500">Belum ada foto galeri yang ditambahkan.</p>
                                    </div>
                                )}
                             </div>
                        )}
                        
                        {/* Rating & Comments */}
                        {(activity.detail_comments_visible !== 0 && activity.detail_comments_visible !== '0' && activity.detail_comments_visible !== false) && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                                <div className="border-b border-gray-100 pb-4 mb-6">
                                    <h2 className="text-2xl font-bold text-gray-900">Rating & Komentar</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-8">
                                    <div className="col-span-1 flex items-center gap-4">
                                        <div>
                                            <div className="text-5xl font-bold text-gray-900">{Number(activity.rating_avg || 0).toFixed(1)}</div>
                                            <div className="text-gray-500 text-sm mt-1">Berdasarkan {activity.rating_count || 0} rating</div>
                                        </div>
                                        <div className="text-amber-400 text-2xl">
                                             {[1,2,3,4,5].map(i => (
                                                 <i key={i} className={`fas fa-star ${i <= Math.round(activity.rating_avg || 0) ? '' : 'text-gray-200'}`}></i>
                                             ))}
                                        </div>
                                    </div>
                                </div>

                                {auth.user ? (
                                    <form onSubmit={handleCommentSubmit} className="mb-8 bg-gray-50 rounded-xl p-6 border border-gray-100">
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Berikan Rating</label>
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
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Komentar Anda</label>
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
                                                Kirim Komentar
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                     <div className="bg-gray-50 rounded-xl p-6 text-center mb-8 border border-gray-100">
                                        <p className="text-gray-600 mb-4">Silakan masuk untuk memberikan rating dan komentar.</p>
                                        <button 
                                            onClick={() => router.visit(route('login'), { data: { return_url: window.location.href } })}
                                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
                                        >
                                            Masuk
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    {activity.comments && activity.comments.length > 0 ? (
                                        activity.comments.map(comment => (
                                            <CommentItem key={comment.id} comment={comment} activity={activity} auth={auth} />
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-center py-4">Belum ada komentar.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Map / Location */}
                        {activity.location && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Lokasi</h3>
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
                        <div className="bg-white rounded-2xl shadow-sm p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Narahubung</h3>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                                    <img 
                                        src={activity.creator?.avatar || '/assets/images/profilefoto/default-profile.png'} 
                                        alt={activity.creator?.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => e.target.src = '/assets/images/profilefoto/default-profile.png'}
                                    />
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900">{activity.creator?.name}</p>
                                    <p className="text-sm text-gray-500">{activity.creator?.email}</p>
                                </div>
                            </div>
                        </div>

                        {/* Speakers */}
                        {(activity.detail_speakers_visible !== 0 && activity.detail_speakers_visible !== '0' && activity.detail_speakers_visible !== false && activity.speakers && activity.speakers.length > 0) && (
                            <div className="bg-white rounded-2xl shadow-sm p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Narasumber</h3>
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
                        {(activity.detail_participants_visible !== 0 && activity.detail_participants_visible !== '0' && activity.detail_participants_visible !== false) && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[500px] overflow-hidden">
                                <div className="px-6 py-4 border-b flex items-center justify-between bg-amber-50 border-yellow-200">
                                    <h5 className="m-0 font-bold text-yellow-800">Daftar Peserta</h5>
                                </div>
                                <div className="px-6 py-5 flex-1 flex flex-col min-h-0">
                                    <div className="mb-3">
                                        <div className="relative">
                                            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                                            <input 
                                                type="search" 
                                                value={participantSearch}
                                                onChange={(e) => setParticipantSearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" 
                                                placeholder="Cari peserta..." 
                                            />
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
                                                {participantSearch ? 'Peserta tidak ditemukan' : 'Belum ada peserta'}
                                            </div>
                                        )}
                                    </div>
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
                missingData={missingProfileData}
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
            />

            <BulkPaymentModal
                show={isBulkPaymentModalOpen}
                onClose={() => setIsBulkPaymentModalOpen(false)}
                activity={activity}
                importResult={bulkImportResult}
            />

            <ChatWidget 
                activityId={activity.id} 
                ownerId={activity.user_id} 
                ownerName={activity.creator?.name || 'Panitia'} 
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
                        <i className="fas fa-reply mr-1"></i>Balas
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
                                    placeholder="Tulis balasan..." 
                                    required
                                ></textarea>
                            </div>
                            <button type="submit" className="inline-flex items-center h-9 px-3 rounded-md bg-gray-700 text-white hover:bg-gray-800">
                                Kirim Balasan
                            </button>
                        </form>
                    ) : (
                        <div className="text-sm text-gray-600 mb-2">Masuk terlebih dahulu untuk menulis balasan.</div>
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

