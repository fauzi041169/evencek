import React, { useState, useRef, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import MobileLikeHero from '@/Components/MobileLikeHero';
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
    const { url } = usePage();
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
        return `/storage/${image}`;
    };

    return (
        <WebLayout hasHeaderSpacer={false}>
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
            `}</style>

            <div className="relative" style={{fontFamily: "'Inter','Poppins','Montserrat',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans','Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol'"}}>
                
                {/* Hero Section */}
                <MobileLikeHero 
                    title="Berita & Artikel" 
                    description="Informasi terbaru seputar kegiatan dan event terkini untuk Anda."
                >
                    {/* Search Form adapted for Hero */}
                    <Reveal className="max-w-xl mx-auto relative group mt-8">
                        <form onSubmit={handleSearch} className="w-full relative">
                            <input
                                type="text"
                                placeholder="Cari berita atau artikel..."
                                className="w-full pl-6 pr-14 py-4 rounded-2xl border-none focus:ring-4 focus:ring-primary/50 shadow-xl text-gray-800 text-lg placeholder-gray-400 bg-white/95 backdrop-blur-sm transition-all duration-300"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <button type="submit" className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-primary to-secondary text-white rounded-xl px-5 hover:shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center">
                                <i className="fas fa-search text-lg"></i>
                            </button>
                        </form>
                    </Reveal>
                </MobileLikeHero>

                {/* Stats Section */}
                <section className="py-10 bg-white relative z-10 -mt-8 mx-4 sm:mx-8 rounded-3xl shadow-xl border border-gray-100 max-w-5xl lg:mx-auto">
                    <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16">
                         <Reveal direction="up" className="flex items-center gap-4">
                            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/5 rounded-2xl text-secondary ring-1 ring-primary/10">
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
                            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl text-primary ring-1 ring-primary/20">
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

                <div className="py-12 min-h-screen bg-gray-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Header & Search removed from here as it is now in Hero */}

                        {/* Featured News (Only show on main index, not search results) */}
                    {!latestNews && featuredNews && featuredNews.length > 0 && (
                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-800 mb-6 border-l-4 border-secondary pl-3">
                                Berita Utama
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {featuredNews.map((news, index) => (
                                    <div key={news.id} className={`group bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}>
                                        <div className={`relative ${index === 0 ? 'h-64 md:h-96' : 'h-64 md:h-48'}`}>
                                            <img 
                                                src={getImageUrl(news.image)} 
                                                alt={news.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute top-0 right-0 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                                {news.category?.name || 'Umum'}
                                            </div>
                                            {/* Mobile Title Overlay */}
                                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent md:hidden">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {newsList.data.map((news) => (
                                    <div key={news.id} className={`bg-white rounded-lg shadow hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full relative ${editMode ? 'border-2 border-warning ring-2 ring-warning ring-offset-2' : ''}`}>
                                        {editMode && (
                                            <div className="absolute top-4 right-4 z-30 flex space-x-2">
                                                <Link 
                                                    href={route('news.edit', news.slug || news.id)} 
                                                    className="w-8 h-8 flex items-center justify-center bg-warning text-white rounded-lg shadow-lg hover:bg-warning/90 hover:scale-110 transition-all duration-200"
                                                    title="Edit Berita"
                                                >
                                                    <i className="fas fa-edit text-sm"></i>
                                                </Link>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.preventDefault(); 
                                                        if(confirm('Apakah Anda yakin ingin menghapus berita ini?')) {
                                                            router.delete(route('news.destroy', news.id), {
                                                                preserveScroll: true,
                                                            });
                                                        }
                                                    }} 
                                                    className="w-8 h-8 flex items-center justify-center bg-danger text-white rounded-lg shadow-lg hover:bg-danger/90 hover:scale-110 transition-all duration-200"
                                                    title="Hapus Berita"
                                                >
                                                    <i className="fas fa-trash text-sm"></i>
                                                </button>
                                            </div>
                                        )}
                                        <div className="relative h-64 md:h-48">
                                            <img 
                                                src={getImageUrl(news.image)} 
                                                alt={news.title}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4">
                                                <span className="text-white text-xs bg-primary px-2 py-1 rounded inline-block mb-2 md:mb-0">
                                                    {news.category?.name || 'Umum'}
                                                </span>
                                                {/* Mobile Title Overlay */}
                                                <div className="md:hidden">
                                                    <h3 className="text-white font-bold text-lg line-clamp-2 mb-1">
                                                        {news.title}
                                                    </h3>
                                                    <div className="text-white/80 text-xs flex items-center">
                                                        <i className="far fa-clock mr-1"></i>
                                                        {formatDate(news.published_at || news.created_at)}
                                                    </div>
                                                </div>
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
                            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
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
                                                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                                                    link.active
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
            </div>
        </div>
        </div>
    </WebLayout>
);
}

