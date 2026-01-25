import React from 'react';

export default function MobileLikeHero({
    title,
    description,
    children,
    className = '',
    hideIcon = false,
    animStyle = 'circles',
    centered = false
}) {
    // Helper to get animation elements based on style
    const renderAnimationParts = () => {
        switch (animStyle) {
            case 'rain':
                return (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute bg-white/20 w-[1px] h-20"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `-${Math.random() * 20}%`,
                                    animation: `hero-rain ${1 + Math.random() * 2}s linear infinite`,
                                    animationDelay: `${Math.random() * 2}s`,
                                    opacity: 0.1 + Math.random() * 0.3
                                }}
                            />
                        ))}
                    </div>
                );
            case 'waves':
                return (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <svg className="absolute bottom-0 left-0 w-full h-24 text-white/10" preserveAspectRatio="none" viewBox="0 0 1440 320">
                            <path fill="currentColor" d="M0,160L48,176C96,192,192,224,288,224C384,224,480,192,576,165.3C672,139,768,117,864,128C960,139,1056,181,1152,197.3C1248,213,1344,203,1392,197.3L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                        </svg>
                        <svg className="absolute bottom-0 left-0 w-full h-24 text-white/5" preserveAspectRatio="none" viewBox="0 0 1440 320" style={{ marginBottom: '-10px', animation: 'hero-wave 10s linear infinite' }}>
                            <path fill="currentColor" d="M0,96L48,112C96,128,192,160,288,186.7C384,213,480,235,576,213.3C672,192,768,128,864,128C960,128,1056,192,1152,208C1248,224,1344,192,1392,176L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                        </svg>
                    </div>
                );
            case 'particles':
                return (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[...Array(30)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute bg-white/20 w-1 h-1 rounded-full"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    animation: `hero-float ${3 + Math.random() * 5}s ease-in-out infinite`,
                                    animationDelay: `${Math.random() * 2}s`
                                }}
                            />
                        ))}
                    </div>
                );
            case 'parallax':
                return (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-bounce" style={{ animationDuration: '8s' }}></div>
                        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-white/5 rounded-lg rotate-45 blur-2xl"></div>
                    </div>
                );
            case 'clean':
                return (
                    <div className="absolute inset-0 overflow-hidden pointer-events-none bg-gradient-to-t from-black/20 to-transparent"></div>
                );
            case 'circles':
            default:
                return (
                    <>
                        <div className="absolute -top-24 -left-24 w-64 h-64 rounded-full bg-white opacity-10 blur-2xl animate-pulse"></div>
                        <div className="absolute top-1/2 -right-20 w-80 h-80 rounded-full bg-white opacity-10 blur-3xl animate-bounce shadow-inner" style={{ animationDuration: '10s' }}></div>
                        <div className="absolute bottom-0 left-1/3 w-40 h-40 rounded-full bg-white opacity-5 blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
                    </>
                );
        }
    };

    return (
        <div className={`relative bg-white ${className}`}>
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes hero-rain {
                    from { transform: translateY(0); opacity: 0; }
                    50% { opacity: 0.4; }
                    to { transform: translateY(500px); opacity: 0; }
                }
                @keyframes hero-wave {
                    from { transform: translateX(0); }
                    to { transform: translateX(-50%); }
                }
                @keyframes hero-float {
                    0%, 100% { transform: translateY(0) translateX(0); }
                    50% { transform: translateY(-30px) translateX(20px); }
                }
                @keyframes hero-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes hero-slide-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-hero-fade-in { animation: hero-fade-in 1s ease-out forwards; }
                .animate-hero-slide-up { animation: hero-slide-up 0.8s ease-out forwards; }
            `}} />

            {/* Main Hero Container */}
            <div
                className="relative rounded-b-[3.5rem] shadow-2xl overflow-hidden z-10 transition-all duration-700"
                style={{
                    background: `linear-gradient(135deg, var(--color-hero-start, #3b82f6) 0%, var(--color-hero-end, #7c3aed) 100%)`
                }}
            >
                {/* Animation Overlay */}
                {renderAnimationParts()}

                {/* Glassmorphism subtle overlay */}
                <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>

                {/* Content Container */}
                <div className={`relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-28 pb-16 ${centered ? 'text-center' : 'text-center md:text-left'}`}>
                    <div className={`flex flex-col ${centered ? 'items-center justify-center' : 'md:flex-row items-center justify-between'} gap-12`}>
                        {/* Text Content */}
                        <div className={`flex-1 text-white w-full ${centered ? 'max-w-4xl mx-auto' : ''}`}>
                            <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-bold uppercase tracking-widest mb-4 backdrop-blur-sm border border-white/20 animate-hero-fade-in">
                                {animStyle !== 'clean' ? animStyle : 'Official Platform'}
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tighter mb-6 drop-shadow-lg leading-tight animate-hero-slide-up" style={{ animationDelay: '0.2s' }}>
                                {title}
                            </h1>
                            {description && (
                                <p className={`text-lg md:text-xl text-white/80 font-medium max-w-2xl leading-relaxed mx-auto ${centered ? '' : 'md:mx-0'} drop-shadow-md animate-hero-slide-up`} style={{ animationDelay: '0.4s' }}>
                                    {description}
                                </p>
                            )}
                            {children && <div className="mt-10 w-full animate-hero-slide-up" style={{ animationDelay: '0.6s' }}>{children}</div>}
                        </div>

                        {/* Right Side Icon */}
                        {!hideIcon && (
                            <div className={`${centered ? 'block mt-8' : 'hidden md:block'} opacity-30 transform ${centered ? 'rotate-0' : 'rotate-12'} hover:rotate-0 transition-transform duration-500 scale-110`}>
                                <i className={`fas ${animStyle === 'waves' ? 'fa-water' : 'fa-mobile-alt'} text-[12rem] text-white drop-shadow-2xl`}></i>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Spacer */}
            <div className="h-10 bg-transparent"></div>
        </div>
    );
}
