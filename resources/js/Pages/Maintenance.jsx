import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';

export default function Maintenance({ message, start_time, end_time }) {
    useEffect(() => {
        // Auto refresh every 30 seconds
        const timer = setTimeout(() => {
            window.location.reload();
        }, 30000);

        return () => clearTimeout(timer);
    }, []);

    // Format dates
    const formatDate = (dateString) => {
        if (!dateString) return null;
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    const handleRefresh = (e) => {
        e.preventDefault();
        const btn = e.currentTarget;
        // Create spinner element
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-spinner fa-spin';
        }
        const textSpan = btn.querySelector('span');
        if (textSpan) {
            textSpan.textContent = 'Memuat...';
        } else {
             // Fallback if structure is different
             btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Memuat...';
        }
        btn.disabled = true;
        window.location.reload();
    };

    return (
        <div className="min-h-screen flex items-center justify-center font-sans relative overflow-hidden"
             style={{
                 background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                 fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
             }}>
            <Head title="Sistem Sedang Dalam Pemeliharaan" />

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                    100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                }
                @keyframes progress {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
                .shimmer-bg::before {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    animation: shimmer 3s infinite;
                    z-index: 0;
                }
                .progress-bar-anim {
                    animation: progress 3s ease-in-out infinite;
                }
            `}</style>

            <div className="maintenance-container relative bg-white/95 backdrop-blur-md rounded-[20px] p-8 md:p-12 text-center shadow-2xl max-w-[600px] w-[90%] overflow-hidden shimmer-bg z-10">
                <div className="maintenance-content relative z-10">
                    <div className="maintenance-icon text-5xl md:text-6xl text-[#667eea] mb-6 animate-pulse">
                        <i className="fas fa-tools"></i>
                    </div>

                    <h1 className="text-3xl md:text-[2.5rem] font-bold text-[#2d3748] mb-4 leading-tight">
                        Sistem Sedang Dalam Pemeliharaan
                    </h1>

                    <p className="text-base md:text-[1.2rem] text-[#4a5568] leading-relaxed mb-8">
                        {message || 'Kami sedang melakukan pemeliharaan sistem untuk meningkatkan layanan kami. Silakan coba lagi dalam beberapa saat.'}
                    </p>

                    <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
                        {start_time && (
                            <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white py-3 px-6 rounded-[15px] shadow-md">
                                <i className="fas fa-clock mr-2"></i>
                                <strong>Mulai:</strong> <br className="md:hidden"/> {formatDate(start_time)}
                            </div>
                        )}
                        
                        {end_time && (
                            <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white py-3 px-6 rounded-[15px] shadow-md">
                                 <i className="fas fa-calendar-check mr-2"></i>
                                <strong>Estimasi Selesai:</strong> <br className="md:hidden"/> {formatDate(end_time)}
                            </div>
                        )}
                    </div>

                    <div className="bg-[#e2e8f0] rounded-[10px] h-2 my-8 overflow-hidden w-full">
                        <div className="h-full rounded-[10px] bg-gradient-to-r from-[#667eea] to-[#764ba2] progress-bar-anim"></div>
                    </div>

                    <button 
                        onClick={handleRefresh}
                        className="inline-flex items-center gap-2 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white border-0 py-3 px-[30px] rounded-[25px] text-[1.1rem] font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#667eea]/30"
                    >
                        <i className="fas fa-sync-alt"></i>
                        <span>Coba Lagi</span>
                    </button>

                    <div className="mt-8 p-4 bg-[#667eea]/10 rounded-[10px] border-l-4 border-[#667eea] text-left">
                        <h5 className="text-[#2d3748] font-bold mb-2 flex items-center gap-2">
                            <i className="fas fa-info-circle"></i> Butuh Bantuan?
                        </h5>
                        <p className="text-[#4a5568] m-0 text-sm md:text-base">
                            Jika Anda memerlukan bantuan mendesak, silakan hubungi tim support kami.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
