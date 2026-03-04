import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Head, Link, router, usePage } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import { format } from 'date-fns';
import { id, enUS } from 'date-fns/locale';
import Swal from 'sweetalert2';

export default function Index({ latestActivities, sliderActivities, enrolledActivityIds = [], enrolledActivityBatches = [] }) {
    const { t, i18n } = useTranslation();
    const { appSettings } = usePage().props;
    const [currentSlide, setCurrentSlide] = useState(0);
    const [search, setSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const getStorageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;

        let cleanPath = path.startsWith('/') ? path.substring(1) : path;

        // Handle double storage/
        if (cleanPath.startsWith('storage/storage/')) {
            cleanPath = cleanPath.substring(8);
        }

        if (cleanPath.startsWith('storage/')) {
            return '/' + cleanPath;
        }

        if (cleanPath.startsWith('assets/')) {
            return '/' + cleanPath;
        }

        return `/storage/${cleanPath}`;
    };

    const heroAnim = appSettings?.hero_animation_style || 'blob';
    const heroBg1 = appSettings?.hero_background_1 || null;

    // Shape Editor State
    const [showShapeEditor, setShowShapeEditor] = useState(false);
    const [shapeSettings, setShapeSettings] = useState({
        middle: {
            color: '#0f172a', // slate-900
            opacity: 1,
        },
        left: {
            width: '15', // percentage
            color: '#1e293b', // slate-800
            opacity: 0.9,
            clipPath: 'polygon(0 0, 0 100%, 100% 100%)',
            visible: true
        },
        right: {
            width: '15', // percentage
            color: '#1e293b', // slate-800
            opacity: 0.9,
            clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
            visible: true
        }
    });

    useEffect(() => {
        // Initial check
        const storedMode = localStorage.getItem('editMode') === 'true';
        setEditMode(storedMode);

        // Load shape settings
        const savedShapes = localStorage.getItem('heroShapeSettings_v5');
        if (savedShapes) {
            try {
                setShapeSettings(prev => ({ ...prev, ...JSON.parse(savedShapes) }));
            } catch (e) {
                console.error('Failed to parse shape settings', e);
            }
        }

        // Listen for changes
        const handleEditModeChange = () => {
            const newMode = localStorage.getItem('editMode') === 'true';
            setEditMode(newMode);
        };

        window.addEventListener('editModeChanged', handleEditModeChange);
        return () => window.removeEventListener('editModeChanged', handleEditModeChange);
    }, []);

    // Save settings when changed
    useEffect(() => {
        localStorage.setItem('heroShapeSettings_v5', JSON.stringify(shapeSettings));
    }, [shapeSettings]);

    // Auto-play slider
    useEffect(() => {
        if (!sliderActivities || sliderActivities.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % sliderActivities.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [sliderActivities]);

    const changeSlide = (direction) => {
        if (!sliderActivities || sliderActivities.length === 0) return;
        let newSlide = currentSlide + direction;
        if (newSlide < 0) newSlide = sliderActivities.length - 1;
        if (newSlide >= sliderActivities.length) newSlide = 0;
        setCurrentSlide(newSlide);
    };

    const goToSlide = (index) => {
        setCurrentSlide(index);
    };

    // Search functionality
    const handleSearch = (e) => {
        e.preventDefault();
        setIsSearching(true);
        router.get(window.route('activity.index'), { search }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => setIsSearching(false)
        });
    };

    const DEFAULT_ACTIVITY_IMAGE = '/assets/images/hero/defoult.webp';
    const getImageUrl = (activity) => {
        if (!activity?.image) return DEFAULT_ACTIVITY_IMAGE;
        if (activity.image.startsWith('http')) return activity.image;
        if (activity.image.startsWith('/')) return activity.image;
        return `/storage/${activity.image.replace(/^storage\//, '')}`;
    };

    // Helper to determine link destination
    const getActivityLink = (activity) => {
        const userBatches = enrolledActivityBatches[activity.id] || [];
        // Filter empty values
        const validUserBatches = userBatches.filter(v => v !== null && v !== '');

        let isEnrolledInActiveBatch = false;
        if (activity.active_batch) {
            isEnrolledInActiveBatch = validUserBatches.includes(activity.active_batch.id);
        } else {
            isEnrolledInActiveBatch = validUserBatches.length > 0;
        }

        const canGoToShow = validUserBatches.length > 0;

        let batchIdForShow = null;
        if (isEnrolledInActiveBatch && activity.active_batch) {
            batchIdForShow = activity.active_batch.id;
        } else {
            batchIdForShow = validUserBatches[0] || null;
        }

        if (canGoToShow) {
            // route('activity.show', ...)
            const params = { activity: activity.id };
            if (batchIdForShow) params.batch_id = batchIdForShow;
            return window.route('activity.show', params);
        } else {
            // route('activity.detail', ...)
            const params = { activity: activity.id };
            if (activity.active_batch) params.batch_id = activity.active_batch.id;
            return window.route('activity.detail', params);
        }
    };

    // Helper for date formatting
    const formatDateRange = (start, end) => {
        if (!start) return '';
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : null;
        const currentLocale = i18n.language === 'en' ? enUS : id;

        if (endDate && endDate > startDate) {
            if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
                return `${format(startDate, 'd')} - ${format(endDate, 'd MMMM yyyy', { locale: currentLocale })}`;
            }
            return `${format(startDate, 'd MMMM')} - ${format(endDate, 'd MMMM yyyy', { locale: currentLocale })}`;
        }
        return format(startDate, 'd MMMM yyyy', { locale: currentLocale });
    };

    return (
        <WebLayout hasHeaderSpacer={false} fluid={true} noPadding={true}>
            <Head title={t('activities.title')} />



            <div className="bg-gray-50 min-h-screen pb-2 sm:pb-6">
                {/* Hero Section */}
                    <div className="relative overflow-visible min-h-[300px] sm:min-h-[450px] lg:min-h-[600px] flex items-center">
                    {/* Dynamic Background Layer */}
                    <div 
                        className="absolute inset-0 z-0 transition-colors duration-300"
                        style={{ 
                            backgroundColor: shapeSettings.middle?.color || '#0f172a',
                            opacity: shapeSettings.middle?.opacity ?? 1
                        }}
                    ></div>
                    <style>{`
                        @keyframes blob {
                            0% { transform: translate(0px, 0px) scale(1); }
                            33% { transform: translate(30px, -50px) scale(1.1); }
                            66% { transform: translate(-20px, 20px) scale(0.9); }
                            100% { transform: translate(0px, 0px) scale(1); }
                        }
                        .animate-blob { animation: blob 10s infinite; }
                        .animation-delay-2000 { animation-delay: 2s; }
                        .animation-delay-4000 { animation-delay: 4s; }
                        
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
                    <div className="absolute inset-0">
                        {/* Gradient Overlay - Adjusted for visibility */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-900/80 z-10"></div>

                        {heroBg1 ? (
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-60 mix-blend-overlay z-[1]"
                                style={{ backgroundImage: `url('${getStorageUrl(heroBg1)}')` }}
                            />
                        ) : (
                            <img
                                src="/assets/images/begron/bg-pattern.png"
                                alt="Background Pattern"
                                className="w-full h-full object-cover opacity-20 mix-blend-overlay"
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        )}

                        {/* Animated Elements */}
                        {(heroAnim === 'blob' || heroAnim === 'circles') && (
                            <>
                                <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                                <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
                            </>
                        )}

                        {heroAnim === 'rain' && (
                            <div className="absolute inset-0 z-10 overflow-hidden opacity-40 pointer-events-none">
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

                        {heroAnim === 'particles' && (
                            <div className="absolute inset-0 z-10 overflow-hidden opacity-40 pointer-events-none">
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

                    {/* Decorative Side Shapes */}
                    {shapeSettings.left.visible && (
                        <div
                            className="absolute inset-y-0 left-0 z-10 hidden xl:block pointer-events-none transition-all duration-300"
                            style={{ width: `${shapeSettings.left.width}%` }}
                        >
                            <div
                                className="h-full w-full transition-all duration-300"
                                style={{
                                    backgroundColor: shapeSettings.left.color,
                                    opacity: shapeSettings.left.opacity,
                                    clipPath: shapeSettings.left.clipPath
                                }}
                            ></div>
                        </div>
                    )}
                    {shapeSettings.right.visible && (
                        <div
                            className="absolute inset-y-0 right-0 z-10 hidden xl:block pointer-events-none transition-all duration-300"
                            style={{ width: `${shapeSettings.right.width}%` }}
                        >
                            <div
                                className="h-full w-full transition-all duration-300"
                                style={{
                                    backgroundColor: shapeSettings.right.color,
                                    opacity: shapeSettings.right.opacity,
                                    clipPath: shapeSettings.right.clipPath
                                }}
                            ></div>
                        </div>
                    )}

                    <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-6">
                        {sliderActivities && sliderActivities.length > 0 ? (
                            <div className="relative">
                                {/* Slider Content */}
                            <div className="relative min-h-[80px] sm:min-h-[450px]">
                                {sliderActivities.map((activity, index) => {
                                        const isOngoing = new Date(activity.date) <= new Date() && new Date(activity.date) >= new Date(new Date().setDate(new Date().getDate() - 7));
                                        const isUpcoming = new Date(activity.date) > new Date();

                                        return (
                                            <div
                                                key={activity.id}
                                                className={`transition-all duration-700 ease-out ${index === currentSlide
                                                    ? 'relative opacity-100 translate-x-0 z-20'
                                                    : 'absolute inset-0 opacity-0 -translate-x-8 z-10 pointer-events-none'
                                                    }`}
                                            >
                                                <div className="grid lg:grid-cols-12 gap-4 sm:gap-8 items-center">
                                                    {/* Text Content */}
                                                    <div className="lg:col-span-7 space-y-3 sm:space-y-6">
                                                        <div className="flex flex-wrap gap-3">
                                                            {isOngoing && (
                                                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-semibold backdrop-blur-sm">
                                                                    <span className="relative flex h-2 w-2">
                                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                                                    </span>
                                                                    SEDANG BERLANGSUNG
                                                                    {t('activities.ongoing')}
                                                                </span>
                                                            )}
                                                            {isUpcoming && (
                                                                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-semibold backdrop-blur-sm">
                                                                    <i className="fas fa-calendar-alt"></i>
                                                                    {t('activities.upcoming')}
                                                                </span>
                                                            )}
                                                            {activity.category && (
                                                                <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/20 text-slate-200 text-sm font-medium backdrop-blur-sm">
                                                                    {activity.category.name}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight drop-shadow-sm">
                                                            {activity.name}
                                                        </h1>

                                                        <div className="text-lg text-slate-300 line-clamp-3 leading-relaxed max-w-2xl">
                                                            {activity.description ? activity.description.replace(/<[^>]*>/g, '') : ''}
                                                        </div>

                                                        <div className="flex flex-wrap gap-6 text-slate-300 font-medium">
                                                            {activity.date && (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                                                        <i className="far fa-calendar-alt text-indigo-400"></i>
                                                                    </div>
                                                                    <span>{formatDateRange(activity.date, activity.end_date)}</span>
                                                                </div>
                                                            )}
                                                            {activity.location && (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                                                                        <i className="fas fa-map-marker-alt text-pink-400"></i>
                                                                    </div>
                                                                    <span>{activity.location}</span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap items-center gap-4 pt-4">
                                                            <Link
                                                                href={getActivityLink(activity)}
                                                                className="group relative inline-flex items-center gap-3 px-6 py-3 sm:px-8 sm:py-4 bg-white text-slate-900 rounded-xl font-bold shadow-xl hover:shadow-2xl hover:bg-indigo-50 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                                                            >
                                                                <span className="relative z-10">{t('activities.view_detail')}</span>
                                                                <i className="fas fa-arrow-right relative z-10 transition-transform group-hover:translate-x-1"></i>
                                                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                                            </Link>

                                                            <div className="flex flex-col relative group/price">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm text-slate-400 font-medium">{t('activities.ticket_price')}</span>
                                                                    {editMode && (
                                                                        <Link
                                                                            href={route('activity.edit', activity.id)}
                                                                            className="opacity-0 group-hover/price:opacity-100 transition-opacity text-xs bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-white"
                                                                            title="Edit Harga"
                                                                        >
                                                                            <i className="fas fa-cog"></i>
                                                                        </Link>
                                                                    )}
                                                                </div>
                                                                <div className="text-2xl font-bold">
                                                                    {activity.price > 0 ? (
                                                                        activity.show_price !== false ? (
                                                                            <span className="text-amber-400">
                                                                                Rp {Number(activity.price).toLocaleString('id-ID')}
                                                                            </span>
                                                                        ) : <span className="text-slate-500 text-lg">{t('activities.contact_committee')}</span>
                                                                    ) : (
                                                                        <span className="text-emerald-400">{t('activities.free')}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Image/Visual */}
                                                    <div className="lg:col-span-5 relative hidden lg:block">
                                                        <div className="relative group">
                                                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                                                            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-slate-800">
                                                                <img
                                                                    src={getImageUrl(activity)}
                                                                    alt={activity.name}
                                                                    className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
                                                                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_ACTIVITY_IMAGE; }}
                                                                />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none"></div>
                                                            </div>

                                                            {/* Floating Card Element Removed */}

                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                            </div>
                        ) : (
                            // Fallback State when no activities
                            <div className="text-center max-w-3xl mx-auto py-2 sm:py-10">
                                <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-6">
                                    {t('activities.title')}
                                </h1>
                                <p className="text-xl text-slate-300 mb-8 leading-relaxed">
                                    {t('activities.explore_desc')}
                                </p>
                                <div className="inline-flex gap-4">
                                    <button
                                        onClick={() => document.getElementById('latest-activities').scrollIntoView({ behavior: 'smooth' })}
                                        className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all"
                                    >
                                        {t('activities.view_detail')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Slider Navigation (Absolute to Hero) */}
                    {sliderActivities && sliderActivities.length > 1 && (
                        <div className="absolute bottom-3 sm:bottom-6 left-0 right-0 flex justify-center items-center gap-4 sm:gap-8 z-30 pointer-events-none">
                            <button
                                onClick={() => changeSlide(-1)}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all backdrop-blur-sm group pointer-events-auto"
                            >
                                <i className="fas fa-arrow-left transition-transform group-hover:-translate-x-1"></i>
                            </button>

                            <div className="flex gap-2 pointer-events-auto">
                                {sliderActivities.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => goToSlide(idx)}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide
                                            ? 'bg-white w-6 sm:w-8'
                                            : 'bg-white/30 w-3 sm:w-4 hover:bg-white/50'
                                            }`}
                                        aria-label={`Go to slide ${idx + 1}`}
                                    ></button>
                                ))}
                            </div>

                            <button
                                onClick={() => changeSlide(1)}
                                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-all backdrop-blur-sm group pointer-events-auto"
                            >
                                <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1"></i>
                            </button>
                        </div>
                    )}
                </div>

                {/* Latest Activities Section */}
                <section id="latest-activities" className="py-2 sm:py-10 container mx-auto px-4">
                    <h2 className="text-center text-3xl font-bold text-gray-900 mb-8">{t('activities.latest_activities')}</h2>

                    {latestActivities && latestActivities.data && latestActivities.data.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8">
                            {latestActivities.data.slice(0, 3).map((activity) => (
                                <div
                                    key={activity.id}
                                    className={`bg-white rounded-lg sm:rounded-xl shadow-sm sm:shadow-md overflow-hidden group activity-card-hover transition-all duration-300 h-full flex flex-col relative ${editMode ? 'border-2 border-yellow-400 ring-2 ring-yellow-400 ring-offset-2' : ''}`}
                                >
                                    {editMode && (
                                        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 flex space-x-1 sm:space-x-2">
                                            <Link
                                                href={route('activity.edit', activity.id)}
                                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-yellow-400 text-white rounded-lg shadow-lg hover:bg-yellow-500 hover:scale-110 transition-all duration-200"
                                                title="Edit Kegiatan"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <i className="fas fa-edit text-xs sm:text-base"></i>
                                            </Link>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    Swal.fire({
                                                        title: 'Hapus Kegiatan?',
                                                        text: "Data kegiatan akan dihapus permanen.",
                                                        icon: 'warning',
                                                        showCancelButton: true,
                                                        confirmButtonColor: '#d33',
                                                        cancelButtonColor: '#3085d6',
                                                        confirmButtonText: 'Ya, Hapus!',
                                                        cancelButtonText: 'Batal'
                                                    }).then((result) => {
                                                        if (result.isConfirmed) {
                                                            router.delete(route('activity.destroy', activity.id), {
                                                                preserveScroll: true,
                                                            });
                                                        }
                                                    });
                                                }}
                                                className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-danger text-white rounded-lg shadow-lg hover:bg-danger/90 hover:scale-110 transition-all duration-200"
                                                title="Hapus Kegiatan"
                                            >
                                                <i className="fas fa-trash text-xs sm:text-base"></i>
                                            </button>
                                        </div>
                                    )}
                                    <Link href={getActivityLink(activity)} className="flex flex-col h-full">
                                        <div className="relative aspect-video sm:aspect-auto sm:h-48 overflow-hidden bg-gray-100">
                                            <img
                                                src={getImageUrl(activity)}
                                                alt={activity.name}
                                                loading="lazy"
                                                className="w-full h-full object-cover sm:object-cover transition-transform duration-500 group-hover:scale-110"
                                                onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_ACTIVITY_IMAGE; }}
                                            />
                                            <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-gray-800 shadow-sm hidden sm:block">
                                                {activity.category ? activity.category.name : 'Event'}
                                            </div>
                                            {/* Mobile Label Overlay - Optional but helps identify */}
                                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[8px] text-white font-medium sm:hidden">
                                                {activity.category?.name || 'Kegiatan'}
                                            </div>
                                        </div>

                                        <div className="p-6 flex-grow hidden md:flex flex-col">
                                            <div className="flex items-center text-xs text-gray-500 mb-3 gap-3">
                                                <span className="flex items-center gap-1">
                                                    <i className="far fa-calendar-alt text-primary"></i>
                                                    {formatDateRange(activity.date, activity.end_date) || '-'}
                                                </span>
                                                {activity.activity_type !== 'non_batch' && activity.active_batch && (
                                                    <span className="bg-primary/10 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                                                        {activity.active_batch.name}
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                                {activity.name}
                                            </h3>

                                            <p className="text-sm text-gray-600 mb-4 flex-grow line-clamp-2">
                                                {activity.description ? activity.description.replace(/<[^>]*>/g, '') : ''}
                                            </p>

                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                                                <div className="text-sm font-bold">
                                                    {activity.price > 0 ? (
                                                        activity.show_price !== false ? (
                                                            <span className="text-primary">Rp {Number(activity.price).toLocaleString('id-ID')}</span>
                                                        ) : null
                                                    ) : (
                                                        <span className="text-success">GRATIS</span>
                                                    )}
                                                </div>
                                                <span className="text-xs font-medium text-gray-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                    {t('activities.view_detail')} <i className="fas fa-arrow-right"></i>
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6 sm:py-12">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                                <i className="fas fa-calendar-alt text-4xl text-gray-400"></i>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('activities.no_latest_activities')}</h3>
                            <p className="text-gray-600">{t('activities.no_latest_activities')}</p>
                        </div>
                    )}
                </section>

                {/* All Activities Section */}
                <section className="py-2 sm:py-10 bg-gray-100/50">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-4 sm:mb-10">
                            <h2 className="text-3xl font-bold text-gray-900 mb-3">{t('activities.all_activities')}</h2>
                            <p className="text-gray-600">{t('activities.explore_desc')}</p>
                        </div>

                        {/* Search Box */}
                        <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
                            <form onSubmit={handleSearch} className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl opacity-20 group-hover:opacity-40 transition-opacity blur-md"></div>
                                <div className="relative bg-white rounded-xl shadow-lg flex items-center overflow-hidden border border-gray-200 focus-within:border-primary transition-colors">
                                    <div className="pl-6 text-gray-400">
                                        <i className="fas fa-search text-lg"></i>
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-4 outline-none text-gray-700 bg-transparent placeholder-gray-400"
                                        placeholder={t('activities.search_placeholder')}
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold hover:shadow-lg transition-all duration-300"
                                        disabled={isSearching}
                                    >
                                        {isSearching ? <i className="fas fa-spinner fa-spin"></i> : t('activities.search')}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Activities Grid */}
                        {latestActivities && latestActivities.data && latestActivities.data.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-8">
                                {latestActivities.data.map((activity) => (
                                    <div
                                        key={activity.id}
                                        className={`bg-white rounded-lg sm:rounded-xl shadow-sm sm:shadow-md overflow-hidden group activity-card-hover transition-all duration-300 h-full flex flex-col border border-gray-100 relative ${editMode ? 'border-2 border-yellow-400 ring-2 ring-yellow-400 ring-offset-2' : ''}`}
                                    >
                                        {editMode && (
                                            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 flex space-x-1 sm:space-x-2">
                                                <Link
                                                    href={route('activity.edit', activity.id)}
                                                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-warning text-white rounded-lg shadow-lg hover:bg-warning/90 hover:scale-110 transition-all duration-200"
                                                    title="Edit Kegiatan"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <i className="fas fa-edit text-xs sm:text-base"></i>
                                                </Link>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        Swal.fire({
                                                            title: 'Hapus Kegiatan?',
                                                            text: "Data kegiatan akan dihapus permanen.",
                                                            icon: 'warning',
                                                            showCancelButton: true,
                                                            confirmButtonColor: '#d33',
                                                            cancelButtonColor: '#3085d6',
                                                            confirmButtonText: 'Ya, Hapus!',
                                                            cancelButtonText: 'Batal'
                                                        }).then((result) => {
                                                            if (result.isConfirmed) {
                                                                router.delete(route('activity.destroy', activity.id), {
                                                                    preserveScroll: true,
                                                                });
                                                            }
                                                        });
                                                    }}
                                                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 hover:scale-110 transition-all duration-200"
                                                    title="Hapus Kegiatan"
                                                >
                                                    <i className="fas fa-trash text-xs sm:text-base"></i>
                                                </button>
                                            </div>
                                        )}
                                        <Link href={getActivityLink(activity)} className="flex flex-col h-full">
                                            <div className="relative aspect-video sm:aspect-auto sm:h-48 overflow-hidden bg-gray-100">
                                                <img
                                                    src={getImageUrl(activity)}
                                                    alt={activity.name}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover sm:object-cover transition-transform duration-500 group-hover:scale-110"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_ACTIVITY_IMAGE; }}
                                                />
                                                <div className="absolute top-2 left-2 sm:top-4 sm:left-4 bg-white/90 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-gray-800 shadow-sm hidden sm:block">
                                                    {activity.category ? activity.category.name : 'Event'}
                                                </div>
                                                {/* Mobile Label Overlay */}
                                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[8px] text-white font-medium sm:hidden">
                                                    {activity.category?.name || 'Kegiatan'}
                                                </div>
                                            </div>

                                            <div className="p-6 flex-grow hidden md:flex flex-col">
                                                <div className="flex items-center text-xs text-gray-500 mb-3 gap-3">
                                                    <span className="flex items-center gap-1">
                                                        <i className="far fa-calendar-alt text-primary"></i>
                                                        {formatDateRange(activity.date, activity.end_date) || '-'}
                                                    </span>
                                                    {activity.activity_type !== 'non_batch' && activity.active_batch && (
                                                        <span className="bg-primary/10 text-purple-700 px-2 py-0.5 rounded-full font-semibold">
                                                            {activity.active_batch.name}
                                                        </span>
                                                    )}
                                                </div>

                                                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                                                    {activity.name}
                                                </h3>

                                                <p className="text-sm text-gray-600 mb-4 flex-grow line-clamp-2">
                                                    {activity.description ? activity.description.replace(/<[^>]*>/g, '') : ''}
                                                </p>

                                                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                                                    <div className="text-sm font-bold">
                                                        {activity.price > 0 ? (
                                                            activity.show_price !== false ? (
                                                                <span className="text-primary">Rp {Number(activity.price).toLocaleString('id-ID')}</span>
                                                            ) : null
                                                        ) : (
                                                            <span className="text-green-600">GRATIS</span>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-500 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                                        {t('activities.view_detail')} <i className="fas fa-arrow-right"></i>
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 sm:py-8 bg-white rounded-3xl shadow-sm border border-gray-100">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                                    <i className="fas fa-search text-4xl text-gray-400"></i>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('activities.no_activities_found')}</h3>
                                <p className="text-gray-600">{t('activities.try_different_keyword')}</p>
                            </div>
                        )}

                        {/* Pagination */}
                        {latestActivities && latestActivities.links && latestActivities.links.length > 3 && (
                            <div className="mt-4 sm:mt-10 flex justify-center">
                                <div className="flex flex-wrap gap-2">
                                    {latestActivities.links.map((link, i) => (
                                        link.url ? (
                                            <Link
                                                key={i}
                                                href={link.url}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${link.active
                                                    ? 'bg-primary text-white shadow-md'
                                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                                    }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ) : (
                                            <span
                                                key={i}
                                                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed"
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        )
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
                {/* Shape Editor Toggle - Only visible in Edit Mode */}
                {editMode && (
                    <>
                        <button
                            onClick={() => setShowShapeEditor(!showShapeEditor)}
                            className="fixed bottom-4 right-4 z-50 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
                            title="Edit Hero Shapes"
                        >
                            <i className={`fas ${showShapeEditor ? 'fa-times' : 'fa-pen-fancy'}`}></i>
                        </button>

                        {/* Shape Editor Panel */}
                        {showShapeEditor && (
                            <div className="fixed bottom-20 right-4 z-50 bg-white p-4 rounded-xl shadow-2xl w-80 border border-slate-200 max-h-[80vh] overflow-y-auto">
                                <h3 className="font-bold text-slate-800 mb-4 flex justify-between items-center">
                                    Shape Settings
                                    <button
                                        onClick={() => {
                                            Swal.fire({
                                                title: 'Reset Settings?',
                                                text: "Semua pengaturan tampilan akan dikembalikan ke default.",
                                                icon: 'warning',
                                                showCancelButton: true,
                                                confirmButtonColor: '#d33',
                                                cancelButtonColor: '#3085d6',
                                                confirmButtonText: 'Ya, Reset!',
                                                cancelButtonText: 'Batal'
                                            }).then((result) => {
                                                if (result.isConfirmed) {
                                                    localStorage.removeItem('heroShapeSettings_v5');
                                                    window.location.reload();
                                                }
                                            });
                                        }}
                                        className="text-xs text-red-500 hover:text-red-700"
                                    >
                                        Reset
                                    </button>
                                </h3>

                                {/* Middle/Background Shape Controls */}
                                <div className="mb-6 space-y-3">
                                    <h4 className="font-semibold text-slate-700 text-sm border-b pb-1">Middle / Background</h4>

                                    <div>
                                        <label className="text-xs text-slate-600 block mb-1">Opacity ({shapeSettings.middle?.opacity})</label>
                                        <input
                                            type="range"
                                            min="0" max="1" step="0.1"
                                            value={shapeSettings.middle?.opacity ?? 1}
                                            onChange={e => setShapeSettings(prev => ({
                                                ...prev, middle: { ...prev.middle, opacity: parseFloat(e.target.value) }
                                            }))}
                                            className="w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-600 block mb-1">Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={shapeSettings.middle?.color || '#0f172a'}
                                                onChange={e => setShapeSettings(prev => ({
                                                    ...prev, middle: { ...prev.middle, color: e.target.value }
                                                }))}
                                                className="h-8 w-12 cursor-pointer"
                                            />
                                            <input
                                                type="text"
                                                value={shapeSettings.middle?.color || '#0f172a'}
                                                onChange={e => setShapeSettings(prev => ({
                                                    ...prev, middle: { ...prev.middle, color: e.target.value }
                                                }))}
                                                className="flex-1 text-xs border rounded px-2"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Left Shape Controls */}
                                <div className="mb-6 space-y-3">
                                    <h4 className="font-semibold text-slate-700 text-sm border-b pb-1">Left Shape</h4>

                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-slate-600">Visible</label>
                                        <input
                                            type="checkbox"
                                            checked={shapeSettings.left.visible}
                                            onChange={e => setShapeSettings(prev => ({
                                                ...prev, left: { ...prev.left, visible: e.target.checked }
                                            }))}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-600 block mb-1">Width ({shapeSettings.left.width}%)</label>
                                        <input
                                            type="range"
                                            min="0" max="50"
                                            value={shapeSettings.left.width}
                                            onChange={e => setShapeSettings(prev => ({
                                                ...prev, left: { ...prev.left, width: e.target.value }
                                            }))}
                                            className="w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-600 block mb-1">Opacity ({shapeSettings.left.opacity})</label>
                                        <input
                                            type="range"
                                            min="0" max="1" step="0.1"
                                            value={shapeSettings.left.opacity}
                                            onChange={e => setShapeSettings(prev => ({
                                                ...prev, left: { ...prev.left, opacity: parseFloat(e.target.value) }
                                            }))}
                                            className="w-full"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs text-slate-600 block mb-1">Color</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={shapeSettings.left.color}
                                        onChange={e => setShapeSettings(prev => ({
                                            ...prev, left: { ...prev.left, color: e.target.value }
                                        }))}
                                        className="h-8 w-12 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={shapeSettings.left.color}
                                        onChange={e => setShapeSettings(prev => ({
                                            ...prev, left: { ...prev.left, color: e.target.value }
                                        }))}
                                        className="flex-1 text-xs border rounded px-2"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-600 block mb-1">Clip Path (Polygon)</label>
                                <textarea
                                    value={shapeSettings.left.clipPath}
                                    onChange={e => setShapeSettings(prev => ({
                                        ...prev, left: { ...prev.left, clipPath: e.target.value }
                                    }))}
                                    className="w-full text-xs border rounded p-1 h-16 font-mono"
                                />
                            </div>
                        </div>

                        {/* Right Shape Controls */}
                        <div className="mb-4 space-y-3">
                            <h4 className="font-semibold text-slate-700 text-sm border-b pb-1">Right Shape</h4>

                            <div className="flex items-center justify-between">
                                <label className="text-xs text-slate-600">Visible</label>
                                <input
                                    type="checkbox"
                                    checked={shapeSettings.right.visible}
                                    onChange={e => setShapeSettings(prev => ({
                                        ...prev, right: { ...prev.right, visible: e.target.checked }
                                    }))}
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-600 block mb-1">Width ({shapeSettings.right.width}%)</label>
                                <input
                                    type="range"
                                    min="0" max="50"
                                    value={shapeSettings.right.width}
                                    onChange={e => setShapeSettings(prev => ({
                                        ...prev, right: { ...prev.right, width: e.target.value }
                                    }))}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-600 block mb-1">Opacity ({shapeSettings.right.opacity})</label>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.1"
                                    value={shapeSettings.right.opacity}
                                    onChange={e => setShapeSettings(prev => ({
                                        ...prev, right: { ...prev.right, opacity: parseFloat(e.target.value) }
                                    }))}
                                    className="w-full"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-slate-600 block mb-1">Color</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={shapeSettings.right.color}
                                        onChange={e => setShapeSettings(prev => ({
                                            ...prev, right: { ...prev.right, color: e.target.value }
                                        }))}
                                        className="h-8 w-12 cursor-pointer"
                                    />
                                    <input
                                        type="text"
                                        value={shapeSettings.right.color}
                                        onChange={e => setShapeSettings(prev => ({
                                            ...prev, right: { ...prev.right, color: e.target.value }
                                        }))}
                                        className="flex-1 text-xs border rounded px-2"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-slate-600 block mb-1">Clip Path (Polygon)</label>
                                <textarea
                                    value={shapeSettings.right.clipPath}
                                    onChange={e => setShapeSettings(prev => ({
                                        ...prev, right: { ...prev.right, clipPath: e.target.value }
                                    }))}
                                    className="w-full text-xs border rounded p-1 h-16 font-mono"
                                />
                            </div>
                        </div>

                        <div className="text-[10px] text-slate-400 mt-4 text-center">
                            Settings saved locally
                        </div>
                    </div>
                )}
                </>
            )}
            </div>
        </WebLayout>
    );
}
