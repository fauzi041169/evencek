import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Head, Link, usePage } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';

const PERF_STEP_LABELS = {
    special_activities: 'Aktivitas khusus',
    latest_activities: 'Aktivitas terbaru',
    latest_news: 'Berita',
    partners: 'Mitra',
    stats: 'Statistik',
    hero_slides: 'Hero / Slider',
};

export default function Home({ heroSlides = [], stats = {}, partners = [], specialActivities = [], latestActivities = [], latestNews = [], perfDebug = null }) {
    const { t } = useTranslation();
    const { auth, appSettings } = usePage().props;
    const [currentSlide, setCurrentSlide] = useState(0);
    const mitraSliderRef = useRef(null);
    const [perfInfo, setPerfInfo] = useState(null);
    const [perfPanelOpen, setPerfPanelOpen] = useState(true);

    // Global Settings Logic
    const heroAnim = appSettings?.hero_animation_style || 'circles';
    const heroBg1 = appSettings?.hero_background_1 || null;
    const heroBg2 = appSettings?.hero_background_2 || null;
    const heroBg3 = appSettings?.hero_background_3 || null;
    const accent = appSettings?.colors?.warning || appSettings?.colors?.accent || '#f59e0b';

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

    const processedSlides = (heroBg1 || heroBg2 || heroBg3)
        ? [heroBg1, heroBg2, heroBg3].filter(Boolean).map(img => ({ image: getStorageUrl(img) }))
        : (heroSlides.length > 0 ? heroSlides.map(slide => {
            if (typeof slide === 'string') return { image: getStorageUrl(slide) };
            return { ...slide, image: getStorageUrl(slide.image) };
        }) : [{ image: '/assets/images/hero/defoult.webp' }]);

    const activeSlide = processedSlides[currentSlide] || {};
    const heroTitles = [
        t('home.hero_title_s1'),
        t('home.hero_title_s2'),
        t('home.hero_title_s3')
    ];
    const heroDescs = [
        t('home.hero_desc_s1'),
        t('home.hero_desc_s2'),
        t('home.hero_desc_s3')
    ];
    const heroTitle = heroTitles[currentSlide % 3] || t('home.hero_title');
    const heroDesc = heroDescs[currentSlide % 3] || t('home.hero_desc');
    const heroLink = route('activity.index');
    const heroLinkText = t('home.start_managing');

    const slideStyles = [
        { container: 'items-center', text: 'text-center', cta: 'justify-center', descMargin: 'mx-auto' },
        { container: 'items-start', text: 'text-left', cta: 'justify-start', descMargin: 'mr-auto ml-0' },
        { container: 'items-end', text: 'text-right', cta: 'justify-end', descMargin: 'ml-auto mr-0' },
    ];
    const currentStyle = slideStyles[currentSlide % slideStyles.length];
    const heroTitleFonts = ['font-sans'];
    const heroDescFonts = ['font-sans'];
    const heroTitleFont = heroTitleFonts[currentSlide % heroTitleFonts.length];
    const heroDescFont = heroDescFonts[currentSlide % heroDescFonts.length];

    // Debug performa: tampilkan hanya saat online dan loading lama
    useEffect(() => {
        if (!perfDebug || appSettings?.isLocal) return;

        const serverMs = perfDebug.serverMs ?? 0;
        const nav = performance.getEntriesByType?.('navigation')?.[0];
        const clientMs = nav && 'loadEventEnd' in nav && nav.loadEventEnd > 0
            ? Math.round(nav.loadEventEnd - (nav.fetchStart || nav.requestStart || 0))
            : 0;
        const totalMs = clientMs > 0 ? clientMs : serverMs;
        const SLOW_THRESHOLD_MS = 2500;
        const isSlow = totalMs >= SLOW_THRESHOLD_MS || serverMs >= 2000;

        if (!isSlow) return;

        const causes = [];
        if (serverMs >= 1500) causes.push('Server memproses lama (query database / gambar)');
        if (clientMs > 0 && clientMs - serverMs >= 1500) causes.push('Laten jaringan tinggi atau koneksi tidak stabil');
        if (clientMs > 0 && clientMs >= 4000) causes.push('Aset (JS/CSS/gambar) berat atau banyak');
        if (causes.length === 0) causes.push('Beban server atau jaringan sedang tinggi');

        setPerfInfo({
            serverMs,
            clientMs: clientMs || null,
            totalMs,
            steps: perfDebug.steps || {},
            causes,
        });
    }, [perfDebug, appSettings?.isLocal]);

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
        <WebLayout hasHeaderSpacer={false} transparentNavbar={true} fluid={true} noPadding={true}>
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

            {/* Debug performa: hanya tampil saat online dan halaman lama loading */}
            {perfInfo && (
                <div className="fixed bottom-4 right-4 z-[9999] max-w-sm">
                    <div className="bg-slate-900/95 text-slate-100 rounded-xl shadow-xl border border-slate-700/50 backdrop-blur overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setPerfPanelOpen((o) => !o)}
                            className="w-full px-4 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-800/80 transition"
                        >
                            <span className="font-medium text-sm flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                Halaman lambat – debug
                            </span>
                            <span className="text-slate-400 text-xs tabular-nums">{perfInfo.totalMs} ms</span>
                        </button>
                        {perfPanelOpen && (
                            <div className="px-4 pb-4 pt-0 space-y-3 text-sm">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-slate-800/60 rounded px-2 py-1.5">
                                        <span className="text-slate-400">Server</span>
                                        <div className="font-mono text-amber-300">{perfInfo.serverMs} ms</div>
                                    </div>
                                    {perfInfo.clientMs != null && (
                                        <div className="bg-slate-800/60 rounded px-2 py-1.5">
                                            <span className="text-slate-400">Total muat</span>
                                            <div className="font-mono text-amber-300">{perfInfo.clientMs} ms</div>
                                        </div>
                                    )}
                                </div>
                                {Object.keys(perfInfo.steps).length > 0 && (
                                    <div>
                                        <div className="text-slate-400 text-xs mb-1">Per komponen (server):</div>
                                        <ul className="space-y-0.5 text-xs">
                                            {Object.entries(perfInfo.steps).map(([key, ms]) => (
                                                <li key={key} className="flex justify-between gap-2">
                                                    <span className="text-slate-300">{PERF_STEP_LABELS[key] || key}</span>
                                                    <span className="font-mono text-amber-300/90">{ms} ms</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div>
                                    <div className="text-slate-400 text-xs mb-1">Kemungkinan penyebab:</div>
                                    <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-xs">
                                        {perfInfo.causes.map((c, i) => (
                                            <li key={i}>{c}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gradient-to-br from-white via-white to-white relative overflow-hidden font-sans">

                {/* Hero Section - full layar 100% viewport */}
                <section className="relative min-h-screen h-screen flex items-center overflow-hidden">
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

                    {/* Background Slider (slide left) */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <div
                            className="w-full h-full flex transition-transform duration-700 ease-in-out"
                            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                        >
                            {processedSlides.map((slide, index) => (
                                <div key={index} className="w-full h-full flex-none relative">
                                    <div
                                        className="absolute inset-0 bg-cover bg-center"
                                        style={{ backgroundImage: `url('${slide.image}')` }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-indigo-950/70 to-slate-900/90"></div>
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent opacity-70"></div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className={`relative z-10 w-full ${currentSlide % 3 === 2 ? 'max-w-none mx-0 px-0' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'} pt-16 sm:pt-24 lg:pt-32 pb-0 sm:pb-10 flex flex-col ${currentSlide % 3 === 2 ? 'items-center' : currentStyle.container} justify-center min-h-full`}>
                        <div className={`${currentSlide % 3 === 2 ? 'max-w-none mx-0' : 'max-w-6xl mx-auto'} ${currentSlide % 3 === 2 ? '' : currentStyle.text}`}>
                            <div id="heroContent" className="relative z-10">
                                {currentSlide % 3 === 1 ? (
                                    <>
                                        <div className="flex flex-wrap items-center gap-2 mb-6">
                                            <span
                                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/10 bg-black/30 backdrop-blur-md"
                                            >
                                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                                {t('home.trusted')}
                                            </span>
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/10 bg-black/30 backdrop-blur-md">
                                                <i className="fas fa-shield-alt text-blue-300"></i>
                                                {t('home.secure_data')}
                                            </span>
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/10 bg-black/30 backdrop-blur-md">
                                                <i className="fas fa-bolt text-amber-300"></i>
                                                {t('home.real_time')}
                                            </span>
                                        </div>
                                        <h1 className={`text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-6 ${heroTitleFont}`}>
                                            <span className="text-white">{heroTitle}</span>
                                        </h1>
                                        <p className={`text-lg sm:text-xl md:text-2xl text-white/90 mb-8 leading-relaxed max-w-2xl ${currentStyle.descMargin} ${heroDescFont}`}>
                                            {heroDesc}
                                        </p>
                                        <div className={`flex flex-wrap gap-4 ${currentStyle.cta}`}>
                                            <Link
                                                href={heroLink}
                                                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-white text-slate-900 font-semibold text-base sm:text-lg shadow-sm hover:shadow-md transition-all"
                                            >
                                                <i className="fas fa-rocket"></i>
                                                {heroLinkText}
                                            </Link>
                                            <a
                                                href="#fitur"
                                                className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl border border-white/20 bg-white/5 text-white font-semibold text-base sm:text-lg hover:bg-white/10 transition-all backdrop-blur-md"
                                            >
                                                <i className="fas fa-play-circle"></i>
                                                {t('home.explore_features')}
                                            </a>
                                        </div>
                                        <div className="absolute inset-0 pointer-events-none"></div>
                                    </>
                                ) : currentSlide % 3 === 2 ? (
                                    <>
                                        <div className="relative w-full max-w-none mx-0 min-h-full">
                                            <div className="relative z-10 grid grid-cols-12 gap-6 sm:gap-10 px-4 sm:px-8 lg:px-12 py-8 sm:py-12">
                                                <div className="col-span-12 lg:col-span-7">
                                                    <div className="inline-flex items-center px-4 py-2 rounded-full bg-black/40 text-white border border-white/10 mb-6">
                                                        <i className="fas fa-star mr-2" style={{ color: appSettings?.colors?.secondary || '#3b82f6' }}></i>
                                                        <span className="font-semibold">{t('home.featured')}</span>
                                                    </div>
                                                    <h1 className={`text-5xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight mb-5 ${heroTitleFont}`}>{heroTitle}</h1>
                                                    <p className={`text-lg sm:text-xl md:text-2xl text-white/90 leading-relaxed mb-8 max-w-2xl ${heroDescFont}`}>{heroDesc}</p>
                                                    <div className="flex flex-wrap gap-4 justify-start">
                                                        <Link href={heroLink} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white text-slate-900 font-semibold shadow-sm hover:shadow-md transition-all">
                                                            <i className="fas fa-rocket"></i>
                                                            {heroLinkText}
                                                        </Link>
                                                        <a href="#video" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold shadow-sm hover:shadow-md transition-all" style={{ backgroundColor: accent, color: '#1f2937' }}>
                                                            <i className="fas fa-play-circle"></i>
                                                            {t('home.watch_video')}
                                                        </a>
                                                    </div>
                                                    <div className="mt-8 grid grid-cols-2 gap-6 max-w-lg">
                                                        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white">
                                                            <div className="text-3xl font-extrabold">99.9%</div>
                                                            <div className="text-xs sm:text-sm text-white/80">{t('home.uptime')}</div>
                                                        </div>
                                                        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 text-white">
                                                            <div className="text-3xl font-extrabold">24/7</div>
                                                            <div className="text-xs sm:text-sm text-white/80">{t('home.support')}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-span-12 lg:col-span-5">
                                                    <div className="relative w-full h-[320px] sm:h-[380px] lg:h-[460px] rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-white/5">
                                                        {appSettings?.hero_slide3_right_image && (
                                                            <img
                                                                src={getStorageUrl(appSettings?.hero_slide3_right_image)}
                                                                alt="Preview"
                                                                className="absolute inset-0 w-full h-full object-cover"
                                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                            />
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-800/40 to-black/20"></div>
                                                        <div className="absolute -right-12 -top-12 w-[420px] h-[420px] rounded-full" style={{ background: `radial-gradient(circle, ${hexToRgba(accent, 0.25)} 0%, transparent 60%)` }}></div>
                                                        {/* badges removed */}
                                                        <div className="absolute bottom-4 right-4 px-4 py-2 rounded-full bg-white/20 text-white backdrop-blur-md border border-white/20">
                                                            <span className="text-xs sm:text-sm font-semibold">{t('home.live')}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="relative mb-6 flex flex-wrap justify-center items-center gap-2">
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/10 bg-black/30 backdrop-blur-md">
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{
                                                        background: `linear-gradient(135deg, ${appSettings?.colors?.primary || '#7c3aed'}, ${appSettings?.colors?.secondary || '#db2777'})`,
                                                    }}
                                                ></span>
                                                {t('nav.home')}
                                            </span>
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/10 bg-black/30 backdrop-blur-md">
                                                <i className="fas fa-calendar-check text-white/80"></i>
                                                {t('activities.latest_activities')}
                                            </span>
                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-xs font-bold border border-white/10 bg-black/30 backdrop-blur-md">
                                                <i className="fas fa-newspaper text-white/80"></i>
                                                {t('nav.news')}
                                            </span>
                                        </div>
                                        <h1 className={`relative text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-8 ${heroTitleFont}`}>
                                            <span className="text-white">{heroTitle}</span>
                                        </h1>
                                        <p className={`relative text-lg sm:text-xl md:text-2xl text-white/90 mb-10 leading-relaxed max-w-3xl ${currentStyle.descMargin} ${heroDescFont}`}>
                                            {heroDesc}
                                        </p>
                                        <div className={`relative flex flex-wrap gap-5 ${currentStyle.cta}`}>
                                            <Link href={heroLink}
                                                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-white text-slate-900 font-semibold text-lg shadow-sm hover:shadow-md transition-all"
                                            >
                                                <i className="fas fa-rocket text-indigo-600"></i>
                                                {heroLinkText}
                                            </Link>
                                            <a href="#fitur"
                                                className="group inline-flex items-center gap-3 px-8 py-4 rounded-xl border border-white/20 bg-white/5 text-white backdrop-blur-md hover:bg-white/10 font-semibold text-lg transition-all"
                                            >
                                                <i className="fas fa-layer-group"></i>
                                                {t('home.explore_features')}
                                            </a>
                                        </div>
                                        <div className="mt-16 flex flex-wrap justify-center items-center gap-4 sm:gap-8">
                                            <div className="flex items-center gap-3 px-5 py-2.5 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 text-white/90 text-sm font-semibold">
                                                <i className="fas fa-check-circle text-emerald-400 text-lg"></i>
                                                <span>{t('home.trusted')}</span>
                                            </div>
                                            <div className="flex items-center gap-3 px-5 py-2.5 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 text-white/90 text-sm font-semibold">
                                                <i className="fas fa-shield-alt text-blue-400 text-lg"></i>
                                                <span>{t('home.secure_data')}</span>
                                            </div>
                                            <div className="flex items-center gap-3 px-5 py-2.5 rounded-lg bg-white/5 backdrop-blur-md border border-white/10 text-white/90 text-sm font-semibold">
                                                <i className="fas fa-bolt text-amber-400 text-lg"></i>
                                                <span>{t('home.real_time')}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
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
                <section id="stats" className="py-2 sm:py-6 bg-white relative overflow-hidden">
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
                                label={t('home.total_users')}
                                className="reveal-left"
                            />
                            <StatCard
                                icon="fas fa-calendar-check"
                                fromColor="#3b82f6"
                                toColor="#7c3aed"
                                count={stats.totalActivities || 0}
                                label={t('home.total_activities')}
                                className="reveal-right"
                            />
                            <StatCard
                                icon="fas fa-user-tie"
                                fromColor="#7c3aed"
                                toColor="#3b82f6"
                                count={stats.totalCreators || 0}
                                label={t('home.total_creators')}
                                className="reveal"
                            />
                        </div>
                    </div>
                </section>

                {/* Mitra Section */}
                <section id="mitra" className="py-2 sm:py-8 bg-white relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="mb-4 sm:mb-8 reveal">
                            <h3 className="text-3xl font-black text-gray-900 text-center">{t('home.our_partners')}</h3>
                            <div className="mt-4 flex justify-center gap-3">
                                <button type="button" onClick={() => scrollMitra(-1)} className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300 ring-1 ring-gray-200">
                                    <i className="fas fa-chevron-left"></i>
                                </button>
                                <button type="button" onClick={() => scrollMitra(1)} className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all duration-300 ring-1 ring-gray-200">
                                    <i className="fas fa-chevron-right"></i>
                                </button>
                            </div>
                        </div>

                        {partners && partners.length > 0 ? (
                            <div id="mitraSlider" ref={mitraSliderRef} className="flex justify-start w-full overflow-x-auto gap-6 snap-x snap-mandatory py-2 scroll-smooth pl-4 pr-4 no-scrollbar">
                                {partners.map((mitra, idx) => (
                                    <a key={idx} href={mitra.website || '#'} target={mitra.website ? '_blank' : '_self'} className="flex-none w-56 snap-start group" rel="noreferrer">
                                        <div className="bg-white rounded-2xl p-3 sm:p-4 border-2 border-gray-200 hover:border-[#7c3aed] transition-all duration-300 hover:scale-[1.02]">
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
                        ) : (
                            <p className="text-gray-600 text-center">{t('home.no_partners')}</p>
                        )}
                    </div>
                </section>

                {/* Features Section */}
                <section id="fitur" className="py-0 sm:py-10 bg-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #7c3aed 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                    </div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-6 sm:mb-16 reveal">
                            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#7c3aed]/10 to-[#3b82f6]/10 rounded-2xl mb-6 backdrop-blur-sm border border-[#7c3aed]/30">
                                <div className="w-2 h-2 bg-[#7c3aed] rounded-full mr-3 animate-pulse"></div>
                                <span className="text-[#7c3aed] font-semibold tracking-wide">{t('home.key_features_badge')}</span>
                            </div>
                            <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6 leading-tight">
                                <span className="text-gray-900">{t('home.main_feature_title_1')}</span>
                                <span className="text-[#7c3aed]">{t('home.main_feature_title_2')}</span>
                            </h2>
                            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
                                {t('home.main_feature_subtitle')}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" data-stagger="features">
                            <FeatureCard
                                icon="fas fa-user-check"
                                title={t('home.feature_1_title')}
                                description={t('home.feature_1_desc')}
                                points={["Form pendaftaran otomatis", "Validasi data real-time", "Tracking status pendaftaran"]}
                                className="reveal-left"
                            />
                            <FeatureCard
                                icon="fas fa-users-cog"
                                title={t('home.feature_2_title')}
                                description={t('home.feature_2_desc')}
                                points={["Manajemen database peserta", "Penugasan panitia event", "Import/Export Excel"]}
                                className="reveal"
                            />
                            <FeatureCard
                                icon="fas fa-id-card"
                                title={t('home.feature_3_title')}
                                description={t('home.feature_3_desc')}
                                points={["QR Code untuk absensi", "Desain customizable", "Print batch atau individual"]}
                                className="reveal-right"
                            />
                            <FeatureCard
                                icon="fas fa-certificate"
                                title={t('home.feature_4_title')}
                                description={t('home.feature_4_desc')}
                                points={["Generate otomatis", "Desain profesional", "Verifikasi digital"]}
                                className="reveal-pop"
                            />
                            <FeatureCard
                                icon="fas fa-qrcode"
                                title={t('home.feature_5_title')}
                                description={t('home.feature_5_desc')}
                                points={["Scan QR Code", "Realtime tracking", "Export laporan absensi"]}
                                className="reveal-pop"
                            />
                            <FeatureCard
                                icon="fas fa-database"
                                title={t('home.feature_6_title')}
                                description={t('home.feature_6_desc')}
                                points={["History lengkap", "Backup otomatis", "Analytics & reporting"]}
                                className="reveal-pop"
                            />
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-0 sm:py-8 bg-white relative overflow-hidden">
                    <div className="absolute inset-0 opacity-5">
                        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #7c3aed 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                    </div>
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="text-center mb-8 sm:mb-16 reveal">
                            <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#7c3aed]/10 to-[#3b82f6]/10 rounded-2xl mb-6 backdrop-blur-sm border border-[#7c3aed]/30">
                                <div className="w-2 h-2 bg-[#7c3aed] rounded-full mr-3 animate-pulse"></div>
                                <span className="text-[#7c3aed] font-semibold tracking-wide">{t('home.workflow_badge')}</span>
                            </div>
                            <h2 className="text-5xl sm:text-6xl font-black text-gray-900 mb-6 leading-tight">
                                <span className="text-gray-900">{t('home.workflow_title_1')}</span>
                                <span className="text-[#7c3aed]">{t('home.workflow_title_2')}</span>
                            </h2>
                            <p className="text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">{t('home.workflow_subtitle')}</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 items-stretch" data-stagger="workflow">
                            <WorkflowStep number="1" title={t('home.step_1_title')} description={t('home.step_1_desc')} className="reveal-left" />
                            <WorkflowStep number="2" title={t('home.step_2_title')} description={t('home.step_2_desc')} className="reveal" />
                            <WorkflowStep number="3" title={t('home.step_3_title')} description={t('home.step_3_desc')} className="reveal-right" />
                            <WorkflowStep number="4" title={t('home.step_4_title')} description={t('home.step_4_desc')} className="reveal" />
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
