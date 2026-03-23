import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Head, usePage, Link } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';

export default function About() {
    const { t } = useTranslation();
    const { flash, appSettings } = usePage().props;
    const [scrolled, setScrolled] = useState(false);
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

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <WebLayout hasHeaderSpacer={false} transparentNavbar={true} fluid={true} noPadding={true}>
            <Head title={`${t('nav.about')} - ${t('about.hero_badge')}`} />
            <style dangerouslySetInnerHTML={{
                __html: `
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

            <div className="bg-white font-sans text-slate-800">

                {/* HERO SECTION */}
                <div className="relative overflow-hidden bg-slate-900 pt-12 pb-4 sm:pt-24 sm:pb-10 lg:pt-32 lg:pb-16">
                    {/* Background Pattern */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                        {/* Base Background */}
                        <div className="absolute inset-0 bg-slate-900 z-0"></div>

                        {appSettings?.hero_background_1 && (
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-60 transition-opacity duration-500 z-0"
                                style={{ backgroundImage: `url('${getStorageUrl(appSettings.hero_background_1)}')` }}
                            />
                        )}
                        {!appSettings?.hero_background_1 && (
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                        )}

                        {/* Gradient Overlay - Adjusted for better visibility */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-slate-900/80 z-10"></div>

                        {/* Dynamic Animations based on Settings */}
                        {(heroAnim === 'circles' || heroAnim === 'blob' || !heroAnim) && (
                            <>
                                <div
                                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] rounded-full blur-[120px] opacity-30 mix-blend-screen animate-blob"
                                    style={{ backgroundColor: hexToRgba(appSettings?.colors?.primary, 0.2) }}
                                ></div>
                                <div
                                    className="absolute bottom-0 right-0 w-[800px] h-[600px] rounded-full blur-[100px] opacity-20 animate-blob animation-delay-2000"
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

                    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-md mb-2 sm:mb-8 animate-fade-in-up">
                            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                            <span className="text-sm font-medium text-slate-300 tracking-wide">{t('about.hero_badge')}</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-2 sm:mb-8 leading-tight max-w-5xl mx-auto">
                            {t('about.hero_title_1')} <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{t('about.hero_title_2')}</span>
                        </h1>

                        <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto mb-6 sm:mb-8 leading-relaxed">
                            {t('about.hero_desc')}
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all transform hover:-translate-y-1">
                                {t('about.start_now')}
                                <i className="fas fa-arrow-right ml-2"></i>
                            </Link>
                            <a href="#contact" className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl font-bold transition-all hover:bg-slate-700/80">
                                {t('about.contact_team')}
                            </a>
                        </div>

                        {/* Abstract 3D Elements Placeholder */}
                        <div className="mt-20 relative hidden lg:block">
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-3/4 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                        </div>
                    </div>
                </div>

                {/* STATS SECTION */}
                <div className="relative z-20 -mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: "fas fa-rocket",
                                title: t('about.features.fast.title'),
                                desc: t('about.features.fast.desc')
                            },
                            {
                                icon: "fas fa-shield-alt",
                                title: t('about.features.secure.title'),
                                desc: t('about.features.secure.desc')
                            },
                            {
                                icon: "fas fa-headset",
                                title: t('about.features.support.title'),
                                desc: t('about.features.support.desc')
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white rounded-2xl p-4 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group">
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xl mb-4 group-hover:scale-110 transition-transform">
                                    <i className={item.icon}></i>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                                <p className="text-slate-600">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ABOUT CONTENT */}
                <section className="py-0 sm:py-8 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
                            <div className="relative">
                                <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10 rounded-tl-3xl -z-10"></div>
                                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-secondary/10 rounded-br-3xl -z-10"></div>
                                <img
                                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
                                    alt="Team working"
                                    className="rounded-2xl shadow-2xl w-full object-cover h-[500px]"
                                />
                                <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur p-6 rounded-xl shadow-lg border border-white/50">
                                    <p className="text-slate-800 font-medium italic">"{t('about.quote')}"</p>
                                </div>
                            </div>

                            <div>
                                <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-3">{t('about.company_about_badge')}</h2>
                                <h3 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">{t('about.company_title')}</h3>
                                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                                    {t('about.company_desc_1')}
                                </p>
                                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                    {t('about.company_desc_2')}
                                </p>

                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <i className="fas fa-shield-alt text-xl"></i>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg">{t('about.feature_security_title')}</h4>
                                            <p className="text-sm text-slate-500 mt-1">{t('about.feature_security_desc')}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <i className="fas fa-rocket text-xl"></i>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg">{t('about.feature_performance_title')}</h4>
                                            <p className="text-sm text-slate-500 mt-1">{t('about.feature_performance_desc')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURES GRID */}
                <section className="py-1 sm:py-16 bg-slate-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
                            <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-3">{t('about.features_badge')}</h2>
                            <h3 className="text-4xl font-bold text-slate-900 mb-6">{t('about.features_title')}</h3>
                            <p className="text-lg text-slate-600">{t('about.features_desc')}</p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { title: t('about.feature_1_title'), desc: t('about.feature_1_desc'), icon: 'fa-users', color: 'bg-blue-500' },
                                { title: t('about.feature_2_title'), desc: t('about.feature_2_desc'), icon: 'fa-chart-pie', color: 'bg-indigo-500' },
                                { title: t('about.feature_3_title'), desc: t('about.feature_3_desc'), icon: 'fa-credit-card', color: 'bg-violet-500' },
                                { title: t('about.feature_4_title'), desc: t('about.feature_4_desc'), icon: 'fa-certificate', color: 'bg-purple-500' },
                                { title: t('about.feature_5_title'), desc: t('about.feature_5_desc'), icon: 'fa-qrcode', color: 'bg-fuchsia-500' },
                                { title: t('about.feature_6_title'), desc: t('about.feature_6_desc'), icon: 'fa-file-alt', color: 'bg-pink-500' },
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white rounded-2xl p-4 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group">
                                    <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform`}>
                                        <i className={`fas ${item.icon}`}></i>
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h4>
                                    <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CALL TO ACTION */}
                <section className="py-2 sm:py-12 bg-slate-900 relative overflow-hidden" id="contact">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                    <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">{t('about.cta_title')}</h2>
                        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">{t('about.cta_desc')}</p>

                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <a href="mailto:contact@eventcek.com" className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-lg">
                                {t('about.contact_sales')}
                            </a>
                            <Link href="/register" className="px-8 py-4 bg-transparent border border-slate-600 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                                {t('about.try_demo')}
                            </Link>
                        </div>
                    </div>
                </section>

                {/* FOOTER SIMPLE */}
                <footer className="bg-slate-950 py-3 sm:py-6 border-t border-slate-800">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-slate-400 text-sm">
                            &copy; {new Date().getFullYear()} EventCek Management System. {t('about.footer_rights')}
                        </div>
                        <div className="flex gap-6">
                            <a href="#" className="text-slate-500 hover:text-white transition-colors"><i className="fab fa-facebook text-xl"></i></a>
                            <a href="#" className="text-slate-500 hover:text-white transition-colors"><i className="fab fa-twitter text-xl"></i></a>
                            <a href="#" className="text-slate-500 hover:text-white transition-colors"><i className="fab fa-instagram text-xl"></i></a>
                            <a href="#" className="text-slate-500 hover:text-white transition-colors"><i className="fab fa-linkedin text-xl"></i></a>
                        </div>
                    </div>
                </footer>
            </div>
        </WebLayout>
    );
}
