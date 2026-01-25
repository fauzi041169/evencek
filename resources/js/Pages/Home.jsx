import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import WebLayout from '../Layouts/WebLayout';

// Custom Hook for CountUp Animation
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

// Intersection Observer for Reveal Animations
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

export default function Home({ heroSlides = [], stats = {}, partners = [], latestActivities = [], latestNews = [] }) {
    const { appSettings } = usePage().props;
    const [currentSlide, setCurrentSlide] = useState(0);
    const partnerSliderRef = useRef(null);
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

    // Hero Slider Auto-play
    useEffect(() => {
        if (heroSlides.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [heroSlides]);

    // Partner Slider Auto-scroll with CSS
    // Removed JS-based animation frame loop to improve performance

    const scrollMitra = (dir) => {
        if (partnerSliderRef.current) {
            const amount = Math.max(240, Math.floor(partnerSliderRef.current.clientWidth * 0.8));
            partnerSliderRef.current.scrollBy({ left: dir * amount, behavior: 'smooth' });
        }
    };

    return (
        <WebLayout hasHeaderSpacer={false}>
            <Head title="Home" />
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
                .cta-primary{transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}
                .cta-primary:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 12px 24px rgba(124,58,237,.35);filter:saturate(1.15)}
                .cta-secondary{transition:transform .2s ease,box-shadow .2s ease}
                .cta-secondary:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(255,255,255,.25)}
                .cta-tertiary{transition:transform .2s ease,box-shadow .2s ease}
                .cta-tertiary:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(255,255,255,.2)}
                .cta-shimmer{position:relative;overflow:hidden}
                .cta-shimmer::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.35) 50%,rgba(255,255,255,0) 100%);transform:translateX(-100%);opacity:0;pointer-events:none}
                .cta-shimmer:hover::after{animation:ctaShimmer .9s ease;opacity:1}
                @keyframes ctaShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
                
                /* Partner Marquee Animation */
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-marquee {
                    animation: marquee 40s linear infinite;
                }
                .animate-marquee:hover {
                    animation-play-state: paused;
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fadeInUp 0.5s ease-out forwards;
                }
                .float-animation {
                    animation: float 6s ease-in-out infinite;
                }
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                    100% { transform: translateY(0px); }
                }
                .perspective-1000 {
                    perspective: 1000px;
                }
                .animate-pulse-slow {
                    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>

            {/* Hero Section */}

            {/* Hero Section */}
            <section className="relative min-h-screen overflow-hidden flex items-center bg-gray-900">
                {/* Background Layer */}
                {heroSlides.length > 0 ? (
                    heroSlides.map((slide, index) => {
                        const isActivity = typeof slide === 'object' && slide.type === 'activity';
                        return (
                            <div
                                key={index}
                                className={`hero-slide absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                            >
                                <div
                                    className={`absolute inset-0 bg-cover bg-center ${isActivity ? 'blur-sm scale-110' : ''}`}
                                    style={{
                                        backgroundImage: `url('${typeof slide === 'string' ? slide : slide.image}')`,
                                    }}
                                ></div>
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/90 to-gray-900/60 mix-blend-multiply"></div>
                                <div className="absolute inset-0 bg-black/40"></div>
                            </div>
                        );
                    })
                ) : (
                    <div className="hero-slide absolute inset-0 opacity-100" style={{ background: '#111827' }}></div>
                )}

                {/* Content Layer */}
                <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 h-full pt-20 pb-12 flex items-center">
                    <div className="max-w-7xl mx-auto w-full">
                        {heroSlides.length > 0 && (() => {
                            const slide = heroSlides[currentSlide];
                            const isActivity = typeof slide === 'object' && slide.type === 'activity';
                            const isStatic = typeof slide === 'object' && slide.type === 'static';

                            if (isActivity) {
                                return (
                                    <div key={currentSlide} className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center animate-fade-in-up">
                                        {/* Left Column: Text Info */}
                                        <div className="lg:col-span-7 text-left space-y-8 order-2 lg:order-1">
                                            <div>
                                                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-primary/20 to-transparent border-l-4 border-primary px-4 py-2 rounded-r-xl mb-6 backdrop-blur-md">
                                                    <span className="flex h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
                                                    <span className="text-primary-300 font-bold tracking-widest text-sm uppercase">Sedang Berlangsung</span>
                                                </div>
                                                <h1 className="hero-title text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-tight drop-shadow-2xl mb-4">
                                                    {slide.title}
                                                </h1>
                                                <div className="h-1 w-32 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
                                            </div>

                                            <p className="text-lg text-gray-300 leading-relaxed max-w-2xl border-l-2 border-white/10 pl-6">
                                                {slide.description}
                                            </p>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {slide.date && (
                                                    <div className="flex items-center space-x-4 bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
                                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                            <i className="fas fa-calendar-alt text-xl"></i>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-400 uppercase tracking-wider">Tanggal</p>
                                                            <p className="text-white font-semibold">{slide.date}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {slide.price && (
                                                    <div className="flex items-center space-x-4 bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors">
                                                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                                                            <i className="fas fa-tag text-xl"></i>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-400 uppercase tracking-wider">Harga Tiket</p>
                                                            <p className="text-white font-semibold">{slide.price}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {slide.location && (
                                                    <div className="flex items-center space-x-4 bg-white/5 p-4 rounded-xl backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors sm:col-span-2">
                                                        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 flex-shrink-0">
                                                            <i className="fas fa-map-marker-alt text-xl"></i>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-400 uppercase tracking-wider">Lokasi</p>
                                                            <p className="text-white font-semibold line-clamp-1">{slide.location}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-4 pt-4">
                                                <Link href={`/activity/${slide.id}`}
                                                    className="group relative px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden">
                                                    <span className="relative z-10 flex items-center">
                                                        Daftar Sekarang <i className="fas fa-arrow-right ml-3 group-hover:translate-x-1 transition-transform"></i>
                                                    </span>
                                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                                </Link>
                                                <Link href="/activity"
                                                    className="px-8 py-4 bg-white/5 text-white font-semibold text-lg rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/30 transition-all duration-300 backdrop-blur-md">
                                                    Lihat Lainnya
                                                </Link>
                                            </div>
                                        </div>

                                        {/* Right Column: 3D Image */}
                                        <div className="lg:col-span-5 perspective-container order-1 lg:order-2 mb-10 lg:mb-0">
                                            <div className="relative w-full max-w-sm lg:max-w-md mx-auto group perspective-1000">
                                                {/* Glow Effects */}
                                                <div className="absolute -inset-4 bg-gradient-to-tr from-primary via-purple-500 to-pink-500 rounded-[2rem] blur-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-500 animate-pulse-slow"></div>

                                                {/* 3D Card Container */}
                                                <div className="relative transform transition-all duration-500 hover:scale-105 hover:rotate-2 shadow-2xl rounded-[1.5rem] overflow-hidden bg-gray-800 border-4 border-gray-700/50 float-animation">
                                                    <img
                                                        src={slide.image}
                                                        alt={slide.title}
                                                        className="w-full h-auto object-contain bg-gray-900"
                                                        style={{ maxHeight: '600px' }}
                                                    />

                                                    {/* Glass Reflection */}
                                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // Default/Static Slide Layout
                            return (
                                <div key={currentSlide} className="text-center animate-fade-in-up px-4">
                                    <div className="inline-block p-4 rounded-full bg-white/5 backdrop-blur-md border border-white/10 mb-8 shadow-2xl">
                                        <div className="flex items-center gap-2 px-2">
                                            <span className="w-3 h-3 rounded-full bg-green-500 animate-ping"></span>
                                            <span className="text-white font-medium tracking-wide text-sm">Official Event Platform</span>
                                        </div>
                                    </div>
                                    <h1 className="hero-title text-5xl sm:text-6xl lg:text-8xl font-black mb-8 leading-tight tracking-tight text-white drop-shadow-2xl">
                                        {isStatic ? slide.title : 'Platform Manajemen Event Digital Profesional'}
                                    </h1>
                                    <p className="text-xl sm:text-2xl text-gray-200 mb-10 max-w-4xl mx-auto leading-relaxed drop-shadow-lg font-light">
                                        {isStatic ? slide.description : 'Kelola pendaftaran, peserta, panitia, pembayaran, absensi, kartu, dan sertifikat dalam satu platform terintegrasi yang aman dan modern.'}
                                    </p>

                                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                                        <Link href={isStatic && slide.link ? slide.link : '/activity'}
                                            className="group relative px-10 py-5 bg-white text-gray-900 font-bold text-xl rounded-full shadow-2xl hover:shadow-white/20 transition-all duration-300 transform hover:-translate-y-1 items-center flex justify-center overflow-hidden">
                                            <span className="relative z-10">{isStatic && slide.link_text ? slide.link_text : 'Mulai Sekarang'}</span>
                                            <div className="absolute inset-0 bg-gray-100 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        </Link>

                                        <a href="#fitur" className="group px-10 py-5 bg-transparent text-white font-semibold text-xl rounded-full border-2 border-white/30 hover:bg-white/10 hover:border-white transition-all duration-300 flex items-center justify-center">
                                            <span>Pelajari Lebih Lanjut</span>
                                            <i className="fas fa-arrow-down ml-3 group-hover:translate-y-1 transition-transform"></i>
                                        </a>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Slider Navigation Dots */}
                {heroSlides.length > 1 && (
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
                        {heroSlides.map((_, i) => (
                            <button
                                key={i}
                                className={`relative h-2 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-12 bg-primary' : 'w-2 bg-white/40 hover:bg-white/80'}`}
                                onClick={() => setCurrentSlide(i)}
                                aria-label={`Go to slide ${i + 1}`}
                            ></button>
                        ))}
                    </div>
                )}
            </section>

            {/* Stats Section */}
            <section id="stats" className="py-12 bg-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.08]">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-primary) 1px, transparent 0)', backgroundSize: '36px 36px' }}></div>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <Reveal direction="left" className="group bg-gradient-to-br from-white to-primary/5 rounded-3xl p-6 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl text-white">
                                    <i className="fas fa-users text-2xl"></i>
                                </div>
                                <div>
                                    <div className="text-3xl sm:text-4xl font-black text-gray-900">
                                        <CountUp end={stats.totalUsers || 0} />
                                    </div>
                                    <div className="text-sm font-semibold text-gray-600">Total Pengguna</div>
                                </div>
                            </div>
                        </Reveal>
                        <Reveal direction="right" className="group bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-secondary to-primary rounded-2xl text-white">
                                    <i className="fas fa-calendar-check text-2xl"></i>
                                </div>
                                <div>
                                    <div className="text-3xl sm:text-4xl font-black text-gray-900">
                                        <CountUp end={stats.totalActivities || 0} />
                                    </div>
                                    <div className="text-sm font-semibold text-gray-600">Total Kegiatan</div>
                                </div>
                            </div>
                        </Reveal>
                        <Reveal className="group bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                            <div className="flex items-center gap-4">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl text-white">
                                    <i className="fas fa-user-tie text-2xl"></i>
                                </div>
                                <div>
                                    <div className="text-3xl sm:text-4xl font-black text-gray-900">
                                        <CountUp end={stats.totalCreators || 0} />
                                    </div>
                                    <div className="text-sm font-semibold text-gray-600">Total Kreator</div>
                                </div>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* Partners Section */}
            <section id="mitra" className="py-16 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="mb-8 text-center">
                        <h3 className="text-3xl font-black text-gray-900">Partner Kami</h3>
                        <div className="mt-4 hidden sm:flex justify-center gap-3">
                            <button type="button" onClick={() => scrollMitra(-1)} className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300 ring-1 ring-gray-200">
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            <button type="button" onClick={() => scrollMitra(1)} className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300 ring-1 ring-gray-200">
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>

                    {partners.length > 0 ? (
                        <div className="relative w-full overflow-hidden py-2 group">
                            <div className="flex gap-6 animate-marquee w-max">
                                {[...partners, ...partners].map((partner, idx) => (
                                    <a key={`${partner.id || idx}-${idx}`} href={partner.website_url || '#'} target={partner.website_url ? '_blank' : '_self'} className="flex-none w-56 group/item" rel="noreferrer">
                                        <div className="bg-white rounded-2xl p-4 border-2 border-gray-200 hover:border-primary transition-all duration-300 hover:scale-[1.02]">
                                            <div className="h-28 w-full flex items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                                                {partner.logo ? (
                                                    <img src={partner.logo.startsWith('http') ? partner.logo : `/storage/${partner.logo}`} alt={`Logo ${partner.name}`} className="max-h-24 object-contain" onError={(e) => e.target.style.display = 'none'} />
                                                ) : (
                                                    <i className="fas fa-building text-4xl text-gray-400"></i>
                                                )}
                                            </div>
                                            <div className="mt-3 text-center">
                                                <p className="text-sm font-semibold text-gray-900 truncate" title={partner.name}>{partner.name}</p>
                                                {partner.description && <p className="text-xs text-gray-600 truncate">{partner.description.substring(0, 30)}</p>}
                                            </div>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-600 text-center">Belum ada partner terdaftar.</p>
                    )}

                    <div className="mt-6 flex sm:hidden justify-center gap-3">
                        <button type="button" onClick={() => scrollMitra(-1)} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300 ring-1 ring-gray-200">Prev</button>
                        <button type="button" onClick={() => scrollMitra(1)} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300 ring-1 ring-gray-200">Next</button>
                    </div>
                </div>
            </section>

            {/* Fitur Utama Section */}
            <section id="fitur" className="py-24 bg-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-primary) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <Reveal className="text-center mb-20">
                        <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl mb-6 backdrop-blur-sm border border-primary/30">
                            <div className="w-2 h-2 bg-primary rounded-full mr-3 animate-pulse"></div>
                            <span className="text-primary font-semibold tracking-wide">FITUR UTAMA PLATFORM</span>
                        </div>
                        <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6 leading-tight">
                            <span className="text-gray-900">Manajemen Event</span>
                            <span className="text-primary"> Secara Total & Digital</span>
                        </h2>
                        <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
                            Semua kebutuhan manajemen event Anda dalam satu platform terintegrasi
                        </p>
                    </Reveal>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <Reveal direction="left" className="group bg-gradient-to-br from-white to-indigo-50 rounded-3xl p-8 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-3xl mb-6 group-hover:from-[#6d28d9] group-hover:to-[#2563eb] transition-all duration-500 transform hover:-translate-y-1 shadow-lg group-hover:shadow-indigo-500/40">
                                <i className="fas fa-user-check text-3xl text-white"></i>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-primary transition-colors duration-300">Pendaftaran Digital</h3>
                            <p className="text-gray-700 text-lg leading-relaxed mb-4">
                                Sistem pendaftaran event online yang mudah dan cepat. Peserta dapat mendaftar kapan saja, di mana saja, dengan proses yang ter-record secara digital.
                            </p>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Form pendaftaran otomatis</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Validasi data real-time</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Tracking status pendaftaran</li>
                            </ul>
                        </Reveal>

                        <Reveal className="group bg-gradient-to-br from-white to-indigo-50 rounded-3xl p-8 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-3xl mb-6 group-hover:from-[#6d28d9] group-hover:to-[#2563eb] transition-all duration-500 transform hover:-translate-y-1 shadow-lg group-hover:shadow-indigo-500/40">
                                <i className="fas fa-users-cog text-3xl text-white"></i>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-primary transition-colors duration-300">Manajemen Peserta & Panitia</h3>
                            <p className="text-gray-700 text-lg leading-relaxed mb-4">
                                Kelola peserta dan panitia dengan sistem terpusat. Import/export data, filter pencarian, dan manajemen peran yang ter-record lengkap.
                            </p>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Manajemen database peserta</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Penugasan panitia event</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Import/Export Excel</li>
                            </ul>
                        </Reveal>

                        <Reveal direction="right" className="group bg-gradient-to-br from-white to-indigo-50 rounded-3xl p-8 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-3xl mb-6 group-hover:from-[#6d28d9] group-hover:to-[#2563eb] transition-all duration-500 transform hover:-translate-y-1 shadow-lg group-hover:shadow-indigo-500/40">
                                <i className="fas fa-id-card text-3xl text-white"></i>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-primary transition-colors duration-300">Kartu Peserta Digital</h3>
                            <p className="text-gray-700 text-lg leading-relaxed mb-4">
                                Generate kartu peserta digital dengan QR code. Desain customizable, print ready, dan dapat diakses langsung oleh peserta secara digital.
                            </p>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>QR Code untuk absensi</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Desain customizable</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Print batch atau individual</li>
                            </ul>
                        </Reveal>

                        <Reveal direction="pop" className="group bg-gradient-to-br from-white to-indigo-50 rounded-3xl p-8 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-3xl mb-6 group-hover:from-[#6d28d9] group-hover:to-[#2563eb] transition-all duration-500 transform hover:-translate-y-1 shadow-lg group-hover:shadow-indigo-500/40">
                                <i className="fas fa-certificate text-3xl text-white"></i>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-primary transition-colors duration-300">Sertifikat Digital</h3>
                            <p className="text-gray-700 text-lg leading-relaxed mb-4">
                                Generate sertifikat digital otomatis untuk semua peserta. Desain profesional, verifikasi digital, dan pengiriman otomatis.
                            </p>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Generate otomatis</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Desain profesional</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Verifikasi digital</li>
                            </ul>
                        </Reveal>

                        <Reveal direction="pop" className="group bg-gradient-to-br from-white to-indigo-50 rounded-3xl p-8 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-3xl mb-6 group-hover:from-[#6d28d9] group-hover:to-[#2563eb] transition-all duration-500 transform hover:-translate-y-1 shadow-lg group-hover:shadow-indigo-500/40">
                                <i className="fas fa-qrcode text-3xl text-white"></i>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-primary transition-colors duration-300">Sistem Absensi Digital</h3>
                            <p className="text-gray-700 text-lg leading-relaxed mb-4">
                                Absensi menggunakan QR code scanner atau manual. Data absensi ter-record real-time dan dapat diekspor untuk laporan.
                            </p>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Scan QR Code</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Realtime tracking</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Export laporan absensi</li>
                            </ul>
                        </Reveal>

                        <Reveal direction="pop" className="group bg-gradient-to-br from-white to-indigo-50 rounded-3xl p-8 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-3xl mb-6 group-hover:from-[#6d28d9] group-hover:to-[#2563eb] transition-all duration-500 transform hover:-translate-y-1 shadow-lg group-hover:shadow-indigo-500/40">
                                <i className="fas fa-database text-3xl text-white"></i>
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-primary transition-colors duration-300">Semua Ter-record Digital</h3>
                            <p className="text-gray-700 text-lg leading-relaxed mb-4">
                                Semua aktivitas event ter-record secara digital: pendaftaran, pembayaran, absensi, sertifikat, dan dokumentasi. Data aman dan dapat diakses kapan saja.
                            </p>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>History lengkap</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Backup otomatis</li>
                                <li className="flex items-center"><i className="fas fa-check-circle text-primary mr-2"></i>Analytics & reporting</li>
                            </ul>
                        </Reveal>
                    </div>
                </div>
            </section>

            {/* Latest Activities Section */}
            {latestActivities.length > 0 && (
                <section id="activities" className="py-20 bg-gray-50 relative overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <Reveal className="text-center mb-12">
                            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl mb-6 backdrop-blur-sm border border-primary/30">
                                <div className="w-2 h-2 bg-primary rounded-full mr-3 animate-pulse"></div>
                                <span className="text-primary font-semibold tracking-wide">KEGIATAN TERBARU</span>
                            </div>
                            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6 leading-tight">
                                Ikuti <span className="text-primary">Event Menarik</span>
                            </h2>
                        </Reveal>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {latestActivities.map((activity, idx) => (
                                <Reveal key={activity.id || idx} direction="up" className={`group bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 border ${editMode ? 'border-yellow-400 ring-2 ring-yellow-400 ring-offset-2' : 'border-gray-100 hover:border-primary/30'} h-full flex flex-col relative`}>
                                    {editMode && (
                                        <div className="absolute top-4 right-4 z-30 flex space-x-2">
                                            <Link
                                                href={route('activity.edit', activity.id)}
                                                className="w-10 h-10 flex items-center justify-center bg-yellow-400 text-white rounded-xl shadow-lg hover:bg-yellow-500 hover:scale-110 transition-all duration-200"
                                                title="Edit Kegiatan"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </Link>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (confirm('Apakah Anda yakin ingin menghapus kegiatan ini?')) {
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
                                    <div className="relative h-56 overflow-hidden">
                                        <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
                                        <img
                                            src={activity.image ? (activity.image.startsWith('http') ? activity.image : `/storage/${activity.image}`) : '/assets/images/hero/defoult.webp'}
                                            alt={activity.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            onError={(e) => { e.target.onerror = null; e.target.src = '/assets/images/hero/defoult.webp' }}
                                        />
                                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-primary shadow-sm">
                                            {activity.category?.name || 'Event'}
                                        </div>
                                    </div>
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-center text-xs text-gray-500 mb-3 space-x-4">
                                            <div className="flex items-center">
                                                <i className="fas fa-calendar-alt mr-2 text-primary"></i>
                                                {new Date(activity.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            </div>
                                            {activity.location && (
                                                <div className="flex items-center truncate max-w-[120px]">
                                                    <i className="fas fa-map-marker-alt mr-2 text-primary"></i>
                                                    <span className="truncate">{activity.location}</span>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                                            <Link href={route('activity.show', activity.id)} className="hover:underline">{activity.name}</Link>
                                        </h3>
                                        <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                            <div className="text-lg font-black text-primary">
                                                {activity.price > 0
                                                    ? (activity.show_price !== false
                                                        ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(activity.price)
                                                        : '')
                                                    : 'Gratis'}
                                            </div>
                                            <Link href={route('activity.show', activity.id)} className="text-sm font-semibold text-gray-600 hover:text-primary transition-colors flex items-center">
                                                Detail <i className="fas fa-arrow-right ml-2 text-xs"></i>
                                            </Link>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>

                        <div className="mt-12 text-center">
                            <Link href="/activity" className="inline-flex items-center px-8 py-3 bg-white text-primary font-bold text-lg rounded-2xl border-2 border-primary hover:bg-primary hover:text-white transition-all duration-300 shadow-lg hover:shadow-indigo-500/30">
                                <span>Lihat Semua Event</span>
                                <i className="fas fa-arrow-right ml-3"></i>
                            </Link>
                        </div>
                    </div>
                </section>
            )}

            {/* Latest News Section */}
            {latestNews.length > 0 && (
                <section id="news" className="py-20 bg-white relative overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <Reveal className="text-center mb-12">
                            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl mb-6 backdrop-blur-sm border border-primary/30">
                                <div className="w-2 h-2 bg-primary rounded-full mr-3 animate-pulse"></div>
                                <span className="text-primary font-semibold tracking-wide">BERITA & ARTIKEL</span>
                            </div>
                            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6 leading-tight">
                                Informasi <span className="text-primary">Terbaru</span>
                            </h2>
                        </Reveal>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {latestNews.map((news, idx) => (
                                <Reveal key={news.id || idx} direction="up" className={`group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 border ${editMode ? 'border-yellow-400 ring-2 ring-yellow-400 ring-offset-2' : 'border-gray-100 hover:border-primary/30'} h-full flex flex-col relative`}>
                                    {editMode && (
                                        <div className="absolute top-4 right-4 z-30 flex space-x-2">
                                            <Link
                                                href={route('news.edit', news.slug || news.id)}
                                                className="w-8 h-8 flex items-center justify-center bg-yellow-400 text-white rounded-lg shadow-lg hover:bg-yellow-500 hover:scale-110 transition-all duration-200"
                                                title="Edit Berita"
                                            >
                                                <i className="fas fa-edit text-sm"></i>
                                            </Link>
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (confirm('Apakah Anda yakin ingin menghapus berita ini?')) {
                                                        router.delete(route('news.destroy', news.id), {
                                                            preserveScroll: true,
                                                        });
                                                    }
                                                }}
                                                className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 hover:scale-110 transition-all duration-200"
                                                title="Hapus Berita"
                                            >
                                                <i className="fas fa-trash text-sm"></i>
                                            </button>
                                        </div>
                                    )}
                                    <div className="relative h-48 overflow-hidden">
                                        <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
                                        <img
                                            src={news.image ? (news.image.startsWith('http') ? news.image : `/storage/${news.image}`) : '/assets/images/hero/defoult.webp'}
                                            alt={news.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            onError={(e) => { e.target.onerror = null; e.target.src = '/assets/images/hero/defoult.webp' }}
                                        />
                                        {news.category && (
                                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-lg text-xs font-medium text-white">
                                                {news.category.name}
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col">
                                        <div className="text-xs text-gray-500 mb-2 flex items-center">
                                            <i className="far fa-clock mr-2 text-primary"></i>
                                            {new Date(news.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                                            <Link href={`/news/${news.slug || news.id}`} className="hover:underline">{news.title}</Link>
                                        </h3>
                                        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center text-xs text-gray-500">
                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-2 text-[10px] font-bold text-gray-600">
                                                    {news.author?.name ? news.author.name.substring(0, 1) : 'A'}
                                                </div>
                                                <span className="truncate max-w-[80px]">{news.author?.name || 'Admin'}</span>
                                            </div>
                                            <Link href={`/news/${news.slug || news.id}`} className="text-xs font-semibold text-primary hover:underline">
                                                Baca Selengkapnya
                                            </Link>
                                        </div>
                                    </div>
                                </Reveal>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Alur Kerja Platform */}
            <section className="py-24 bg-white relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, var(--color-primary) 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                </div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <Reveal className="text-center mb-20">
                        <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl mb-6 backdrop-blur-sm border border-primary/30">
                            <div className="w-2 h-2 bg-primary rounded-full mr-3 animate-pulse"></div>
                            <span className="text-primary font-semibold tracking-wide">ALUR KERJA PLATFORM</span>
                        </div>
                        <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6 leading-tight">
                            <span className="text-gray-900">Cara Kerja</span>
                            <span className="text-primary"> Platform Kami</span>
                        </h2>
                        <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">Langkah-langkah mudah untuk mengelola event Anda secara digital</p>
                    </Reveal>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
                        <Reveal direction="left" className="text-center group h-full">
                            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl h-full">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-full mb-6 text-white font-black text-2xl">1</div>
                                <h3 className="text-2xl font-black text-gray-900 mb-4">Buat Event</h3>
                                <p className="text-gray-700 leading-relaxed">Lengkapi nama, tanggal, lokasi, kuota, dan detail lainnya</p>
                            </div>
                        </Reveal>
                        <Reveal className="text-center group h-full">
                            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl h-full">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-full mb-6 text-white font-black text-2xl">2</div>
                                <h3 className="text-2xl font-black text-gray-900 mb-4">Buka Pendaftaran</h3>
                                <p className="text-gray-700 leading-relaxed">Aktifkan pendaftaran digital, data langsung ter-record</p>
                            </div>
                        </Reveal>
                        {/* Adding 3 and 4 which were not in truncated file but usually follow */}
                        <Reveal className="text-center group h-full">
                            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl h-full">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-full mb-6 text-white font-black text-2xl">3</div>
                                <h3 className="text-2xl font-black text-gray-900 mb-4">Kelola Peserta</h3>
                                <p className="text-gray-700 leading-relaxed">Pantau pendaftar, pembayaran, dan kirim informasi</p>
                            </div>
                        </Reveal>
                        <Reveal direction="right" className="text-center group h-full">
                            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 hover:border-primary transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl h-full">
                                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-full mb-6 text-white font-black text-2xl">4</div>
                                <h3 className="text-2xl font-black text-gray-900 mb-4">Pelaksanaan Event</h3>
                                <p className="text-gray-700 leading-relaxed">Absensi QR code dan sertifikat digital otomatis</p>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </section>
        </WebLayout>
    );
}
