import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Head, Link, router, usePage } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import EditableText from '@/Components/EditableText';
import Swal from 'sweetalert2';

export default function Home({ heroSlides = [], stats = {}, partners = [], specialActivities = [], latestActivities = [], latestNews = [] }) {
    const { t } = useTranslation();
    const { auth, appSettings } = usePage().props;
    const [currentSlide, setCurrentSlide] = useState(0);
    const [editMode, setEditMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const mitraSliderRef = useRef(null);
    const bgInputRef = useRef(null);
    const rightImageInputRef = useRef(null);
    const layerSaveTimer = useRef(null);

    const canEdit = !!(auth?.user && (auth.user.role === 'superadmin' || auth.user.is_super_admin || auth.user.role === 'admin'));

    const heroBg1 = appSettings?.hero_background_1 || null;
    const rightImage = appSettings?.hero_slide3_right_image || '/assets/images/hero/tablet.png';

    const parseLayer = (settings) => ({
        overlay: Math.min(0.95, Math.max(0, parseFloat(settings?.home_hero_overlay ?? '0.45') || 0.45)),
        bgOpacity: Math.min(1, Math.max(0.05, parseFloat(settings?.home_hero_bg_opacity ?? '0.75') || 0.75)),
        brightness: Math.min(1.6, Math.max(0.4, parseFloat(settings?.home_hero_bg_brightness ?? '1') || 1)),
    });

    const [heroCopy, setHeroCopy] = useState({
        badge: appSettings?.home_hero_badge || t('home.badge'),
        titleBefore: appSettings?.home_hero_title_before || t('home.hero_title_before'),
        titleAccent: appSettings?.home_hero_title_accent || t('home.hero_title_accent'),
        titleAfter: appSettings?.home_hero_title_after || t('home.hero_title_after'),
        desc: appSettings?.home_hero_desc || t('home.hero_desc'),
        ctaPrimary: appSettings?.home_hero_cta_primary || t('home.start_managing'),
        ctaSecondary: appSettings?.home_hero_cta_secondary || t('home.explore_features'),
    });
    const [heroLayer, setHeroLayer] = useState(() => parseLayer(appSettings));

    useEffect(() => {
        setHeroCopy({
            badge: appSettings?.home_hero_badge || t('home.badge'),
            titleBefore: appSettings?.home_hero_title_before || t('home.hero_title_before'),
            titleAccent: appSettings?.home_hero_title_accent || t('home.hero_title_accent'),
            titleAfter: appSettings?.home_hero_title_after || t('home.hero_title_after'),
            desc: appSettings?.home_hero_desc || t('home.hero_desc'),
            ctaPrimary: appSettings?.home_hero_cta_primary || t('home.start_managing'),
            ctaSecondary: appSettings?.home_hero_cta_secondary || t('home.explore_features'),
        });
        setHeroLayer(parseLayer(appSettings));
    }, [appSettings, t]);

    useEffect(() => {
        const sync = () => setEditMode(localStorage.getItem('editMode') === 'true' && canEdit);
        sync();
        window.addEventListener('editModeChanged', sync);
        return () => {
            window.removeEventListener('editModeChanged', sync);
            if (layerSaveTimer.current) clearTimeout(layerSaveTimer.current);
        };
    }, [canEdit]);

    useEffect(() => {
        const scrollToHash = () => {
            let hash = (window.location.hash || '').replace('#', '');
            try {
                const stored = sessionStorage.getItem('homeScrollSection');
                if (stored) {
                    hash = stored;
                    sessionStorage.removeItem('homeScrollSection');
                    if (stored === 'home') {
                        window.history.replaceState(null, '', '/');
                    } else {
                        window.history.replaceState(null, '', `/#${stored}`);
                    }
                }
            } catch { /* ignore */ }

            if (!hash || hash === 'home') {
                if (hash === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            const el = document.getElementById(hash);
            if (!el) return;
            window.setTimeout(() => {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        };

        scrollToHash();
        window.addEventListener('hashchange', scrollToHash);
        return () => window.removeEventListener('hashchange', scrollToHash);
    }, []);

    const stripHtml = (value) => (value || '').replace(/<[^>]*>/g, '').trim();

    const formatHomeDate = (value) => {
        if (!value) return '';
        try {
            return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return '';
        }
    };

    const saveHeroField = (key, value) => {
        if (!canEdit) return;
        setSaving(true);
        router.post(route('settings.update'), { [key]: value }, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setSaving(false);
            },
            onError: () => {
                setSaving(false);
                Swal.fire('Gagal', 'Tidak bisa menyimpan perubahan.', 'error');
            },
        });
    };

    const updateHeroLayer = (key, settingKey, value) => {
        if (!canEdit) return;
        const next = { ...heroLayer, [key]: value };
        setHeroLayer(next);
        if (layerSaveTimer.current) clearTimeout(layerSaveTimer.current);
        layerSaveTimer.current = setTimeout(() => {
            saveHeroField(settingKey, String(Math.round(value * 100) / 100));
        }, 350);
    };

    const uploadHeroImage = (field, file) => {
        if (!canEdit || !file) return;
        if (!file.type?.startsWith('image/')) {
            Swal.fire('Format tidak valid', 'Unggah file gambar (jpg/png/webp).', 'warning');
            return;
        }
        setSaving(true);
        router.post(route('settings.update'), { [field]: file }, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setSaving(false);
                Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Gambar diperbarui', showConfirmButton: false, timer: 1600 });
            },
            onError: () => {
                setSaving(false);
                Swal.fire('Gagal', 'Upload gambar gagal.', 'error');
            },
        });
    };

    // Global Settings Logic
    const heroAnim = appSettings?.hero_animation_style || 'circles';
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
                .cta-primary:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 14px 28px rgba(249,184,70,.4);filter:saturate(1.1)}
                .cta-primary:hover i{transform:translateX(2px);animation:ctaIconNudge .4s ease}
                .cta-secondary{transition:transform .2s ease,box-shadow .2s ease}
                .cta-secondary:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(255,255,255,.18)}
                .cta-secondary:hover i{transform:scale(1.05);animation:ctaIconPulse .5s ease}
                .cta-tertiary{transition:transform .2s ease,box-shadow .2s ease}
                .cta-tertiary:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(255,255,255,.2)}
                .cta-tertiary:hover i{transform:translateX(1px);animation:ctaIconNudge .4s ease}
                .cta-shimmer{position:relative;overflow:hidden}
                .cta-shimmer::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.35) 50%,rgba(255,255,255,0) 100%);transform:translateX(-100%);opacity:0;pointer-events:none}
                .cta-shimmer:hover::after{animation:ctaShimmer .9s ease;opacity:1}
                .cta-primary:focus-visible{outline:none;transform:translateY(-2px) scale(1.02);box-shadow:0 0 0 3px rgba(249,184,70,.45),0 14px 28px rgba(249,184,70,.35)}
                .cta-secondary:focus-visible{outline:none;transform:translateY(-2px);box-shadow:0 0 0 3px rgba(255,255,255,.35),0 10px 20px rgba(255,255,255,.18)}
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

            <div
                className="min-h-screen relative overflow-hidden"
                style={{ fontFamily: "'Plus Jakarta Sans', 'Outfit', sans-serif" }}
            >
                {/* Hero Section — full first viewport (100dvh) */}
                <section id="home" className={`relative h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden bg-[#060b26] scroll-mt-16 ${editMode ? 'ring-2 ring-inset ring-amber-400/40' : ''}`}>
                    {/* Atmosphere + optional custom background */}
                    <div className="pointer-events-none absolute inset-0">
                        {heroBg1 && (
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-[opacity,filter] duration-200"
                                style={{
                                    backgroundImage: `url('${heroBg1}')`,
                                    opacity: heroLayer.bgOpacity,
                                    filter: `brightness(${heroLayer.brightness})`,
                                }}
                            />
                        )}
                        <div
                            className="absolute inset-0 transition-opacity duration-200"
                            style={{ backgroundColor: `rgba(6, 11, 38, ${heroLayer.overlay})` }}
                        />
                        <div className="absolute inset-0 opacity-[0.18]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,255,0.55) 1px, transparent 0)', backgroundSize: '28px 28px' }} />
                        <div className="absolute -top-24 left-1/4 w-[42rem] h-[42rem] rounded-full blur-3xl opacity-40" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.35), transparent 65%)' }} />
                        <div className="absolute top-1/3 right-0 w-[36rem] h-[36rem] rounded-full blur-3xl opacity-35" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35), transparent 65%)' }} />
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#060b26] to-transparent" />
                    </div>

                    {editMode && (
                        <div className="fixed left-3 sm:left-4 top-20 sm:top-24 z-[40] w-[min(17.5rem,calc(100vw-1.5rem))] max-h-[calc(100dvh-6.5rem)] overflow-y-auto rounded-2xl border border-amber-300/40 bg-slate-950/95 backdrop-blur-md shadow-2xl shadow-black/40 p-3 pointer-events-auto">
                            <div className="flex items-center justify-between gap-2 mb-3">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-300">
                                    Pengaturan Hero
                                </p>
                                <div className="flex items-center gap-1.5">
                                    {saving && (
                                        <span className="text-[10px] text-amber-200/90">Menyimpan…</span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            localStorage.setItem('editMode', 'false');
                                            window.dispatchEvent(new Event('editModeChanged'));
                                        }}
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/90 hover:bg-rose-500 text-white text-[10px] font-bold"
                                        title="Stop mode edit"
                                    >
                                        <i className="fas fa-times"></i>
                                        Stop
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => bgInputRef.current?.click()}
                                disabled={saving}
                                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-amber-400 text-slate-900 text-xs font-bold shadow-lg hover:bg-amber-300 disabled:opacity-60 mb-3"
                            >
                                <i className="fas fa-image"></i>
                                Ganti Background
                            </button>
                            <input
                                ref={bgInputRef}
                                type="file"
                                accept="image/png,image/jpeg,image/webp,image/jpg"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = '';
                                    uploadHeroImage('hero_background_1', file);
                                }}
                            />

                            <div className="space-y-3">
                                <label className="block">
                                    <div className="flex items-center justify-between text-[11px] text-slate-200 mb-1">
                                        <span>Kecerahan latar</span>
                                        <span className="tabular-nums text-amber-200">{Math.round(heroLayer.brightness * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="40"
                                        max="160"
                                        step="5"
                                        value={Math.round(heroLayer.brightness * 100)}
                                        onChange={(e) => updateHeroLayer('brightness', 'home_hero_bg_brightness', Number(e.target.value) / 100)}
                                        className="w-full accent-amber-400"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                        <span>Gelapkan</span>
                                        <span>Cerahkan</span>
                                    </div>
                                </label>

                                <label className="block">
                                    <div className="flex items-center justify-between text-[11px] text-slate-200 mb-1">
                                        <span>Kejelasan background</span>
                                        <span className="tabular-nums text-amber-200">{Math.round(heroLayer.bgOpacity * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="100"
                                        step="5"
                                        value={Math.round(heroLayer.bgOpacity * 100)}
                                        onChange={(e) => updateHeroLayer('bgOpacity', 'home_hero_bg_opacity', Number(e.target.value) / 100)}
                                        className="w-full accent-amber-400"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                        <span>Samarkan</span>
                                        <span>Jelas</span>
                                    </div>
                                </label>

                                <label className="block">
                                    <div className="flex items-center justify-between text-[11px] text-slate-200 mb-1">
                                        <span>Transparansi overlay</span>
                                        <span className="tabular-nums text-amber-200">{Math.round((1 - heroLayer.overlay) * 100)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max="100"
                                        step="5"
                                        value={Math.round((1 - heroLayer.overlay) * 100)}
                                        onChange={(e) => updateHeroLayer('overlay', 'home_hero_overlay', 1 - (Number(e.target.value) / 100))}
                                        className="w-full accent-amber-400"
                                    />
                                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                                        <span>Lebih gelap</span>
                                        <span>Lebih transparan</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-[4.75rem] sm:pt-[5.25rem] pb-4 sm:pb-5 flex flex-col min-h-0">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center flex-1 min-h-0">
                            {/* Copy */}
                            <div className="lg:col-span-6 flex flex-col justify-center min-h-0">
                                <div className="inline-flex self-start items-center gap-2 px-3.5 py-1 rounded-full border border-[#f9b846]/55 bg-[#f9b846]/10 text-[#f9b846] text-[11px] sm:text-xs font-semibold mb-3 sm:mb-4 shadow-[0_0_24px_rgba(249,184,70,0.15)]">
                                    <i className="fas fa-star text-[10px]"></i>
                                    <EditableText
                                        tagName="span"
                                        isEditing={editMode}
                                        value={heroCopy.badge}
                                        placeholder="Badge hero"
                                        onChange={(v) => {
                                            setHeroCopy((s) => ({ ...s, badge: v }));
                                            saveHeroField('home_hero_badge', v);
                                        }}
                                    />
                                </div>

                                <h1
                                    id="heroTitle"
                                    className="font-extrabold tracking-tight text-white leading-[1.08] mb-3 sm:mb-4"
                                    style={{
                                        fontFamily: "'Outfit', 'Plus Jakarta Sans', sans-serif",
                                        fontSize: 'clamp(1.75rem, 2.1vw + 1.1rem, 3.5rem)',
                                    }}
                                >
                                    <EditableText
                                        tagName="span"
                                        isEditing={editMode}
                                        value={heroCopy.titleBefore}
                                        placeholder="Judul sebelum"
                                        className="inline"
                                        onChange={(v) => {
                                            setHeroCopy((s) => ({ ...s, titleBefore: v }));
                                            saveHeroField('home_hero_title_before', v);
                                        }}
                                    />{' '}
                                    <EditableText
                                        tagName="span"
                                        isEditing={editMode}
                                        value={heroCopy.titleAccent}
                                        placeholder="Aksen"
                                        className="inline bg-gradient-to-r from-[#38bdf8] via-[#818cf8] to-[#c084fc] bg-clip-text text-transparent"
                                        onChange={(v) => {
                                            setHeroCopy((s) => ({ ...s, titleAccent: v }));
                                            saveHeroField('home_hero_title_accent', v);
                                        }}
                                    />{' '}
                                    <EditableText
                                        tagName="span"
                                        isEditing={editMode}
                                        value={heroCopy.titleAfter}
                                        placeholder="Judul setelah"
                                        className="inline"
                                        onChange={(v) => {
                                            setHeroCopy((s) => ({ ...s, titleAfter: v }));
                                            saveHeroField('home_hero_title_after', v);
                                        }}
                                    />
                                </h1>

                                <EditableText
                                    tagName="p"
                                    isEditing={editMode}
                                    value={heroCopy.desc}
                                    placeholder="Deskripsi hero"
                                    className="text-white/75 leading-relaxed max-w-xl mb-4 sm:mb-5 block"
                                    style={{ fontSize: 'clamp(0.875rem, 0.35vw + 0.75rem, 1.05rem)' }}
                                    onChange={(v) => {
                                        setHeroCopy((s) => ({ ...s, desc: v }));
                                        saveHeroField('home_hero_desc', v);
                                    }}
                                />

                                <div className="flex flex-wrap gap-2.5 sm:gap-3">
                                    <Link
                                        href={editMode ? '#' : route('activity.index')}
                                        onClick={(e) => { if (editMode) e.preventDefault(); }}
                                        className="cta-primary cta-shimmer inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-[#1a1205] font-bold text-sm shadow-[0_12px_30px_rgba(249,184,70,0.35)]"
                                        style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 45%, #ea580c 100%)' }}
                                    >
                                        <i className="fas fa-rocket"></i>
                                        <EditableText
                                            tagName="span"
                                            isEditing={editMode}
                                            value={heroCopy.ctaPrimary}
                                            placeholder="CTA utama"
                                            onChange={(v) => {
                                                setHeroCopy((s) => ({ ...s, ctaPrimary: v }));
                                                saveHeroField('home_hero_cta_primary', v);
                                            }}
                                        />
                                    </Link>
                                    <a
                                        href={editMode ? '#' : '#fitur'}
                                        onClick={(e) => { if (editMode) e.preventDefault(); }}
                                        className="cta-secondary inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl border border-white/25 bg-white/5 text-white font-semibold text-sm backdrop-blur-md hover:bg-white/10"
                                    >
                                        <i className="fas fa-layer-group"></i>
                                        <EditableText
                                            tagName="span"
                                            isEditing={editMode}
                                            value={heroCopy.ctaSecondary}
                                            placeholder="CTA sekunder"
                                            onChange={(v) => {
                                                setHeroCopy((s) => ({ ...s, ctaSecondary: v }));
                                                saveHeroField('home_hero_cta_secondary', v);
                                            }}
                                        />
                                    </a>
                                </div>
                            </div>

                            {/* Visual */}
                            <div className="lg:col-span-6 relative hidden sm:flex items-center justify-center min-h-0 h-full">
                                <div className="absolute inset-0 rounded-full blur-3xl opacity-50" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.35), transparent 60%)' }} />
                                <div className={`relative z-10 ${editMode ? 'outline-dashed outline-2 outline-amber-400/70 rounded-2xl p-1' : ''}`}>
                                    <img
                                        src={rightImage}
                                        alt="Digital event management"
                                        className="w-auto max-w-full object-contain drop-shadow-[0_30px_60px_rgba(56,189,248,0.25)]"
                                        style={{ maxHeight: 'min(46vh, 420px)' }}
                                        onError={(e) => { e.currentTarget.src = '/assets/images/hero/tablet.png'; }}
                                    />
                                    {editMode && (
                                        <button
                                            type="button"
                                            onClick={() => rightImageInputRef.current?.click()}
                                            disabled={saving}
                                            className="absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-400 text-slate-900 text-xs font-bold shadow-lg hover:bg-amber-300 disabled:opacity-60"
                                        >
                                            <i className="fas fa-camera"></i>
                                            Ganti Gambar
                                        </button>
                                    )}
                                    <input
                                        ref={rightImageInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp,image/jpg"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            e.target.value = '';
                                            uploadHeroImage('hero_slide3_right_image', file);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Statistics — pinned to bottom of first viewport */}
                        <div id="stats" className="mt-3 sm:mt-4 grid grid-cols-1 md:grid-cols-3 gap-2.5 sm:gap-3 flex-shrink-0" data-countup-group="true">
                            <HeroStatCard
                                icon="fas fa-users"
                                fromColor="#7c3aed"
                                toColor="#3b82f6"
                                count={stats.totalUsers || 0}
                                label={t('home.total_users')}
                            />
                            <HeroStatCard
                                icon="fas fa-calendar-check"
                                fromColor="#3b82f6"
                                toColor="#7c3aed"
                                count={stats.totalActivities || 0}
                                label={t('home.total_activities')}
                            />
                            <HeroStatCard
                                icon="fas fa-user-tie"
                                fromColor="#7c3aed"
                                toColor="#3b82f6"
                                count={stats.totalCreators || 0}
                                label={t('home.total_creators')}
                            />
                        </div>
                    </div>
                </section>

                {/* About — one-page preview */}
                <section id="about" className="py-12 sm:py-16 bg-white relative scroll-mt-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14 items-center">
                            <div className="reveal">
                                <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#7c3aed]/10 border border-[#7c3aed]/20 text-[#7c3aed] text-xs font-bold tracking-wide mb-4">
                                    {t('home.section_about_badge')}
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black text-gray-900 mb-4 leading-tight">
                                    {t('home.section_about_title')}
                                </h2>
                                <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-6">
                                    {t('home.section_about_desc')}
                                </p>
                                <div className="grid sm:grid-cols-2 gap-4 mb-8">
                                    {[
                                        { icon: 'fas fa-shield-alt', title: t('about.feature_security_title'), desc: t('about.feature_security_desc') },
                                        { icon: 'fas fa-rocket', title: t('about.feature_performance_title'), desc: t('about.feature_performance_desc') },
                                    ].map((item) => (
                                        <div key={item.title} className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
                                            <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 text-[#7c3aed] flex items-center justify-center mb-3">
                                                <i className={item.icon}></i>
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-sm mb-1">{item.title}</h3>
                                            <p className="text-xs text-gray-500 line-clamp-2">{item.desc}</p>
                                        </div>
                                    ))}
                                </div>
                                <Link
                                    href="/about"
                                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-bold shadow-lg shadow-[#7c3aed]/25 transition-all"
                                >
                                    {t('home.read_more')}
                                    <i className="fas fa-arrow-right text-xs"></i>
                                </Link>
                            </div>
                            <div className="relative reveal-right">
                                <img
                                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-1.2.1&auto=format&fit=crop&w=900&q=80"
                                    alt="About"
                                    className="rounded-3xl shadow-2xl w-full object-cover h-[280px] sm:h-[380px]"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* News — one-page preview */}
                <section id="news" className="py-12 sm:py-16 bg-slate-50 relative scroll-mt-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 reveal">
                            <div>
                                <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/20 text-[#2563eb] text-xs font-bold tracking-wide mb-3">
                                    {t('home.section_news_badge')}
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black text-gray-900">{t('home.section_news_title')}</h2>
                                <p className="text-gray-600 mt-2 max-w-xl">{t('home.section_news_desc')}</p>
                            </div>
                            <Link href="/news" className="inline-flex items-center gap-2 text-sm font-bold text-[#7c3aed] hover:text-[#6d28d9]">
                                {t('home.view_all_news')}
                                <i className="fas fa-arrow-right text-xs"></i>
                            </Link>
                        </div>

                        {latestNews && latestNews.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                                {latestNews.slice(0, 4).map((news) => (
                                    <article key={news.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all group flex flex-col">
                                        <Link href={route('news.show', news.slug)} className="block aspect-video overflow-hidden bg-gray-100">
                                            <img
                                                src={news.image || '/assets/images/hero/default.webp'}
                                                alt={news.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/images/hero/default.webp'; }}
                                            />
                                        </Link>
                                        <div className="p-4 flex flex-col flex-1">
                                            <p className="text-[11px] text-gray-500 mb-2">
                                                <i className="far fa-calendar-alt mr-1.5"></i>
                                                {formatHomeDate(news.published_at || news.created_at)}
                                            </p>
                                            <Link href={route('news.show', news.slug)}>
                                                <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-[#7c3aed] transition-colors mb-2">
                                                    {news.title}
                                                </h3>
                                            </Link>
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                                                {news.excerpt || `${stripHtml(news.content).slice(0, 100)}…`}
                                            </p>
                                            <Link href={route('news.show', news.slug)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7c3aed]">
                                                {t('home.read_more')}
                                                <i className="fas fa-arrow-right text-[10px]"></i>
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-10">{t('home.no_news')}</p>
                        )}
                    </div>
                </section>

                {/* Kegiatan — one-page preview */}
                <section id="kegiatan" className="py-12 sm:py-16 bg-white relative scroll-mt-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 reveal">
                            <div>
                                <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#db2777]/10 border border-[#db2777]/20 text-[#db2777] text-xs font-bold tracking-wide mb-3">
                                    {t('home.section_activities_badge')}
                                </div>
                                <h2 className="text-3xl sm:text-4xl font-black text-gray-900">{t('home.section_activities_title')}</h2>
                                <p className="text-gray-600 mt-2 max-w-xl">{t('home.section_activities_desc')}</p>
                            </div>
                            <Link href="/activity" className="inline-flex items-center gap-2 text-sm font-bold text-[#7c3aed] hover:text-[#6d28d9]">
                                {t('home.view_all_activities')}
                                <i className="fas fa-arrow-right text-xs"></i>
                            </Link>
                        </div>

                        {latestActivities && latestActivities.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                {latestActivities.slice(0, 6).map((activity) => (
                                    <article key={activity.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-all group flex flex-col">
                                        <Link href={route('activity.detail', activity.id)} className="block aspect-video overflow-hidden bg-gray-100">
                                            <img
                                                src={activity.image || '/assets/images/hero/default.webp'}
                                                alt={activity.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/assets/images/hero/default.webp'; }}
                                            />
                                        </Link>
                                        <div className="p-5 flex flex-col flex-1">
                                            <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-2">
                                                {activity.category?.name && (
                                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 font-semibold text-gray-700">
                                                        {activity.category.name}
                                                    </span>
                                                )}
                                                <span>
                                                    <i className="far fa-calendar-alt mr-1"></i>
                                                    {formatHomeDate(activity.date)}
                                                </span>
                                            </div>
                                            <Link href={route('activity.detail', activity.id)}>
                                                <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-[#7c3aed] transition-colors mb-2">
                                                    {activity.name}
                                                </h3>
                                            </Link>
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-4 flex-1">
                                                {stripHtml(activity.description).slice(0, 120) || '—'}
                                            </p>
                                            <Link href={route('activity.detail', activity.id)} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7c3aed]">
                                                {t('home.read_more')}
                                                <i className="fas fa-arrow-right text-[10px]"></i>
                                            </Link>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-10">{t('home.no_activities')}</p>
                        )}
                    </div>
                </section>

                {/* Mitra Section */}
                <section id="mitra" className="py-10 sm:py-14 bg-white relative">
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
                <section id="fitur" className="py-10 sm:py-16 bg-white relative overflow-hidden">
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
                <section className="py-10 sm:py-16 bg-white relative overflow-hidden">
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

function HeroStatCard({ icon, fromColor, toColor, count, label }) {
    return (
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl px-3.5 sm:px-4 py-3 sm:py-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
            <div className="flex items-center gap-3 sm:gap-4">
                <div
                    className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl text-white flex-shrink-0 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${fromColor}, ${toColor})` }}
                >
                    <i className={`${icon} text-lg`}></i>
                </div>
                <div className="min-w-0">
                    <div className="text-2xl sm:text-3xl font-extrabold text-white leading-none">
                        <CountUp end={count} />
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-white/65 mt-1 truncate">{label}</div>
                </div>
            </div>
            <div
                className="absolute inset-x-0 bottom-0 h-[3px]"
                style={{ background: `linear-gradient(to right, ${fromColor}, ${toColor})` }}
            />
        </div>
    );
}

function FeatureCard({ icon, title, description, points, className }) {
    return (
        <div className={`group bg-gradient-to-br from-white to-indigo-50 rounded-3xl p-6 sm:p-8 border-2 border-gray-200 hover:border-[#7c3aed] transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl h-full ${className}`}>
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-3xl mb-6 group-hover:from-[#6d28d9] group-hover:to-[#2563eb] transition-all duration-500 transform hover:-translate-y-1 shadow-lg group-hover:shadow-indigo-500/40">
                <i className={`${icon} text-2xl sm:text-3xl text-white`}></i>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-4 group-hover:text-[#7c3aed] transition-colors duration-300">{title}</h3>
            <p className="text-gray-700 text-base sm:text-lg leading-relaxed mb-4">
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
        <div className={`text-center group h-full ${className}`}>
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-gray-200 hover:border-[#7c3aed] transition-all duration-500 transform hover:-translate-y-1 shadow-lg hover:shadow-xl h-full">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[#7c3aed] to-[#3b82f6] rounded-full mb-6 text-white font-black text-xl sm:text-2xl">{number}</div>
                <h3 className="text-xl sm:text-2xl font-black text-gray-900 mb-4">{title}</h3>
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{description}</p>
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
