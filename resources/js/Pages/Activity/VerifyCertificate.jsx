import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import { QRCodeSVG } from 'qrcode.react';

export default function VerifyCertificate({ 
    activity, 
    participant, 
    certificateId, 
    isValid, 
    certificateSetting: initialSettings, 
    userParticipant, 
    invalidReason, 
    debug,
    bgUrl,
    backBgUrl,
    photoUrl,
    qrData
}) {
    const [cs, setCs] = useState({});
    
    useEffect(() => {
        let parsed = initialSettings || {};
        if (typeof parsed === 'string') {
            try {
                parsed = JSON.parse(parsed);
                if (typeof parsed === 'string') {
                    parsed = JSON.parse(parsed);
                }
            } catch (e) {
                console.error('Failed to parse certificate settings', e);
                parsed = {};
            }
        }
        setCs(parsed);
    }, [initialSettings]);

    // Constant from Designer
    const PX_PER_CM = 37.795;
    
    // Page settings - prioritize 'page' then 'card' for legacy support
    const page = cs.page || cs.card || {};
    
    // Default to A4 Landscape in CM
    const widthCm = parseFloat(page.width_cm) || 29.7;
    const heightCm = parseFloat(page.height_cm) || 21;
    
    const pxW = widthCm * PX_PER_CM;
    const pxH = heightCm * PX_PER_CM;

    const [containerWidth, setContainerWidth] = useState(pxW);
    const containerRef = React.useRef(null);

    useEffect(() => {
        const updateWidth = () => {
            if (containerRef.current) {
                setContainerWidth(containerRef.current.offsetWidth);
            }
        };
        // Initial and delay for layout stability
        updateWidth();
        const timer = setTimeout(updateWidth, 500);
        window.addEventListener('resize', updateWidth);
        return () => {
            window.removeEventListener('resize', updateWidth);
            clearTimeout(timer);
        };
    }, []);

    const scale = containerWidth / pxW;
    // Important: container height must follow the scale and aspect ratio
    const containerHeight = pxH * scale;
    
    const displayName = userParticipant?.name || participant?.user?.name || '-';
    const displayEmail = userParticipant?.email || '-';

    const getContent = (config) => {
        if (!config) return null;
        const fieldType = config.data_key || config.fieldType;

        if (fieldType === 'qr' || fieldType === 'qr_code') {
            return (
                <div style={{ width: '100%', height: '100%', background: 'white', padding: '2px' }}>
                    <QRCodeSVG
                        value={qrData || ''}
                        size={config.width || 100}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            );
        }

        if (fieldType === 'photo' || fieldType === 'foto') {
            return (
                <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    overflow: 'hidden', 
                    borderRadius: config.radius ? `${config.radius}px` : (config.shape === 'circle' ? '50%' : '0px'),
                    border: config.border ? `${config.border}px solid ${config.borderColor || '#000'}` : 'none'
                }}>
                    <img src={photoUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
            );
        }
        
        if (fieldType === 'name') return displayName;
        if (fieldType === 'certificate_id') return certificateId || '-';
        if (fieldType === 'email') return displayEmail;
        if (fieldType === 'activity_name') return activity?.name || '-';
        
        return config.text || '';
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] py-8 flex flex-col items-center">
            <Head title="Verifikasi Sertifikat" />
            
            <div className="w-full max-w-5xl px-4">
                <div className="bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
                    {/* Header Section */}
                    <div className="p-6 md:p-10 border-b border-gray-50 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-black tracking-tight mb-2">Verifikasi Sertifikat</h1>
                                <p className="text-blue-100 font-medium">{activity?.name || 'Informasi Kegiatan'}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                {isValid ? (
                                    <div className="flex items-center gap-2 bg-green-400/20 backdrop-blur-md border border-green-400/30 px-5 py-2.5 rounded-2xl">
                                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-sm font-bold">SERTIFIKAT ASLI</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 bg-red-400/20 backdrop-blur-md border border-red-400/30 px-5 py-2.5 rounded-2xl">
                                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                        <span className="text-sm font-bold">TIDAK VALID</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 md:p-10">
                        {/* Info Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                            <div className="bg-gray-50/80 p-6 rounded-3xl border border-gray-100 transition-all hover:shadow-md">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Nomor Sertifikat</div>
                                <div className="text-xl font-bold text-gray-900 break-all flex items-center gap-3">
                                    <i className="fas fa-certificate text-blue-500"></i>
                                    {certificateId || '-'}
                                </div>
                            </div>
                            <div className="bg-gray-50/80 p-6 rounded-3xl border border-gray-100 transition-all hover:shadow-md">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Pemilik Sertifikat</div>
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <img 
                                            src={photoUrl} 
                                            alt="Profile" 
                                            className="w-12 h-12 rounded-2xl object-cover border-2 border-white shadow-sm"
                                        />
                                        {isValid && (
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                                <i className="fas fa-check text-[8px] text-white"></i>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold text-gray-900">{displayName}</div>
                                        <div className="text-xs text-gray-500 font-medium">{displayEmail}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {!isValid && (
                            <div className="mb-10 p-6 bg-red-50 text-red-700 rounded-3xl border border-red-100 flex items-start gap-4">
                                <i className="fas fa-exclamation-triangle mt-1 text-xl"></i>
                                <div>
                                    <div className="font-bold text-lg mb-1">Verifikasi Gagal</div>
                                    <p className="text-sm opacity-90">{invalidReason || 'Data sertifikat tidak ditemukan dalam sistem kami.'}</p>
                                </div>
                            </div>
                        )}

                        {isValid && (
                            <div className="space-y-8">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                        <i className="fas fa-eye text-gray-400"></i>
                                        Preview Digital
                                    </h3>
                                    <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-bold text-gray-500 uppercase tracking-tight">
                                        Sesuai Desain Asli
                                    </div>
                                </div>

                                {/* Dynamic Certificate Preview */}
                                <div className="flex flex-col items-center w-full">
                                    <div 
                                         ref={containerRef}
                                         className="relative shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-xl overflow-hidden bg-white border border-gray-100 w-full" 
                                         style={{ 
                                             height: `${containerHeight}px`,
                                         }}>
                                        
                                        {/* Background Layer */}
                                        <div className="absolute inset-0 z-0">
                                            {bgUrl ? (
                                                <img 
                                                    src={bgUrl} 
                                                    alt="Background" 
                                                    className="w-full h-full" 
                                                    style={{ 
                                                        objectFit: 'stretch', // Changed from fill to stretch to ensure it fills the landscape area
                                                        imageRendering: 'auto'
                                                    }} 
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                                    <i className="fas fa-image text-4xl text-gray-200"></i>
                                                </div>
                                            )}
                                        </div>

                                        {/* Elements Layer - Scaled based on container width */}
                                        <div className="absolute inset-0 z-10 origin-top-left" 
                                             style={{ 
                                                 width: pxW, 
                                                 height: pxH,
                                                 transform: `scale(${scale})`,
                                             }}>
                                             
                                             {Object.entries(cs).map(([key, config]) => {
                                                 if (key === 'page' || !config || config.visible === false) return null;
                                                 
                                                 return (
                                                     <div
                                                         key={key}
                                                         style={{
                                                             position: 'absolute',
                                                             left: `${config.left}px`,
                                                             top: `${config.top}px`,
                                                             width: config.width ? `${config.width}px` : 'auto',
                                                             height: config.height ? `${config.height}px` : 'auto',
                                                             fontSize: config.size ? `${config.size}px` : 'inherit',
                                                             color: config.color || '#000000',
                                                             fontFamily: config.font || 'inherit',
                                                             fontWeight: config.weight || 'normal',
                                                             fontStyle: config.italic || 'normal',
                                                             textAlign: config.align || 'left',
                                                             display: 'flex',
                                                             alignItems: 'center',
                                                             justifyContent: config.align === 'center' ? 'center' : (config.align === 'right' ? 'flex-end' : 'flex-start'),
                                                             whiteSpace: 'pre-wrap',
                                                             lineHeight: 1.2,
                                                             pointerEvents: 'none'
                                                         }}
                                                     >
                                                         {getContent(config)}
                                                     </div>
                                                 );
                                             })}
                                        </div>
                                    </div>
                                    
                                    {debug && (
                                        <div className="mt-4 p-4 bg-gray-800 text-green-400 text-[10px] font-mono rounded-lg w-full overflow-auto">
                                            <div className="font-bold border-b border-gray-700 pb-1 mb-2">DEBUG DATA:</div>
                                            <pre>{JSON.stringify({ 
                                                page, 
                                                widthCm, 
                                                heightCm, 
                                                pxW, 
                                                pxH, 
                                                containerWidth, 
                                                scale,
                                                bgUrl: bgUrl?.substring(0, 50) + '...',
                                                elements_count: Object.keys(cs).length 
                                            }, null, 2)}</pre>
                                        </div>
                                    )}

                                    <p className="mt-6 text-sm text-gray-400 italic">
                                        * Tampilan di atas adalah representasi digital dari sertifikat fisik.
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-12 flex justify-center">
                            <Link 
                                href="/"
                                className="inline-flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
                            >
                                <i className="fas fa-home"></i>
                                Kembali ke Beranda
                            </Link>
                        </div>
                    </div>
                </div>
                
                {/* Footer Credits */}
                <div className="mt-8 text-center text-gray-400 text-xs font-medium">
                    &copy; {new Date().getFullYear()} {activity?.user?.name || 'Adzkia Tekno'}. Seluruh hak cipta dilindungi.
                </div>
            </div>

            {/* Font Loader - Same as Designer */}
            <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Pinyon+Script&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;700&family=Open+Sans:wght@300;400;700&family=Poppins:wght@300;400;700&family=Roboto:wght@300;400;700&display=swap');
                
                .certificate-canvas {
                    container-type: size;
                }
            `}} />
        </div>
    );
}
