import React, { useEffect, useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function SubscriptionPayment({ subscription, plan, snapToken, midtransClientKey, midtransIsProduction }) {
    const { flash } = usePage().props;
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!midtransClientKey) {
            return;
        }
        const scriptId = 'midtrans-snap-js';
        if (document.getElementById(scriptId)) {
            return;
        }
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = midtransIsProduction
            ? 'https://app.midtrans.com/snap/snap.js'
            : 'https://app.sandbox.midtrans.com/snap/snap.js';
        script.setAttribute('data-client-key', midtransClientKey);
        document.body.appendChild(script);
    }, [midtransClientKey, midtransIsProduction]);

    const handlePay = () => {
        if (!window.snap || typeof window.snap.pay !== 'function') {
            alert('Gagal memuat sistem pembayaran otomatis. Mohon refresh halaman.');
            return;
        }
        if (!snapToken) {
            alert('Token pembayaran tidak tersedia.');
            return;
        }
        setLoading(true);
        window.snap.pay(snapToken, {
            onSuccess: () => window.location.reload(),
            onPending: () => window.location.reload(),
            onError: () => window.location.reload(),
            onClose: () => setLoading(false),
        });
    };

    return (
        <MainLayout>
            <Head title="Pembayaran Langganan" />
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    {flash?.error && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
                            <p className="text-red-700">{flash.error}</p>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-6">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center text-white">
                            <h3 className="text-2xl font-bold">{plan?.name || 'Paket'}</h3>
                            <div className="mt-2 text-3xl font-bold">
                                Rp {Number(plan?.price || 0).toLocaleString('id-ID')} /bulan
                            </div>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600">Order ID: {subscription?.midtrans_order_id || '-'}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                        <div className="p-6 text-center">
                            <button
                                type="button"
                                onClick={handlePay}
                                className="w-full px-6 py-3 bg-secondary hover:bg-blue-700 text-white rounded-lg font-semibold"
                                disabled={loading}
                            >
                                {loading ? 'Memproses...' : 'Selesaikan Pembayaran'}
                            </button>
                            <div className="mt-4">
                                <Link href={route('subscriptions.pricing')} className="text-sm text-gray-600">
                                    Kembali ke paket
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

