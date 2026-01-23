import React, { useEffect } from 'react';
import { Head } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';

export default function AuthOverlay() {
    useEffect(() => {
        // Try to open login modal
        try {
            window.loginModalForceOpen = true;
            if (typeof window.openLoginModal === 'function') {
                window.openLoginModal();
            } else if (typeof window.toggleLoginDropdown === 'function') {
                window.toggleLoginDropdown();
            }
        } catch (e) {
            // Ignore errors
        }
    }, []);

    return (
        <WebLayout>
            <Head title="Autentikasi Diperlukan" />

            <div className="min-h-[40vh] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-xl font-semibold text-gray-800">Autentikasi diperlukan</h1>
                    <p className="mt-2 text-gray-600">Silakan login untuk membuka halaman ini.</p>
                </div>
            </div>
        </WebLayout>
    );
}
