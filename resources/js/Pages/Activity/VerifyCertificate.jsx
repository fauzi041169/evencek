import React, { useEffect, useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import QRCode from 'react-qr-code';

export default function VerifyCertificate({ 
    activity, 
    participant, 
    certificateId, 
    isValid, 
    certificateSetting, 
    userParticipant, 
    invalidReason, 
    debug,
    bgUrl,
    backBgUrl,
    photoUrl,
    qrData
}) {
    const [scale, setScale] = useState(1);

    const cs = certificateSetting || {};
    
    // Default values matching Blade
    const widthCm = cs.card?.width_cm || 8.6;
    const heightCm = cs.card?.height_cm || 15;
    
    const cardStyle = cs.card || {};
    const savedWidthPx = parseInt(cardStyle.width_px || 0);
    const savedHeightPx = parseInt(cardStyle.height_px || 0);
    
    const pxW = savedWidthPx > 0 ? savedWidthPx : (widthCm * 37.8);
    const pxH = savedHeightPx > 0 ? savedHeightPx : (heightCm * 37.8);
    
    const baseW = parseFloat(cardStyle.base_width_px || cardStyle.width_px || 0);
    const baseH = parseFloat(cardStyle.base_height_px || cardStyle.height_px || 0);
    
    const scaleX = (baseW > 0) ? (pxW / baseW) : 1.0;
    const scaleY = (baseH > 0) ? (pxH / baseH) : 1.0;
    
    const certificateType = cs.certificate_type || 'single';
    const isDoubleSided = String(certificateType).trim().toLowerCase() === 'double';

    const titleStyle = cs.title || {};
    const nameStyle = cs.name || {};
    const certIdStyle = cs.certificate_id || {};
    const qrStyle = cs.qr || {};
    const photoStyle = cs.photo || {};
    const emailStyle = cs.email || {};

    const profile = userParticipant?.profile;
    const displayName = userParticipant?.name || participant?.user?.name || '-';
    const displayEmail = userParticipant?.email || '-';

    // Calculate dynamic styles
    const titleTop = Math.round((parseInt(titleStyle.top) || 20) * scaleY);
    const titleLeft = Math.round((parseInt(titleStyle.marginLeft) || parseInt(titleStyle.left) || 0) * scaleX);
    
    const photoTop = Math.round((parseInt(photoStyle.top) || 70) * scaleY);
    const photoLeft = Math.round((parseInt(photoStyle.left) || 85) * scaleX);
    const photoSize = Math.round((parseInt(photoStyle.size) || 90) * scaleX);
    
    const nameTop = Math.round((parseInt(nameStyle.top) || 190) * scaleY);
    const nameLeft = Math.round((parseInt(nameStyle.left) || 30) * scaleX);
    const nameWidth = Math.round((parseInt(nameStyle.width) || 180) * scaleX);
    
    const emailTop = Math.round((parseInt(emailStyle.top) || 220) * scaleY);
    const emailLeft = Math.round((parseInt(emailStyle.left) || 30) * scaleX);
    const emailWidth = Math.round((parseInt(emailStyle.width) || 180) * scaleX);
    
    const certTop = Math.round((parseInt(certIdStyle.top) || 360) * scaleY);
    const certLeft = Math.round((parseInt(certIdStyle.left) || 30) * scaleX);
    const certWidth = Math.round((parseInt(certIdStyle.width) || 180) * scaleX);
    
    const qrTop = Math.round((parseInt(qrStyle.top) || 320) * scaleY);
    const qrLeft = Math.round((parseInt(qrStyle.left) || 90) * scaleX);
    const qrSizeInput = parseInt(qrStyle.size) || 80;
    const qrSizeScaled = Math.round(qrSizeInput * scaleX);
    const qrSizeUsed = Math.max(qrSizeScaled, 40);

    return (
        <div className="min-h-screen bg-gray-50 py-6 flex flex-col items-center justify-center sm:py-12">
            <Head title="Verifikasi Sertifikat" />
            
            <div className="w-full max-w-4xl px-4">
                <div className="bg-white shadow-lg rounded-xl overflow-hidden p-6 md:p-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-extrabold text-gray-900">Verifikasi Sertifikat</h1>
                        <p className="text-gray-600">{activity?.name || 'Kegiatan'}</p>
                    </div>

                    <div className="mb-8">
                        {isValid ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-green-500 text-white">
                                Sertifikat Asli
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-500 text-white">
                                Tidak Valid
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-gray-100 p-4 rounded-lg">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">ID Sertifikat</div>
                            <div className="text-lg font-bold text-gray-900 break-all">
                                {certificateId || '-'}
                            </div>
                        </div>
                        <div className="bg-gray-100 p-4 rounded-lg">
                            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nama Pemegang</div>
                            <div className="flex items-center gap-3">
                                {photoUrl ? (
                                    <img 
                                        src={photoUrl} 
                                        alt="Profile" 
                                        className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-500 text-xs">
                                        No Img
                                    </div>
                                )}
                                <div className="text-lg font-bold text-gray-900">
                                    {displayName}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-gray-600 mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        Halaman ini digunakan untuk memverifikasi keaslian sertifikat yang dipindai menggunakan QR.
                        Jika status tidak valid, silakan hubungi panitia kegiatan terkait.
                    </div>

                    {!isValid && invalidReason && (
                        <div className="mb-8 p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 font-medium">
                            Alasan: {invalidReason}
                        </div>
                    )}



                    {isValid && (
                        <div className="border-t border-gray-200 pt-8">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Preview Sertifikat</h3>
                            <div className="flex flex-col items-center overflow-auto">
                                <div className="relative mb-8" style={{ width: pxW, height: pxH }}>
                                    <div className="absolute inset-0 bg-white shadow-lg rounded-xl overflow-hidden origin-top-left" 
                                         style={{ width: pxW, height: pxH }}>
                                        
                                        {/* Background */}
                                        {bgUrl && (
                                            <img src={bgUrl} alt="Background" className="absolute inset-0 w-full h-full object-fill z-0" />
                                        )}

                                        {/* Content Layer */}
                                        <div className="absolute inset-0 z-10">
                                            {/* Title */}
                                            {titleStyle.visible !== false && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: titleTop,
                                                    left: 0,
                                                    width: '100%',
                                                    marginLeft: titleLeft,
                                                    fontSize: titleStyle.size || 18,
                                                    color: titleStyle.color || '#bfa100',
                                                    fontFamily: titleStyle.font || 'DejaVu Sans',
                                                    fontWeight: titleStyle.weight || 'bold',
                                                    fontStyle: titleStyle.italic || 'normal',
                                                    textAlign: titleStyle.align || 'center'
                                                }}>
                                                    {(activity?.name || 'Sertifikat PESERTA').replace(/\\n/g, ' ')}
                                                </div>
                                            )}

                                            {/* Photo */}
                                            {photoUrl && photoStyle.visible !== false && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: photoTop,
                                                    left: photoLeft
                                                }}>
                                                    <div style={{
                                                        position: 'relative',
                                                        width: photoSize,
                                                        height: photoStyle.shape === 'circle' ? photoSize : (photoSize * 1.22), // Approximating aspect ratio
                                                        borderRadius: photoStyle.shape === 'circle' ? '50%' : '12px',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <img src={photoUrl} alt="Foto" className="absolute inset-0 w-full h-full object-cover" />
                                                        {photoStyle.overlay_color && (
                                                            <div style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                background: photoStyle.overlay_color,
                                                                opacity: (photoStyle.overlay_opacity || 0) / 100
                                                            }} />
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Name */}
                                            {nameStyle.visible !== false && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: nameTop,
                                                    left: nameLeft,
                                                    width: nameWidth,
                                                    fontSize: nameStyle.size || 16,
                                                    color: nameStyle.color || '#333333',
                                                    fontFamily: nameStyle.font || 'DejaVu Sans',
                                                    fontWeight: nameStyle.weight || 'normal',
                                                    fontStyle: nameStyle.italic || 'normal',
                                                    textAlign: nameStyle.align || 'center'
                                                }}>
                                                    {displayName}
                                                </div>
                                            )}

                                            {/* Email */}
                                            {emailStyle.visible === true && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: emailTop,
                                                    left: emailLeft,
                                                    width: emailWidth,
                                                    fontSize: emailStyle.size || 16,
                                                    color: emailStyle.color || '#333333',
                                                    fontFamily: emailStyle.font || 'DejaVu Sans',
                                                    fontWeight: emailStyle.weight || 'normal',
                                                    fontStyle: emailStyle.italic || 'normal',
                                                    textAlign: emailStyle.align || 'center'
                                                }}>
                                                    {displayEmail}
                                                </div>
                                            )}

                                            {/* Certificate ID */}
                                            {certIdStyle.visible === true && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: certTop,
                                                    left: certLeft,
                                                    width: certWidth,
                                                    fontSize: certIdStyle.size || 14,
                                                    color: certIdStyle.color || '#333333',
                                                    fontFamily: certIdStyle.font || 'DejaVu Sans',
                                                    fontWeight: certIdStyle.weight || 'normal',
                                                    fontStyle: certIdStyle.italic || 'normal',
                                                    textAlign: certIdStyle.align || 'left'
                                                }}>
                                                    {certificateId}
                                                </div>
                                            )}

                                            {/* QR Code */}
                                            {qrStyle.visible !== false && qrData && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: qrTop,
                                                    left: qrLeft,
                                                    width: qrSizeUsed,
                                                    height: qrSizeUsed,
                                                    background: 'white',
                                                    padding: 2
                                                }}>
                                                    <QRCode 
                                                        value={qrData} 
                                                        size={qrSizeUsed}
                                                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                        viewBox={`0 0 256 256`}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {isDoubleSided && (
                                    <div className="relative mb-8" style={{ width: pxW, height: pxH }}>
                                        <div className="absolute inset-0 bg-white shadow-lg rounded-xl overflow-hidden origin-top-left" 
                                             style={{ width: pxW, height: pxH }}>
                                            {backBgUrl ? (
                                                <img src={backBgUrl} alt="Back Background" className="absolute inset-0 w-full h-full object-fill" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                                                    Halaman Belakang
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
