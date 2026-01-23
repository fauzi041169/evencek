import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import QRScanner from '@/Components/QRScanner';

export default function ScanUniversal() {
    const [scanResult, setScanResult] = useState({ type: 'info', message: 'Arahkan kamera ke QR code.' });
    const [isScannerActive, setIsScannerActive] = useState(false);

    const showScanResultMessage = (type, message) => {
        setScanResult({ type, message });
    };

    const onQRCodeScanned = async (decodedText) => {
        // Stop scanning temporarily
        setIsScannerActive(false);

        try {
            const qrData = JSON.parse(decodedText);

            if (!qrData || !qrData.type || qrData.type !== 'attendance') {
                showScanResultMessage('error', 'QR code tidak valid. Pastikan Anda scan QR code absensi yang benar.');
                setTimeout(() => setIsScannerActive(true), 3000);
                return;
            }

            showScanResultMessage('loading', 'Memproses QR code...');

            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
            const response = await fetch('/attendance/process-scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ qr_data: decodedText })
            });

            const data = await response.json();

            if (data.success) {
                showScanResultMessage('success', 
                    `Absensi berhasil dicatat!<br><strong>${data.activity_name || ''}</strong><br><small>${data.attendance_name || ''}</small><br><small class="text-muted">Mengalihkan ke halaman detail kegiatan...</small>`
                );

                setTimeout(() => {
                    if (data.activity_id) {
                        window.location.href = `/activity/${data.activity_id}/detail`;
                    } else {
                        showScanResultMessage('info', 'Siap untuk scan QR code berikutnya...');
                        setIsScannerActive(true);
                    }
                }, 2000);
            } else {
                showScanResultMessage('error', data.message || 'Gagal memproses QR code');
                setTimeout(() => setIsScannerActive(true), 3000);
            }
        } catch (e) {
            showScanResultMessage('error', 'Format QR code tidak valid.');
            setTimeout(() => setIsScannerActive(true), 3000);
        }
    };

    const getAlertClass = () => {
        switch (scanResult.type) {
            case 'success': return 'bg-green-100 border-green-500 text-green-800';
            case 'error': return 'bg-red-100 border-red-500 text-red-800';
            case 'loading': return 'bg-secondary/10 border-blue-500 text-secondary';
            default: return 'bg-secondary/10 border-blue-500 text-secondary';
        }
    };

    const getIcon = () => {
        switch (scanResult.type) {
            case 'success': return 'fa-check-circle';
            case 'error': return 'fa-exclamation-circle';
            case 'loading': return 'fa-spinner fa-spin';
            default: return 'fa-info-circle';
        }
    };

    return (
        <MainLayout>
            <Head title="Scan QR Code Absensi" />

            <div className="container mx-auto py-8 px-4">
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-secondary text-white px-6 py-4">
                            <h4 className="text-xl font-bold flex items-center">
                                <i className="fas fa-qrcode mr-3"></i>
                                Scan QR Code Absensi
                            </h4>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-600 mb-4">
                                Arahkan kamera ke QR code yang ditampilkan panitia untuk melakukan absensi
                            </p>

                            {!isScannerActive && (
                                <div className="mb-4 text-center">
                                    <button
                                        onClick={() => setIsScannerActive(true)}
                                        className="px-4 py-2 bg-secondary hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        <i className="fas fa-camera mr-2"></i>
                                        Aktifkan Kamera
                                    </button>
                                </div>
                            )}

                            {/* Scanner Container */}
                            <div className="bg-gray-100 rounded-xl p-4 mb-4">
                                <QRScanner 
                                    onScanSuccess={onQRCodeScanned} 
                                    active={isScannerActive}
                                    showCameraSelector={true}
                                />
                                
                                {/* Scan Result */}
                                <div className={`mt-4 p-4 rounded-lg border-l-4 ${getAlertClass()}`}>
                                    <div className="flex items-center">
                                        <i className={`fas ${getIcon()} mr-2`}></i>
                                        <span dangerouslySetInnerHTML={{ __html: scanResult.message }}></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

