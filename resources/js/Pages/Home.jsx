import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';

export default function Home({ heroSlides = [], stats = {}, partners = [], specialActivities = [], latestActivities = [], latestNews = [] }) {
    const { auth, appSettings } = usePage().props;
    const [currentSlide, setCurrentSlide] = useState(0);
    const mitraSliderRef = useRef(null);

    // Global Settings Logic
    const heroAnim = appSettings?.hero_animation_style || 'circles';
    const heroBg1 = appSettings?.hero_background_1 || null;

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

    const getStorageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;

        // Remove leading slash for consistency during processing
        let cleanPath = path.startsWith('/') ? path.substring(1) : path;

        // Fix potential double storage prefix which causing 404
        if (cleanPath.startsWith('storage/storage/')) {
            cleanPath = cleanPath.substring(8); // Remove first 'storage/'
        }

        // Ensure it starts with /storage/ if it doesn't already
        if (cleanPath.startsWith('storage/')) {
            return '/' + cleanPath;
        }

        // If it's a known assets path, just return with leading slash
        if (cleanPath.startsWith('assets/')) {
            return '/' + cleanPath;
        }

        // Otherwise, assume it needs the storage prefix
        return '/storage/' + cleanPath;
    };

    // Process hero slides to ensure uniform format, prioritizing global setting if available
    const processedSlides = heroBg1
        ? [{ image: getStorageUrl(heroBg1) }]
        : (heroSlides.length > 0 ? heroSlides.map(slide => {
            if (typeof slide === 'string') {
                return { image: getStorageUrl(slide) };
            }
            return { ...slide, image: getStorageUrl(slide.image) };
        }) : [{ image: '/assets/images/hero/defoult.webp' }]);

    const activeSlide = processedSlides[currentSlide] || {};
    // Force static content as requested to match the specific design
    const heroTitle = "Platform Manajemen Event Digital Profesional";
    const heroDesc = "Kelola pendaftaran, peserta, panitia, pembayaran, absensi, kartu, dan sertifikat dalam satu platform terintegrasi yang aman dan modern.";
    const heroLink = route('activity.index');
    const heroLinkText = "Mulai Kelola Event";

    // Auto-advance hero slides
    useEffect(() => {
        if (processedSlides.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % processedSlides.length);
        }, 5000);

        return () => clearInterval(interval);
    }, [processedSlides.length]);

    // Handle animations (Reveal on scroll)
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('show');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-pop').forEach((el) => {
            observer.observe(el);
        });

        // Stagger animations
        document.querySelectorAll('[data-stagger]').forEach((container) => {
            const group = container.getAttribute('data-stagger');
            const isMobile = window.innerWidth < 768;
            let factor = isMobile ? 60 : 120;
            if (group === 'features') factor = isMobile ? 80 : 160;
            else if (group === 'workflow') factor = isMobile ? 50 : 140;

            const items = [...container.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-pop')];
            items.forEach((el, idx) => {
                el.style.transitionDelay = `${idx * factor}ms`;
            });
        });

        return () => observer.disconnect();
    }, []);

    // Parallax Effect
    useEffect(() => {
        let ticking = false;

        const updateParallax = () => {
            const lastY = window.scrollY;

            // Hero slides background position
            const offset = Math.max(-80, Math.min(80, -lastY * 0.15));
            document.querySelectorAll('.hero-slide').forEach(s => {
                s.style.backgroundPosition = `center ${offset}px`;
            });

            // Gradient overlays
            const overlays = document.querySelectorAll('.hero-gradient-overlay');
            const overlaysTop = document.querySelectorAll('.hero-gradient-overlay-top');

            const t = Math.max(-30, Math.min(30, lastY * 0.08));
            const o = Math.max(0.6, Math.min(1, 1 - lastY * 0.0008));

            overlays.forEach(el => {
                el.style.transform = `translateY(${t}px)`;
                el.style.opacity = String(o);
            });

            overlaysTop.forEach(el => {
                el.style.transform = `translateY(${-t}px)`;
                el.style.opacity = String(o);
            });

            // Hero Content
            const hc = document.getElementById('heroContent');
            if (hc) {
                const ht = Math.max(-12, Math.min(12, -lastY * 0.04));
                const ho = Math.max(0.85, Math.min(1, 1 - lastY * 0.0006));
                hc.style.transform = `translateY(${ht}px)`;
                hc.style.opacity = String(ho);
            }

            // Hero Title
            const htEl = document.getElementById('heroTitle');
            if (htEl) {
                const ty = Math.max(-8, Math.min(8, -lastY * 0.02));
                const to = Math.max(0.9, Math.min(1, 1 - lastY * 0.0004));
                htEl.style.transform = `translateY(${ty}px)`;
                htEl.style.opacity = String(to);
            }

            ticking = false;
        };

        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(updateParallax);
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    // Mitra Slider Auto-scroll
    useEffect(() => {
        const slider = mitraSliderRef.current;
        if (!slider) return;

        let timer = null;

        const getStep = () => {
            const firstCard = slider.querySelector('.flex-none.w-56');
            const gapPx = 24;
            if (firstCard) {
                return Math.ceil(firstCard.getBoundingClientRect().width + gapPx);
            }
            return Math.max(240, Math.floor(slider.clientWidth * 0.8));
        };

        const tick = () => {
            if (!slider) return;
            const step = getStep();
            const max = slider.scrollWidth - slider.clientWidth;
            const next = slider.scrollLeft + step;
            if (next >= max - 5) {
                slider.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                slider.scrollBy({ left: step, behavior: 'smooth' });
            }
        };

        const start = () => {
            if (timer) clearInterval(timer);
            timer = setInterval(tick, 5000);
        };

        const stop = () => { if (timer) { clearInterval(timer); timer = null; } };

        slider.addEventListener('mouseenter', stop);
        slider.addEventListener('mouseleave', start);
        slider.addEventListener('touchstart', stop);
        slider.addEventListener('touchend', start);

        start();

        return () => {
            stop();
            if (slider) {
                slider.removeEventListener('mouseenter', stop);
                slider.removeEventListener('mouseleave', start);
                slider.removeEventListener('touchstart', stop);
                slider.removeEventListener('touchend', start);
            }
        };
    }, [partners]);

    const scrollMitra = (dir) => {
        const el = mitraSliderRef.current;
        if (!el) return;
        const amount = Math.max(240, Math.floor(el.clientWidth * 0.8));
        el.scrollBy({ left: dir * amount, behavior: 'smooth' });
    };

    return (
        <WebLayout hasHeaderSpacer={false}>
            <Head title="Home" />

            <style dangerouslySetInnerHTML={{
                __html: `
                .reveal{opacity:0;transform:translateY(16px) scale(.98);transition:opacity .6s ease,transform .6s ease}
                .reveal.show{opacity:1;transform:translateY(0) scale(1)}
                .reveal-left{opacity:0;transform:translateX(-16px);transition:opacity .6s ease,transform .6s ease}
                .reveal-left.show{opacity:1;transform:translateX(0)}
                .reveal-right{opacity:0;transform:translateX(16px);transition:opacity .6s ease,transform .6s ease}
                .reveal-right.show{opacity:1;transform:translateX(0)}
                .reveal-pop{opacity:0;transform:translateY(18px) scale(.96);transition:opacity .6s ease,transform .6s ease}
                .reveal-pop.show{opacity:1;transform:translateY(0) scale(1)}
                .hero-gradient-overlay,.hero-gradient-overlay-top{will-change:transform,opacity;transition:transform .4s ease,opacity .4s ease}
                .hero-content{will-change:transform,opacity;transition:transform .4s ease,opacity .4s ease}
                .hero-title{will-change:transform,opacity;transition:transform .4s ease,opacity .4s ease}
                .cta-primary{transition:transform .2s ease,box-shadow .2s ease,filter .2s ease}
                .cta-primary:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 12px 24px rgba(124,58,237,.35);filter:saturate(1.15)}
                .cta-primary:hover i{transform:translateX(2px);animation:ctaIconNudge .4s ease}
                .cta-secondary{transition:transform .2s ease,box-shadow .2s ease}
                .cta-secondary:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(255,255,255,.25)}
                .cta-secondary:hover i{transform:scale(1.05);animation:ctaIconPulse .5s ease}
                .cta-tertiary{transition:transform .2s ease,box-shadow .2s ease}
                .cta-tertiary:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(255,255,255,.2)}
                .cta-tertiary:hover i{transform:translateX(1px);animation:ctaIconNudge .4s ease}
                .cta-shimmer{position:relative;overflow:hidden}
                .cta-shimmer::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.35) 50%,rgba(255,255,255,0) 100%);transform:translateX(-100%);opacity:0;pointer-events:none}
                .cta-shimmer:hover::after{animation:ctaShimmer .9s ease;opacity:1}
                .cta-primary:focus-visible{outline:none;transform:translateY(-2px) scale(1.02);box-shadow:0 0 0 3px rgba(124,58,237,.55),0 12px 24px rgba(124,58,237,.35)}
                .cta-secondary:focus-visible{outline:none;transform:translateY(-2px);box-shadow:0 0 0 3px rgba(255,255,255,.45),0 10px 20px rgba(255,255,255,.25)}
                .cta-tertiary:focus-visible{outline:none;transform:translateY(-2px);box-shadow:0 0 0 3px rgba(255,255,255,.35),0 10px 20px rgba(255,255,255,.2)}
                @keyframes ctaIconNudge{0%{transform:translateX(0)}50%{transform:translateX(3px)}100%{transform:translateX(0)}}
                @keyframes ctaIconPulse{0%{transform:scale(1)}50%{transform:scale(1.08)}100%{transform:scale(1)}}
                @keyframes ctaShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}
                
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
            `}} />

            <div className="min-h-screen bg-gradient-to-br from-white via-white to-white relative overflow-hidden font-sans">

                {/* Hero Section */}
                <section className="relative min-h-[85vh] flex items-center overflow-hidden">
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

                    {/* Background Slider */}
                    <div className="absolute inset-0 z-0">
                        {processedSlides.map((slide, index) => (
                            <div
                                key={index}
                                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                            >
                                <div
                                    className="absolute inset-0 bg-cover bg-center animate-slow-zoom"
                                    style={{ backgroundImage: `url('${slide.image}')` }}
                                />
                                {/* Gradient Overlay - Bright & Modern */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-purple-900/50 to-blue-900/50 mix-blend-multiply"></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 via-transparent to-indigo-900/30"></div>
                            </div>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center min-h-[85vh]">
                        <div className="max-w-5xl mx-auto text-center">
                            {/* Glass Card Container */}
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-8 md:p-16 shadow-2xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50 pointer-events-none"></div>

                                {/* Headline */}
                                <h1 className="relative text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] mb-8 reveal drop-shadow-lg tracking-tight">
                                    {heroTitle}
                                </h1>

                                {/* Subheadline */}
                                <p className="relative text-lg md:text-xl text-indigo-50 mb-12 leading-relaxed max-w-3xl mx-auto reveal font-medium">
                                    {heroDesc}
                                </p>

                                {/* CTAs */}
                                <div className="relative flex flex-wrap gap-6 justify-center reveal" style={{ transitionDelay: '200ms' }}>
                                    <Link href={heroLink}
                                        className="group relative px-10 py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg shadow-[0_10px_30px_rgba(79,70,229,0.4)] hover:shadow-[0_20px_40px_rgba(79,70,229,0.5)] transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-500 skew-x-12 -ml-4"></div>
                                        <span className="relative flex items-center gap-3">
                                            <i className="fas fa-rocket"></i>
                                            {heroLinkText}
                                        </span>
                                    </Link>

                                    <a href="#fitur"
                                        className="group px-10 py-5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-lg border border-white/20 backdrop-blur-md transition-all duration-300 flex items-center gap-3 hover:border-white/40 shadow-lg hover:shadow-xl"
                                    >
                                        <i className="fas fa-layer-group text-blue-300 group-hover:text-white transition-colors"></i>
                                        Jelajahi Fitur
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Trust Signals */}
                        <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-4 text-white/60 text-sm font-semibold tracking-wide uppercase reveal-left border-t border-white/10 pt-8" style={{ transitionDelay: '400ms' }}>
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-full bg-green-500/20 text-green-400"><i className="fas fa-check"></i></div>
                                <span>Terpercaya</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-full bg-blue-500/20 text-blue-400"><i className="fas fa-shield-alt"></i></div>
                                <span>Data Aman</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-full bg-purple-500/20 text-purple-400"><i className="fas fa-bolt"></i></div>
                                <span>Real-time</span>
                            </div>
                        </div>
                    </div>

                    {/* Slider Indicators */}
                    <div className="absolute bottom-10 right-10 flex gap-3 z-20">
                        {processedSlides.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentSlide(i)}
                                className={`h-1.5 rounded-full transition-all duration-500 ${i === currentSlide ? 'w-10 bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'w-2 bg-white/20 hover:bg-white/40'}`}
                                aria-label={`Go to slide ${i + 1}`}
                            />
                        ))}
                    </div>
                </section>

                {/* Statistics Section */}
                <section id="stats" className="py-12 bg-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.08]">
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #3b82f6 1px, transparent 0)', backgroundSize: '36px 36px' }}></div>
                    </div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" data-stagger="stats" data-countup-group="true">
                            <StatCard
                                icon="fas fa-users"
                                fromColor="#7c3aed"
                                toColor="#3b82f6"
                                count={stats.totalUsers || 0}
                                label="Total Pengguna"
                                className="reveal-left"
                            />
                            <StatCard
                                icon="fas fa-calendar-check"
                                fromColor="#3b82f6"
                                toColor="#7c3aed"
                                count={stats.totalActivities || 0}
                                label="Total Kegiatan"
                                className="reveal-right"
                            />
                            <StatCard
                                icon="fas fa-user-tie"
                                fromColor="#7c3aed"
                                toColor="#3b82f6"
                                count={stats.totalCreators || 0}
                                label="Total Kreator"
                                className="reveal"
                            />
                        </div>
                    </div>
                </section>

                {/* Partners Section */}
                <section id="mitra" className="py-16 bg-white relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="mb-8 reveal">
                            <h3 className="text-3xl font-black text-gray-900 text-center">Mitra Kami</h3>
                            <div className="mt-4 hidden sm:flex justify-center gap-3">
                                <button type="button" onClick={() => scrollMitra(-1)} className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300 ring-1 ring-gray-200">
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                <button type="button" onClick={() => scrollMitra(1)} className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300 ring-1 ring-gray-200">
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>

                        {partners && partners.length > 0 ? (
                            <>
                                <div id="mitraSlider" ref={mitraSliderRef} className="flex justify-start w-full overflow-x-auto gap-6 snap-x snap-mandatory py-2 scroll-smooth pl-4 pr-4 no-scrollbar">
                                    {partners.map((mitra, idx) => (
                                        <a key={idx} href={mitra.website || '#'} target={mitra.website ? '_blank' : '_self'} className="flex-none w-56 snap-start group" rel="noreferrer">
                                            <div className="bg-white rounded-2xl p-4 border-2 border-gray-200 hover:border-[#7c3aed] transition-all duration-300 hover:scale-[1.02]">
                                                <div className="h-28 w-full flex items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                                                    {mitra.logo ? (
                                                        <img src={mitra.logo} alt={`Logo ${mitra.company_name}`} className="max-h-24 object-contain" onError={(e) => e.target.style.display = 'none'} />
                                                    ) : (
                                                        <i className="fas fa-building text-4xl text-gray-400"></i>
                                                    )}
                                                </div>
                                                <div className="mt-3 text-center">
                                                    <p className="text-sm font-semibold text-gray-900 truncate" title={mitra.company_name}>{mitra.company_name}</p>
                                                    {mitra.industry && <p className="text-xs text-gray-600 truncate">{mitra.industry}</p>}
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                                <div className="mt-6 flex sm:hidden justify-center gap-3">
                                    <button type="button" onClick={() => scrollMitra(-1)} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300 ring-1 ring-gray-200">Prev</button>
                                    <button type="button" onClick={() => scrollMitra(1)} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300 ring-1 ring-gray-200">Next</button>
                                </div>
                            </>
                        ) : (
                            <p className="text-gray-600 text-center">Belum ada mitra terdaftar.</p>
                        )}
                    </div>
                </section>

                {/* Features Section */}
                <section id="fitur" className="py-24 bg-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #7c3aed 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-20 reveal">
                            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#7c3aed]/10 to-[#3b82f6]/10 rounded-2xl mb-6 backdrop-blur-sm border border-[#7c3aed]/30">
                                <div className="w-2 h-2 bg-[#7c3aed] rounded-full mr-3 animate-pulse"></div>
                                <span className="text-[#7c3aed] font-semibold tracking-wide">FITUR UTAMA PLATFORM</span>
                            </div>
                            <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6 leading-tight">
                                <span className="text-gray-900">Manajemen Event</span>
                                <span className="text-[#7c3aed]"> Secara Total & Digital</span>
                            </h2>
                            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
                                Semua kebutuhan manajemen event Anda dalam satu platform terintegrasi
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-stagger="features">
                            <FeatureCard
                                icon="fas fa-user-check"
                                title="Pendaftaran Digital"
                                description="Sistem pendaftaran event online yang mudah dan cepat. Peserta dapat mendaftar kapan saja, di mana saja, dengan proses yang ter-record secara digital."
                                points={["Form pendaftaran otomatis", "Validasi data real-time", "Tracking status pendaftaran"]}
                                className="reveal-left"
                            />
                            <FeatureCard
                                icon="fas fa-users-cog"
                                title="Manajemen Peserta & Panitia"
                                description="Kelola peserta dan panitia dengan sistem terpusat. Import/export data, filter pencarian, dan manajemen peran yang ter-record lengkap."
                                points={["Manajemen database peserta", "Penugasan panitia event", "Import/Export Excel"]}
                                className="reveal"
                            />
                            <FeatureCard
                                icon="fas fa-id-card"
                                title="Kartu Peserta Digital"
                                description="Generate kartu peserta digital dengan QR code. Desain customizable, print ready, dan dapat diakses langsung oleh peserta secara digital."
                                points={["QR Code untuk absensi", "Desain customizable", "Print batch atau individual"]}
                                className="reveal-right"
                            />
                            <FeatureCard
                                icon="fas fa-certificate"
                                title="Sertifikat Digital"
                                description="Generate sertifikat digital otomatis untuk semua peserta. Desain profesional, verifikasi digital, dan pengiriman otomatis."
                                points={["Generate otomatis", "Desain profesional", "Verifikasi digital"]}
                                className="reveal-pop"
                            />
                            <FeatureCard
                                icon="fas fa-qrcode"
                                title="Sistem Absensi Digital"
                                description="Absensi menggunakan QR code scanner atau manual. Data absensi ter-record real-time dan dapat diekspor untuk laporan."
                                points={["Scan QR Code", "Realtime tracking", "Export laporan absensi"]}
                                className="reveal-pop"
                            />
                            <FeatureCard
                                icon="fas fa-database"
                                title="Semua Ter-record Digital"
                                description="Semua aktivitas event ter-record secara digital: pendaftaran, pembayaran, absensi, sertifikat, dan dokumentasi. Data aman dan dapat diakses kapan saja."
                                points={["History lengkap", "Backup otomatis", "Analytics & reporting"]}
                                className="reveal-pop"
                            />
                        </div>
                    </div>
                </section>

                {/* Workflow Section */}
                <section className="py-24 bg-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #7c3aed 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                    </div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-20 reveal">
                            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#7c3aed]/10 to-[#3b82f6]/10 rounded-2xl mb-6 backdrop-blur-sm border border-[#7c3aed]/30">
                                <div className="w-2 h-2 bg-[#7c3aed] rounded-full mr-3 animate-pulse"></div>
                                <span className="text-[#7c3aed] font-semibold tracking-wide">ALUR KERJA PLATFORM</span>
                            </div>
                            <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6 leading-tight">
                                <span className="text-gray-900">Cara Kerja</span>
                                <span className="text-[#7c3aed]"> Platform Kami</span>
                            </h2>
                            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">Langkah-langkah mudah untuk mengelola event Anda secara digital</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch" data-stagger="workflow">
                            <WorkflowStep number="1" title="Buat Event" description="Lengkapi nama, tanggal, lokasi, kuota, dan detail lainnya" className="reveal-left" />
                            <WorkflowStep number="2" title="Buka Pendaftaran" description="Aktifkan pendaftaran digital, data langsung ter-record" className="reveal" />
                            <WorkflowStep number="3" title="Kelola Peserta" description="Manajemen peserta & panitia, kartu dan sertifikat digital" className="reveal-right" />
                            <WorkflowStep number="4" title="Event Berjalan" description="Absensi QR code, semua aktivitas ter-record dan dapat diekspor" className="reveal" />
                        </div>
                    </div>
                </section>

            </div>
        </WebLayout>
    );
}

// Sub-components for cleaner code

function StatCard({ icon, fromColor, toColor, count, label, className }) {
    return (
        <div className={`group bg-gradient-to-br from-white to-indigo-50 rounded-3xl p-6 border-2 border-gray-200 hover:border-[#7c3aed] transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl ${className}`}>
            <div className="flex items-center gap-4">
                <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-white"
                    style={{ background: `linear-gradient(135deg, ${fromColor}, ${toColor})` }}
                >
                    <i className={`${icon} text-2xl`}></i>
                </div>
                <div>
                    <div className="text-3xl sm:text-4xl font-black text-gray-900">
                        <CountUp end={count} />
                    </div>
                    <div className="text-sm font-semibold text-gray-600">{label}</div>
                </div>
            </div>
        </div>
    );
}

function FeatureCard({ icon, title, description, points, className }) {
    return (
        <div className={`group bg-gradient-to-br from-white to-indigo-50 rounded-3xl p-8 border-2 border-gray-200 hover:border-[#7c3aed] transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl ${className}`}>
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-3xl mb-6 group-hover:from-[#6d28d9] group-hover:to-[#2563eb] transition-all duration-500 transform hover:-translate-y-1 shadow-lg group-hover:shadow-indigo-500/40">
                <i className={`${icon} text-3xl text-white`}></i>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-4 group-hover:text-[#7c3aed] transition-colors duration-300">{title}</h3>
            <p className="text-gray-700 text-lg leading-relaxed mb-4">
                {description}
            </p>
            <ul className="text-sm text-gray-600 space-y-2">
                {points.map((point, idx) => (
                    <li key={idx} className="flex items-center">
                        <i className="fas fa-check-circle text-[#7c3aed] mr-2"></i>
                        {point}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function WorkflowStep({ number, title, description, className }) {
    return (
        <div className={`text-center group ${className}`}>
            <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 hover:border-[#7c3aed] transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl h-full">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-full mb-6 text-white font-black text-2xl">{number}</div>
                <h3 className="text-2xl font-black text-gray-900 mb-4">{title}</h3>
                <p className="text-gray-700 leading-relaxed">{description}</p>
            </div>
        </div>
    );
}

function CountUp({ end }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const animated = useRef(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !animated.current) {
                    animated.current = true;
                    let start = 0;
                    const duration = 2000;
                    const startTime = performance.now();

                    const animate = (currentTime) => {
                        const elapsed = currentTime - startTime;
                        const progress = Math.min(elapsed / duration, 1);

                        // Easing function
                        const easeOut = 1 - Math.pow(1 - progress, 3);

                        setCount(Math.floor(easeOut * end));

                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        } else {
                            setCount(end);
                        }
                    };

                    requestAnimationFrame(animate);
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => observer.disconnect();
    }, [end]);

    return <span ref={ref}>{count.toLocaleString('id-ID')}</span>;
}
