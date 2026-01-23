import React from 'react';

export default function PageHero({ title, description, heroAnim = 'circles', shape = 'waves', children }) {
    return (
        <section className="page-hero relative overflow-hidden">
            <style>{`
                .page-hero {
                    position: relative;
                    min-height: 450px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    padding-bottom: 80px;
                }
                
                .hero-gradient-bg {
                    position: absolute !important;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%) !important;
                    z-index: 1 !important;
                }

                .hero-dots-pattern {
                    position: absolute !important;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.15) 1px, transparent 1px) !important;
                    background-size: 20px 20px !important;
                    z-index: 2 !important;
                    opacity: 0.6 !important;
                }

                .hero-circle {
                    position: absolute !important;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.1) !important;
                    animation: heroFloat 6s ease-in-out infinite;
                    z-index: 2 !important;
                }

                .hero-circle-1 {
                    width: 300px;
                    height: 300px;
                    top: -100px;
                    left: -100px;
                    background: rgba(255, 255, 255, 0.08) !important;
                    animation-delay: 0s;
                }

                .hero-circle-2 {
                    width: 200px;
                    height: 200px;
                    top: 50%;
                    left: 20%;
                    transform: translate(-50%, -50%);
                    background: rgba(255, 255, 255, 0.06) !important;
                    animation-delay: 2s;
                }

                .hero-circle-3 {
                    width: 350px;
                    height: 350px;
                    top: -50px;
                    right: -150px;
                    background: rgba(255, 255, 255, 0.1) !important;
                    animation-delay: 4s;
                }

                @keyframes heroFloat {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                    100% { transform: translateY(0px); }
                }

                .hero-waves-container {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 100%;
                    overflow: hidden;
                    line-height: 0;
                    transform: rotate(180deg);
                    z-index: 3;
                }

                .hero-waves-svg {
                    position: relative;
                    display: block;
                    width: calc(100% + 1.3px);
                    height: 80px;
                }

                @media (min-width: 768px) {
                    .hero-waves-svg {
                        height: 120px;
                    }
                }

                .hero-waves-path {
                    fill: #ffffff;
                }
                
                /* Compatibility with gray backgrounds */
                :global(body.bg-gray-50) .hero-waves-path {
                    fill: #f9fafb;
                }
            `}</style>

            <div className="hero-gradient-bg"></div>
            
            {heroAnim !== 'clean' && (
                <div className="hero-dots-pattern pointer-events-none absolute inset-0 z-0"></div>
            )}
            
            {heroAnim === 'circles' && (
                <div className="hero-circles absolute inset-0 pointer-events-none">
                    <div className="hero-circle hero-circle-1"></div>
                    <div className="hero-circle hero-circle-2"></div>
                    <div className="hero-circle hero-circle-3"></div>
                </div>
            )}

            {/* Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
                    {title}
                </h1>
                {description && (
                    <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto drop-shadow-[0_1px_4px_rgba(0,0,0,0.2)] mb-8">
                        {description}
                    </p>
                )}
                {children}
            </div>

            {/* Dynamic Shape Bottom */}
            {shape === 'waves' && (
                <div className="hero-waves-container">
                    <svg className="hero-waves-svg" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
                        <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="hero-waves-path"></path>
                    </svg>
                </div>
            )}
            
            {shape === 'slant' && (
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-white" style={{ clipPath: 'polygon(0 100%, 100% 0, 100% 100%)', zIndex: 3 }}></div>
            )}
            
            {/* Fallback/Original Curve if requested */}
            {shape === 'curve' && (
                <div className="absolute bottom-[-1px] left-0 right-0 h-[60px] bg-white rounded-t-[50%_100%] z-[3]"></div>
            )}
        </section>
    );
}