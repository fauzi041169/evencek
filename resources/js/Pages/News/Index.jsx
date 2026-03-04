import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

// Custom Hook for CountUp Animation (Copied from Home)
const CountUp = ({ end, duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const countRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    const endInt = parseInt(end, 10);
                    let startTime = null;

                    const animate = (currentTime) => {
                        if (!startTime) startTime = currentTime;
                        const progress = Math.min((currentTime - startTime) / duration, 1);
                        setCount(Math.floor(progress * endInt));

                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        }
                    };

                    requestAnimationFrame(animate);
                    observer.disconnect();
                }
            },
            { threshold: 0.5 }
        );

        if (countRef.current) {
            observer.observe(countRef.current);
        }

        return () => observer.disconnect();
    }, [end, duration]);

    return <span ref={countRef}>{count}</span>;
};

// Intersection Observer for Reveal Animations (Copied from Home)
const Reveal = ({ children, className = '', direction = 'up' }) => {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, []);

    let revealClass = 'reveal';
    if (direction === 'left') revealClass = 'reveal-left';
    if (direction === 'right') revealClass = 'reveal-right';
    if (direction === 'pop') revealClass = 'reveal-pop';

    return (
        <div ref={ref} className={`${revealClass} ${isVisible ? 'show' : ''} ${className}`}>
            {children}
        </div>
    );
};

