import React, { useState, useEffect, useRef } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';

export default function Home({ heroSlides = [], stats = {}, partners = [], specialActivities = [], latestActivities = [], latestNews = [] }) {
    const { auth } = usePage().props;
    const [currentSlide, setCurrentSlide] = useState(0);
    const mitraSliderRef = useRef(null);

    // Process hero slides to ensure uniform format
    const processedSlides = heroSlides.length > 0 ? heroSlides.map(slide => {
        if (typeof slide === 'string') {
            return { image: slide };
        }
        return slide;
    }) : [{ image: '/assets/images/hero/defoult.webp' }];

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
        <WebLayout hasHeaderSpacer={false} transparentNavbar={true}>
            <Head title="Home" />
            
            <style dangerouslySetInnerHTML={{ __html: `
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
            `}} />

            <div className="min-h-screen bg-gradient-to-br from-white via-white to-white relative overflow-hidden font-sans">
                
                {/* Hero Section */}
                <section className="relative min-h-[80vh] overflow-hidden flex items-center">
                    {processedSlides.map((slide, index) => (
                        <div 
                            key={index}
                            className={`hero-slide absolute inset-0 transition-opacity duration-1000 ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
                            style={{ 
                                backgroundImage: `url('${slide.image}')`, 
                                backgroundSize: 'cover', 
                                backgroundPosition: 'center' 
                            }}
                        >
                            <div className="hero-gradient-overlay"></div>
                            <div className="hero-gradient-overlay-top"></div>
                        </div>
                    ))}

                    <div className="relative z-10 flex items-center justify-center h-full px-4 sm:px-6 lg:px-8 w-full">
                        <div id="heroContent" className="hero-content text-center max-w-5xl mx-auto bg-white/10 backdrop-blur-md rounded-3xl px-6 py-8 ring-1 ring-white/20 reveal show">
                            <h1 id="heroTitle" className="hero-title text-4xl sm:text-5xl lg:text-6xl font-black mb-6 leading-tight tracking-tight text-white">
                                Platform Manajemen Event Digital Profesional
                            </h1>
                            <p className="text-lg sm:text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
                                Kelola pendaftaran, peserta, panitia, pembayaran, absensi, kartu, dan sertifikat dalam satu platform terintegrasi yang aman dan modern.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Link href={route('activity.index')} 
                                   className="group cta-primary cta-shimmer inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#7c3aed] to-[#3b82f6] text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:shadow-2xl">
                                    <i className="fas fa-rocket text-white text-lg mr-3"></i>
                                    <span>Mulai Kelola Event</span>
                                </Link>
                                
                                {/* Guest Check */}
                                {!auth?.user && (
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.toggleLoginDropdown) window.toggleLoginDropdown();
                                        }}
                                        className="group cta-secondary cta-shimmer inline-flex items-center px-8 py-4 bg-white/15 text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:bg-white/25 ring-1 ring-white/30"
                                    >
                                        <i className="fas fa-user-plus text-white text-lg mr-3"></i>
                                        <span>Daftar Sekarang</span>
                                    </button>
                                )}

                                <a href="#fitur" className="group cta-tertiary cta-shimmer inline-flex items-center px-8 py-4 bg-white/10 text-white font-bold text-lg rounded-2xl transition-all duration-300 hover:bg-white/20 ring-1 ring-white/20">
                                    <i className="fas fa-layer-group text-white text-lg mr-3"></i>
                                    <span>Jelajahi Fitur</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Slider Dots */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-3 z-20">
                        {processedSlides.map((_, i) => (
                            <button 
                                key={i}
                                className={`slider-dot w-3 h-3 rounded-full transition-all duration-300 ${i === currentSlide ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/75'}`}
                                onClick={() => setCurrentSlide(i)}
                            ></button>
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
