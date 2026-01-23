import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

/**
 * Reusable QR Scanner Component
 * 
 * @param {Function} onScanSuccess - Callback when QR is successfully scanned
 * @param {Function} onScanFailure - Callback when scan fails (optional)
 * @param {boolean} active - Whether the scanner should be active
 * @param {string} className - Additional CSS classes
 * @param {number} fps - Frames per second
 * @param {number} qrbox - Size of scanning box
 * @param {boolean} showCameraSelector - Whether to show camera dropdown
 */
export default function QRScanner({ 
    onScanSuccess, 
    onScanFailure, 
    active = true,
    className = "",
    fps = 10,
    qrbox = 250,
    aspectRatio = 1.0,
    showCameraSelector = true
}) {
    const [cameras, setCameras] = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [permissionError, setPermissionError] = useState(null);
    
    const scannerRef = useRef(null);
    const containerId = "reader-" + Math.random().toString(36).substring(2, 9);

    useEffect(() => {
        // Get available cameras
        Html5Qrcode.getCameras().then(devices => {
            if (devices && devices.length) {
                setCameras(devices);
                
                // Try to find back camera as default
                const backCamera = devices.find(d => 
                    d.label.toLowerCase().includes('back') || 
                    d.label.toLowerCase().includes('environment') ||
                    d.label.toLowerCase().includes('belakang')
                );
                
                const defaultId = backCamera ? backCamera.id : devices[0].id;
                setSelectedCameraId(defaultId);
            } else {
                setPermissionError("Tidak ada kamera yang terdeteksi.");
            }
        }).catch(err => {
            console.error("Error getting cameras", err);
            setPermissionError("Gagal mengakses kamera. Pastikan izin kamera diberikan.");
        });

        return () => {
            stopScanning();
        };
    }, []);

    useEffect(() => {
        if (active && selectedCameraId && !isScanning) {
            startScanning(selectedCameraId);
        } else if (!active && isScanning) {
            stopScanning();
        }
    }, [active, selectedCameraId]);

    const startScanning = async (cameraId) => {
        if (scannerRef.current) {
            await stopScanning();
        }

        const html5QrCode = new Html5Qrcode(containerId);
        scannerRef.current = html5QrCode;

        const config = { 
            fps: fps, 
            qrbox: { width: qrbox, height: qrbox },
            aspectRatio: aspectRatio
        };

        try {
            await html5QrCode.start(
                cameraId, 
                config, 
                (decodedText, decodedResult) => {
                    if (onScanSuccess) onScanSuccess(decodedText, decodedResult);
                },
                (errorMessage) => {
                    if (onScanFailure) onScanFailure(errorMessage);
                }
            );
            setIsScanning(true);
            setPermissionError(null);
        } catch (err) {
            console.error("Error starting scanner", err);
            setPermissionError("Gagal memulai scanner: " + err);
            setIsScanning(false);
        }
    };

    const stopScanning = async () => {
        if (scannerRef.current && scannerRef.current.isScanning) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                console.warn("Failed to stop scanner", err);
            }
        }
        setIsScanning(false);
        scannerRef.current = null;
    };

    const handleCameraChange = (e) => {
        const newCameraId = e.target.value;
        setSelectedCameraId(newCameraId);
        // Effect will handle restart
    };

    return (
        <div className={`w-full ${className}`}>
            {permissionError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                    <span className="block sm:inline">{permissionError}</span>
                </div>
            )}

            {showCameraSelector && cameras.length > 1 && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <i className="fas fa-camera mr-2"></i>Pilih Kamera
                    </label>
                    <select
                        value={selectedCameraId}
                        onChange={handleCameraChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                        disabled={!active}
                    >
                        {cameras.map((cam) => (
                            <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id}`}</option>
                        ))}
                    </select>
                </div>
            )}

            <div id={containerId} className="w-full overflow-hidden rounded-lg bg-black min-h-[300px]"></div>
        </div>
    );
}
