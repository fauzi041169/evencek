import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';

export default function Midtrans({ payment, activity, snapToken, isAjax, midtransClientKey, midtransIsProduction }) {
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
            alert('Gagal memuat sistem pembayaran otomatis. Mohon refresh halaman dan coba lagi.');
            return;
        }
        if (!snapToken) {
            alert('Token pembayaran tidak tersedia.');
            return;
        }
        setLoading(true);

        const finishUrl = route('midtrans.payment.finish', { activity_id: activity?.id });
        const errorUrl = route('midtrans.payment.error', { activity_id: activity?.id });
        const unfinishUrl = route('midtrans.payment.unfinish', { activity_id: activity?.id });

        const redirectWithParams = (base, params) => {
            try {
                const url = new URL(base, window.location.origin);
                Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value || ''));
                window.location.href = url.toString();
            } catch (err) {
                const qs = Object.entries(params)
                    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value || '')}`)
                    .join('&');
                window.location.href = `${base}${base.includes('?') ? '&' : '?'}${qs}`;
            }
        };

        window.snap.pay(snapToken, {
            onSuccess: (result) => {
                redirectWithParams(finishUrl, { order_id: result?.order_id || '', activity_id: activity?.id || '' });
            },
            onPending: (result) => {
                redirectWithParams(finishUrl, { order_id: result?.order_id || '', activity_id: activity?.id || '' });
            },
            onError: (result) => {
                redirectWithParams(errorUrl, { order_id: result?.order_id || '', activity_id: activity?.id || '' });
            },
            onClose: () => {
                setLoading(false);
                redirectWithParams(unfinishUrl, { order_id: payment?.midtrans_transaction_id || '', activity_id: activity?.id || '' });
            },
        });
    };

    const content = (
        <div className="w-full bg-gray-50/70 flex items-center justify-center py-10">
            <div className="w-full max-w-3xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {!isAjax && (
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-primary to-secondary text-white">
                            <div>
                                <h4 className="font-bold text-lg text-white">Pembayaran Kegiatan</h4>
                                <p className="text-xs text-indigo-100">Selesaikan pembayaran dengan aman</p>
                            </div>
                        </div>
                    )}
                    <div className="p-6 space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200">
                            <table className="min-w-full text-sm">
                                <tbody className="divide-y divide-gray-100">
                                    <tr className="bg-gray-50/80">
                                        <td className="px-4 py-2.5 text-gray-500 w-1/3">Kegiatan</td>
                                        <td className="px-4 py-2.5 font-medium text-gray-900">{activity?.name || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2.5 text-gray-500">Total</td>
                                        <td className="px-4 py-2.5 font-bold text-secondary text-lg">
                                            Rp {Number(payment?.amount || 0).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <button
                            type="button"
                            onClick={handlePay}
                            disabled={loading}
                            className="w-full py-3.5 px-4 bg-secondary hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-60"
                        >
                            <i className="fas fa-credit-card mr-2"></i> {loading ? 'Memproses...' : 'Bayar Sekarang'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Head title={`Pembayaran - ${activity?.name || 'Kegiatan'}`} />
            {content}
        </>
    );
}