export default function Index({ featuredNews, allNews, totalNews, categories, latestNews }) {
    // Merge latestNews into allNews if provided (from search method)
    const newsList = latestNews || allNews;
    const { url, props } = usePage();
    const { appSettings } = props;
    const heroAnim = appSettings?.hero_animation_style || 'circles';

    // Helper for hex to rgba
    const hexToRgba = (hex, alpha) => {
        if (!hex) return `rgba(124, 58, 237, ${alpha})`; // default purple
        let c;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split('');
            if (c.length == 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = '0x' + c.join('');
            return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
        }
        return hex;
    }

    const [searchQuery, setSearchQuery] = useState(new URLSearchParams(window.location.search).get('query') || '');
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

    const handleSearch = (e) => {
        e.preventDefault();
        router.get(route('news.search'), { query: searchQuery }, { preserveState: true });
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return format(new Date(date), 'd MMMM yyyy', { locale: id });
    };

    const getImageUrl = (image) => {
        if (!image) return '/assets/images/hero/defoult.webp';
        if (image.startsWith('http')) return image;

        let cleanPath = image.startsWith('/') ? image.substring(1) : image;

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

    return (
        <WebLayout hasHeaderSpacer={false} fluid={true} noPadding={true}>
            <Head title="Berita & Artikel" />
            <style>{`
                .reveal{opacity:0;transform:translateY(16px) scale(.98);transition:opacity .6s ease,transform .6s ease}
                .reveal.show{opacity:1;transform:translateY(0) scale(1)}
                .reveal-left{opacity:0;transform:translateX(-16px);transition:opacity .6s ease,transform .6s ease}
                .reveal-left.show{opacity:1;transform:translateX(0)}
                .reveal-right{opacity:0;transform:translateX(16px);transition:opacity .6s ease,transform .6s ease}
                .reveal-right.show{opacity:1;transform:translateX(0)}
                .reveal-pop{opacity:0;transform:translateY(18px) scale(.96);transition:opacity .6s ease,transform .6s ease}
                .reveal-pop.show{opacity:1;transform:translateY(0) scale(1)}
                .hero-gradient-overlay {
                    position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.6));
                }
                .hero-gradient-overlay-top {
                    position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.3), transparent);
                }
                
                /* Animations */
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob { animation: blob 10s infinite; }
                .animation-delay-2000 { animation-delay: 2s; }
                
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

                .hero-grow {
                    position: relative;
                    background-color: #1a1b3a; /* Deep Blue */
                    overflow: hidden;
                    font-family: 'Plus Jakarta Sans', sans-serif;
                }
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
                .yellow-shape-wrapper {
                    position: absolute;
                    bottom: 0;
                    right: 0;
                    width: 45%;
                    height: 85%;
                    z-index: 10;
                }
                .yellow-shape {
                    width: 100%;
                    height: 100%;
                    background-color: #FFB800;
                    border-top-left-radius: 100px;
                    position: relative;
                }
                .image-container {
                    position: absolute;
                    top: 25px;
                    left: 25px;
                    right: 0;
                    bottom: 0;
                    background-color: #e5e7eb;
                    border-top-left-radius: 80px;
                    overflow: hidden;
                }
                @media (max-width: 1024px) {
                    .curve-top-right { display: none; }
                    .yellow-shape-wrapper {
                        position: relative;
                        width: 100%;
                        height: 400px;
                        margin-top: 2rem;
                        border-radius: 40px;
                        overflow: hidden;
                    }
                    .yellow-shape { border-radius: 40px; }
                    .image-container {
                        top: 15px; left: 15px; right: 15px; bottom: 15px;
                        width: auto; height: auto; border-radius: 30px;
                    }
                }
            `}</style>

            <div className="relative" style={{ fontFamily: "'Inter','Poppins','Montserrat',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans','Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol'" }}>

                {/* Hero Section */}
                <div className="relative bg-slate-900 overflow-hidden min-h-[120px] sm:min-h-[500px] flex items-center">
                    {/* Background Elements */}
                    <div className="absolute inset-0">
                        {/* Gradient Overlay - Adjusted for better visibility of background image */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 z-10"></div>
                        <img
                            src={appSettings?.hero_background_1 ? getImageUrl(appSettings.hero_background_1) : "/assets/images/begron/bg-pattern.png"}
                            alt="Background Pattern"
                            className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                            onError={(e) => e.target.style.display = 'none'}
                        />
                        {/* Dynamic Animations based on Settings */}
                        {(heroAnim === 'circles' || heroAnim === 'blob' || !heroAnim) && (
                            <>
                                <div
                                    className="absolute top-[-10%] right-[-5%] w-96 h-96 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob z-10 pointer-events-none"
                                    style={{ backgroundColor: hexToRgba(appSettings?.colors?.primary, 0.2) }}
                                ></div>
                                <div
                                    className="absolute bottom-[-10%] left-[-5%] w-96 h-96 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000 z-10 pointer-events-none"
                                    style={{ backgroundColor: hexToRgba(appSettings?.colors?.secondary, 0.2) }}
                                ></div>
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

                    <div className="relative z-20 container mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-6">
                        <div className="text-center max-w-3xl mx-auto">
                            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4 sm:mb-6 drop-shadow-sm">
                                Berita & Artikel
                            </h1>
                            <p className="text-xl text-slate-300 mb-6 sm:mb-10 leading-relaxed">
                                Informasi terbaru seputar kegiatan dan event terkini untuk Anda.
                            </p>

                            {/* Search Box adapted for Hero */}
                            <div className="max-w-2xl mx-auto relative group">
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl opacity-30 group-hover:opacity-50 transition-opacity blur-md"></div>
                                <form onSubmit={handleSearch} className="relative bg-white/10 backdrop-blur-md rounded-xl shadow-2xl flex items-center overflow-hidden border border-white/20 focus-within:border-white/40 transition-colors">
                                    <div className="pl-6 text-indigo-300">
                                        <i className="fas fa-search text-lg"></i>
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-4 outline-none text-white bg-transparent placeholder-slate-400 font-medium"
                                        placeholder="Cari berita atau artikel..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all duration-300 flex items-center gap-2"
                                    >
                                        <span>Cari</span>
                                        <i className="fas fa-arrow-right"></i>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <section className="py-3 sm:py-6 bg-white relative z-10 -mt-8 mx-4 sm:mx-8 rounded-3xl shadow-xl border border-gray-100 max-w-5xl lg:mx-auto">
                    <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16">
                        <Reveal direction="up" className="flex items-center gap-4">
                            <div
                                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-secondary ring-1"
                                style={{ backgroundColor: hexToRgba(appSettings?.colors?.secondary, 0.05), '--tw-ring-color': hexToRgba(appSettings?.colors?.secondary, 0.1) }}
                            >
                                <i className="far fa-newspaper text-2xl"></i>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-gray-900">
                                    <CountUp end={totalNews || 0} />
                                </div>
                                <div className="text-sm font-semibold text-gray-500">Total Berita</div>
                            </div>
                        </Reveal>

                        <div className="hidden sm:block w-px h-12 bg-gray-200"></div>

                        <Reveal direction="up" className="flex items-center gap-4" delay={100}>
                            <div
                                className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-primary ring-1"
                                style={{ backgroundColor: hexToRgba(appSettings?.colors?.primary, 0.1), '--tw-ring-color': hexToRgba(appSettings?.colors?.primary, 0.2) }}
                            >
                                <i className="fas fa-tags text-2xl"></i>
                            </div>
                            <div>
                                <div className="text-3xl font-black text-gray-900">
                                    <CountUp end={categories ? categories.length : 0} />
                                </div>
                                <div className="text-sm font-semibold text-gray-500">Kategori</div>
                            </div>
                        </Reveal>
                    </div>
                </section>

                <div className="py-2 sm:py-6 min-h-screen bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Header & Search removed from here as it is now in Hero */}

                        {/* Featured News (Only show on main index, not search results) */}
                        {!latestNews && featuredNews && featuredNews.length > 0 && (
                            <div className="mb-4 sm:mb-8">
                                <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-secondary pl-3">
                                    Berita Utama
                                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
                                    {featuredNews.map((news, index) => (
                                        <div key={news.id} className={`group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 ${index === 0 ? 'col-span-2 md:col-span-2 md:row-span-2' : ''}`}>
                                            <div className={`relative ${index === 0 ? 'aspect-video md:h-96' : 'aspect-video md:h-48'}`}>
                                                <img
                                                    src={getImageUrl(news.image)}
                                                    alt={news.title}
                                                    loading={index === 0 ? 'eager' : 'lazy'}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = '/assets/images/news/default-news.jpg'; }}
                                                />
                                                <div className="absolute top-0 right-0 bg-secondary text-white text-[10px] sm:text-xs font-bold px-2 py-1 sm:px-3 sm:py-1 rounded-bl-lg">
                                                    {news.category?.name || 'Umum'}
                                                </div>
                                                {/* Mobile Title Overlay - HIDDEN for Image-Only Look */}
                                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent hidden">
                                                    <h3 className={`font-bold text-white mb-1 ${index === 0 ? 'text-xl' : 'text-lg'} line-clamp-2`}>
                                                        {news.title}
                                                    </h3>
                                                    <div className="text-white/80 text-xs flex items-center">
                                                        <i className="far fa-calendar-alt mr-2"></i>
                                                        {formatDate(news.published_at || news.created_at)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="p-6 hidden md:block">
                                                <div className="flex items-center text-sm text-gray-500 mb-2">
                                                    <i className="far fa-calendar-alt mr-2"></i>
                                                    {formatDate(news.published_at || news.created_at)}
                                                </div>
                                                <Link href={route('news.show', news.slug)} className="block">
                                                    <h3 className={`font-bold text-gray-900 mb-2 group-hover:text-secondary transition-colors ${index === 0 ? 'text-2xl' : 'text-lg'}`}>
                                                        {news.title}
                                                    </h3>
                                                </Link>
                                                <p className="text-gray-600 line-clamp-2 mb-4">
                                                    {news.excerpt || (news.content || '').replace(/<[^>]+>/g, '').substring(0, 100) + '...'}
                                                </p>
                                                <Link href={route('news.show', news.slug)} className="inline-flex items-center text-secondary font-semibold hover:text-primary">
                                                    Baca Selengkapnya
                                                    <i className="fas fa-arrow-right ml-2 text-xs"></i>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All News / Search Results */}
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-primary pl-3">
                                    {latestNews ? 'Hasil Pencarian' : 'Semua Berita'}
                                </h2>
                                {totalNews && <span className="text-gray-500 text-sm">{totalNews} Berita</span>}
                            </div>

                            {newsList.data.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                                    {newsList.data.map((news) => (
                                        <div key={news.id} className={`bg-white rounded-lg shadow hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full relative ${editMode ? 'border-2 border-warning ring-2 ring-warning ring-offset-2' : ''}`}>
                                            {editMode && (
                                                <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-30 flex space-x-1 sm:space-x-2">
                                                    <Link
                                                        href={route('news.edit', news.slug || news.id)}
                                                        className="w-8 h-8 flex items-center justify-center bg-warning text-white rounded-lg shadow-lg hover:bg-warning/90 hover:scale-110 transition-all duration-200"
                                                        title="Edit Berita"
                                                    >
                                                        <i className="fas fa-edit text-xs sm:text-sm"></i>
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            Swal.fire({
                                                                title: 'Apakah Anda yakin?',
                                                                text: "Ingin menghapus berita ini?",
                                                                icon: 'warning',
                                                                showCancelButton: true,
                                                                confirmButtonColor: '#d33',
                                                                cancelButtonColor: '#3085d6',
                                                                confirmButtonText: 'Ya, Hapus!',
                                                                cancelButtonText: 'Batal'
                                                            }).then((result) => {
                                                                if (result.isConfirmed) {
                                                                    router.delete(route('news.destroy', news.id), {
                                                                        preserveScroll: true,
                                                                    });
                                                                }
                                                            });
                                                        }}
                                                        className="w-8 h-8 flex items-center justify-center bg-danger text-white rounded-lg shadow-lg hover:bg-danger/90 hover:scale-110 transition-all duration-200"
                                                        title="Hapus Berita"
                                                    >
                                                        <i className="fas fa-trash text-xs sm:text-sm"></i>
                                                    </button>
                                                </div>
                                            )}
                                            <div className="relative aspect-video md:h-48">
                                                <img
                                                    src={getImageUrl(news.image)}
                                                    alt={news.title}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = '/assets/images/news/default-news.jpg'; }}
                                                />
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 hidden md:block">
                                                    <span className="text-white text-xs bg-primary px-2 py-1 rounded inline-block">
                                                        {news.category?.name || 'Umum'}
                                                    </span>
                                                </div>
                                                {/* Category Overlay for Mobile */}
                                                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[8px] text-white font-medium md:hidden">
                                                    {news.category?.name || 'Berita'}
                                                </div>
                                            </div>
                                            <div className="p-5 flex-1 hidden md:flex flex-col">
                                                <div className="text-xs text-gray-500 mb-2 flex items-center">
                                                    <i className="far fa-clock mr-1"></i>
                                                    {formatDate(news.published_at || news.created_at)}
                                                </div>
                                                <Link href={route('news.show', news.slug)} className="block mb-2">
                                                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2 hover:text-primary transition-colors">
                                                        {news.title}
                                                    </h3>
                                                </Link>
                                                <p className="text-gray-600 text-sm line-clamp-3 mb-4 flex-1">
                                                    {news.excerpt || (news.content || '').replace(/<[^>]+>/g, '').substring(0, 80) + '...'}
                                                </p>
                                                <div className="pt-4 border-t border-gray-100 mt-auto">
                                                    <Link href={route('news.show', news.slug)} className="text-primary text-sm font-semibold hover:text-secondary flex items-center justify-between">
                                                        Baca Artikel
                                                        <i className="fas fa-chevron-right text-xs"></i>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-2 sm:py-10 bg-white rounded-xl shadow-sm">
                                    <i className="far fa-newspaper text-5xl text-gray-300 mb-4"></i>
                                    <h3 className="text-xl font-medium text-gray-900">Tidak ada berita ditemukan</h3>
                                    <p className="text-gray-500 mt-2">Coba kata kunci lain atau kembali nanti.</p>
                                </div>
                            )}

                            {/* Pagination */}
                            {newsList.links && newsList.links.length > 3 && (
                                <div className="mt-8 flex justify-center">
                                    <div className="flex flex-wrap gap-1">
                                        {newsList.links.map((link, i) => (
                                            link.url ? (
                                                <Link
                                                    key={i}
                                                    href={link.url}
                                                    className={`px-4 py-2 text-sm rounded-md transition-colors ${link.active
                                                        ? 'bg-secondary text-white'
                                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                                        }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                    preserveState
                                                />
                                            ) : (
                                                <span
                                                    key={i}
                                                    className="px-4 py-2 text-sm rounded-md transition-colors bg-white text-gray-400 border border-gray-200 cursor-not-allowed"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Newsletter Section */}
                        <div className="mt-4 sm:mt-10 bg-gradient-to-br from-white to-primary-50 rounded-2xl shadow-xl overflow-hidden border border-primary-100">
                            <div className="flex flex-col md:flex-row items-center">
                                <div className="w-full md:w-1/2 p-4 sm:p-10">
                                    <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900">
                                        Jangan Lewatkan Berita Terbaru!
                                    </h2>
                                    <p className="text-gray-600 mb-4 text-lg">
                                        Berlangganan newsletter kami untuk mendapatkan update terkini seputar event dan fitur baru langsung di inbox Anda.
                                    </p>
                                    <form className="flex flex-col sm:flex-row gap-3">
                                        <input 
                                            type="email" 
                                            placeholder="Masukkan email Anda" 
                                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-secondary focus:border-secondary outline-none transition-all"
                                        />
                                        <button type="submit" className="px-6 py-3 bg-secondary text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-secondary/30 whitespace-nowrap">
                                            Berlangganan
                                        </button>
                                    </form>
                                </div>
                                <div className="w-full md:w-1/2 h-64 md:h-auto bg-[url('/images/newsletter-bg.jpg')] bg-cover bg-center relative">
                                    <div className="absolute inset-0 bg-primary-900/40 backdrop-blur-[2px]"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center py-2 sm:py-6 bg-white rounded-xl shadow-sm">
                                            <i className="fas fa-envelope-open-text text-4xl text-secondary mb-3"></i>
                                            <div className="font-bold text-gray-900">Subscribe</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                    </div>
                </div>
            </div>
        </WebLayout>
    );
}

