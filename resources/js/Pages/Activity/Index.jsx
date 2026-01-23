import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import PageHero from '@/Components/PageHero';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function Index({ latestActivities, sliderActivities, enrolledActivityIds = [], enrolledActivityBatches = [] }) {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [search, setSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        // Initial check
        const storedMode = localStorage.getItem('editMode') === 'true';
        setEditMode(storedMode);

        // Listen for changes
        const handleEditModeChange = () => {
            const newMode = localStorage.getItem('editMode') === 'true';
            setEditMode(newMode);
        };

        window.addEventListener('editModeChanged', handleEditModeChange);
        return () => window.removeEventListener('editModeChanged', handleEditModeChange);
    }, []);
    
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

    const getImageUrl = (activity) => {
        if (!activity.image) return '/assets/images/begron/defoult.png';
        if (activity.image.startsWith('http')) return activity.image;
        const cleanImagePath = activity.image.replace('activities/', '');
        // Note: In React we can't check file existence on server easily without prop data.
        // We assume the URL provided by backend is correct or fallback to default on error.
        // However, for now we mimic the path construction:
        return `/storage/activities/${cleanImagePath}`;
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

    return (
        <WebLayout hasHeaderSpacer={false}>
            <Head title="Jelajahi Aktivitas" />



            <div className="bg-gray-50 min-h-screen pb-12">
                {/* Hero Section */}
                <PageHero 
                    title="Jelajahi Aktivitas" 
                    description="Temukan berbagai kegiatan menarik dan seru untuk diikuti bersama kami."
                >
                    {sliderActivities && sliderActivities.length > 0 && (
                        <div className="mt-8 relative w-full text-left max-w-6xl mx-auto">
                            <div className="relative min-h-[500px] lg:min-h-[400px]">
                                {sliderActivities.map((activity, index) => {
                                    const isOngoing = new Date(activity.date) <= new Date() && new Date(activity.date) >= new Date(new Date().setDate(new Date().getDate() - 7));
                                    const isUpcoming = new Date(activity.date) > new Date();
                                    
                                    return (
                                        <div 
                                            key={activity.id} 
                                            className={`absolute inset-0 transition-all duration-700 ease-in-out ${index === currentSlide ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-4 z-0 pointer-events-none'}`}
                                        >
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center w-full h-full">
                                                <div className="text-white space-y-6 py-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {isOngoing && (
                                                            <span className="bg-success/90 text-white px-4 py-1.5 rounded-full text-xs md:text-sm font-bold shadow-sm backdrop-blur-sm flex items-center gap-2">
                                                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                                                SEDANG BERLANGSUNG
                                                            </span>
                                                        )}
                                                        {isUpcoming && (
                                                            <span className="bg-info/90 text-white px-4 py-1.5 rounded-full text-xs md:text-sm font-bold shadow-sm backdrop-blur-sm flex items-center gap-2">
                                                                <i className="fas fa-calendar-alt"></i>
                                                                AKAN DATANG
                                                            </span>
                                                        )}
                                                        {activity.category && (
                                                            <span className="bg-white/20 text-white px-4 py-1.5 rounded-full text-xs md:text-sm font-bold backdrop-blur-sm border border-white/30">
                                                                {activity.category.name}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight drop-shadow-md line-clamp-2">
                                                        {activity.name}
                                                    </h2>

                                                    <div className="text-base md:text-lg text-white/90 line-clamp-3 leading-relaxed max-w-xl">
                                                        {activity.description ? activity.description.replace(/<[^>]*>/g, '') : ''}
                                                    </div>

                                                    <div className="flex flex-wrap gap-4 text-sm font-medium text-white/90">
                                                        {activity.date && (
                                                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                                                                <i className="far fa-calendar-alt"></i>
                                                                <span>{format(new Date(activity.date), 'd MMM yyyy', { locale: id })}</span>
                                                            </div>
                                                        )}
                                                        {activity.location && (
                                                            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg">
                                                                <i className="fas fa-map-marker-alt"></i>
                                                                <span>{activity.location}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-4 pt-2">
                                                        <Link 
                                                            href={getActivityLink(activity)}
                                                            className="bg-white text-gray-900 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-gray-100 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                                                        >
                                                            <i className="fas fa-info-circle"></i>
                                                            LIHAT DETAIL
                                                        </Link>
                                                        
                                                        <div className="text-xl font-bold">
                                                            {activity.price > 0 ? (
                                                                activity.show_price !== false ? (
                                                                    <span className="text-warning drop-shadow-md">
                                                                        Rp {Number(activity.price).toLocaleString('id-ID')}
                                                                    </span>
                                                                ) : null
                                                            ) : (
                                                                <span className="text-success drop-shadow-md">GRATIS</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="hidden lg:block h-full relative group">
                                                    <div className="absolute inset-0 bg-white/10 rounded-2xl transform rotate-3 scale-105 transition-transform group-hover:rotate-6"></div>
                                                    <img 
                                                        src={getImageUrl(activity)} 
                                                        alt={activity.name}
                                                        className="relative rounded-2xl shadow-2xl w-full h-[350px] object-cover transform transition-transform group-hover:scale-[1.02]"
                                                        onError={(e) => { e.target.src = '/assets/images/begron/defoult.png'; }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Slider Controls */}
                            {sliderActivities.length > 1 && (
                                <div className="absolute top-1/2 -translate-y-1/2 -left-4 -right-4 flex justify-between pointer-events-none">
                                    <button 
                                        onClick={() => changeSlide(-1)}
                                        className="pointer-events-auto w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors border border-white/50 backdrop-blur-sm"
                                    >
                                        <i className="fas fa-chevron-left"></i>
                                    </button>
                                    <button 
                                        onClick={() => changeSlide(1)}
                                        className="pointer-events-auto w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors border border-white/50 backdrop-blur-sm"
                                    >
                                        <i className="fas fa-chevron-right"></i>
                                    </button>
                                </div>
                            )}
                            
                            {sliderActivities.length > 1 && (
                                <div className="flex justify-center gap-2 mt-4">
                                    {sliderActivities.map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => goToSlide(idx)}
                                            className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'bg-white w-8' : 'bg-white/40 w-2 hover:bg-white/60'}`}
                                        ></button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </PageHero>

                {/* Latest Activities Section */}
                <section className="py-12 container mx-auto px-4">
                    <h2 className="text-center text-3xl font-bold text-gray-900 mb-8">Kegiatan Terbaru</h2>
                    
                    {latestActivities && latestActivities.data && latestActivities.data.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {latestActivities.data.slice(0, 3).map((activity) => (
                                <div 
                                    key={activity.id}
                                    className={`bg-white rounded-xl shadow-md overflow-hidden group activity-card-hover transition-all duration-300 h-full flex flex-col relative ${editMode ? 'border-2 border-yellow-400 ring-2 ring-yellow-400 ring-offset-2' : ''}`}
                                >
                                    {editMode && (
                                        <div className="absolute top-4 right-4 z-30 flex space-x-2">
                                            <Link 
                                                href={route('activity.edit', activity.id)} 
                                                className="w-10 h-10 flex items-center justify-center bg-yellow-400 text-white rounded-xl shadow-lg hover:bg-yellow-500 hover:scale-110 transition-all duration-200"
                                                title="Edit Kegiatan"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <i className="fas fa-edit"></i>
                                            </Link>
                                            <button 
                                                onClick={(e) => { 
                                                    e.preventDefault(); 
                                                    e.stopPropagation();
                                                    if(confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) {
                                                        router.delete(route('activity.destroy', activity.id), {
                                                            preserveScroll: true,
                                                        });
                                                    }
                                                }} 
                                                className="w-10 h-10 flex items-center justify-center bg-danger text-white rounded-xl shadow-lg hover:bg-danger/90 hover:scale-110 transition-all duration-200"
                                                title="Hapus Kegiatan"
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    )}
                                    <Link href={getActivityLink(activity)} className="flex flex-col h-full">
                                    <div className="relative h-48 overflow-hidden bg-gray-200">
                                        <img 
                                            src={getImageUrl(activity)} 
                                            alt={activity.name}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            onError={(e) => { e.target.src = '/assets/images/begron/defoult.png'; }}
                                        />
                                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm">
                                            {activity.category ? activity.category.name : 'Event'}
                                        </div>
                                    </div>
                                    
                                    <div className="p-6 flex-grow flex flex-col">
                                        <div className="flex items-center text-xs text-gray-500 mb-3 gap-3">
                                            <span className="flex items-center gap-1">
                                                <i className="far fa-calendar-alt text-primary"></i>
                                                {activity.date ? format(new Date(activity.date), 'd MMM yyyy') : '-'}
                                            </span>
                                            {activity.active_batch && (
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
                                                Lihat Detail <i className="fas fa-arrow-right"></i>
                                            </span>
                                        </div>
                                    </div>
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                                <i className="fas fa-calendar-alt text-4xl text-gray-400"></i>
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">Tidak ada kegiatan terbaru</h3>
                            <p className="text-gray-600">Belum ada kegiatan yang tersedia saat ini.</p>
                        </div>
                    )}
                </section>

                {/* All Activities Section */}
                <section className="py-12 bg-gray-100/50">
                    <div className="container mx-auto px-4">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-bold text-gray-900 mb-3">Semua Kegiatan</h2>
                            <p className="text-gray-600">Temukan berbagai kegiatan menarik yang dapat Anda ikuti</p>
                        </div>

                        {/* Search Box */}
                        <div className="max-w-2xl mx-auto mb-12">
                            <form onSubmit={handleSearch} className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-xl opacity-20 group-hover:opacity-40 transition-opacity blur-md"></div>
                                <div className="relative bg-white rounded-xl shadow-lg flex items-center overflow-hidden border border-gray-200 focus-within:border-primary transition-colors">
                                    <div className="pl-6 text-gray-400">
                                        <i className="fas fa-search text-lg"></i>
                                    </div>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-4 outline-none text-gray-700 bg-transparent placeholder-gray-400"
                                        placeholder="Cari kegiatan berdasarkan nama, lokasi, atau kategori..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                    <button 
                                        type="submit" 
                                        className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold hover:shadow-lg transition-all duration-300"
                                        disabled={isSearching}
                                    >
                                        {isSearching ? <i className="fas fa-spinner fa-spin"></i> : 'Cari'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Activities Grid */}
                        {latestActivities && latestActivities.data && latestActivities.data.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                {latestActivities.data.map((activity) => (
                                    <div 
                                        key={activity.id}
                                        className={`bg-white rounded-xl shadow-md overflow-hidden group activity-card-hover transition-all duration-300 h-full flex flex-col border border-gray-100 relative ${editMode ? 'border-2 border-yellow-400 ring-2 ring-yellow-400 ring-offset-2' : ''}`}
                                    >
                                        {editMode && (
                                            <div className="absolute top-4 right-4 z-30 flex space-x-2">
                                                <Link 
                                                    href={route('activity.edit', activity.id)} 
                                                    className="w-10 h-10 flex items-center justify-center bg-warning text-white rounded-xl shadow-lg hover:bg-warning/90 hover:scale-110 transition-all duration-200"
                                                    title="Edit Kegiatan"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </Link>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.preventDefault(); 
                                                        e.stopPropagation();
                                                        if(confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) {
                                                            router.delete(route('activity.destroy', activity.id), {
                                                                preserveScroll: true,
                                                            });
                                                        }
                                                    }} 
                                                    className="w-10 h-10 flex items-center justify-center bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 hover:scale-110 transition-all duration-200"
                                                    title="Hapus Kegiatan"
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        )}
                                        <Link href={getActivityLink(activity)} className="flex flex-col h-full">
                                        <div className="relative h-48 overflow-hidden bg-gray-200">
                                            <img 
                                                src={getImageUrl(activity)} 
                                                alt={activity.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                onError={(e) => { e.target.src = '/assets/images/begron/defoult.png'; }}
                                            />
                                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-gray-800 shadow-sm">
                                                {activity.category ? activity.category.name : 'Event'}
                                            </div>
                                        </div>
                                        
                                        <div className="p-6 flex-grow flex flex-col">
                                            <div className="flex items-center text-xs text-gray-500 mb-3 gap-3">
                                                <span className="flex items-center gap-1">
                                                    <i className="far fa-calendar-alt text-primary"></i>
                                                    {activity.date ? format(new Date(activity.date), 'd MMM yyyy') : '-'}
                                                </span>
                                                {activity.active_batch && (
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
                                                    Lihat Detail <i className="fas fa-arrow-right"></i>
                                                </span>
                                            </div>
                                        </div>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white rounded-3xl shadow-sm border border-gray-100">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                                    <i className="fas fa-search text-4xl text-gray-400"></i>
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Tidak ditemukan kegiatan</h3>
                                <p className="text-gray-600">Coba cari dengan kata kunci lain.</p>
                            </div>
                        )}
                        
                        {/* Pagination */}
                        {latestActivities && latestActivities.links && latestActivities.links.length > 3 && (
                            <div className="mt-12 flex justify-center">
                                <div className="flex flex-wrap gap-2">
                                    {latestActivities.links.map((link, i) => (
                                        link.url ? (
                                            <Link
                                                key={i}
                                                href={link.url}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                    link.active
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
            </div>
        </WebLayout>
    );
}

