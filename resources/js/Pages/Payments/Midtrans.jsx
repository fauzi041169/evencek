import React, { useEffect, useState } from 'react';
import { Head } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';

export default function Midtrans({ payment, activity, snapToken, isAjax, midtransClientKey, midtransIsProduction, channels = [] }) {
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState(snapToken);
    const [selectedChannel, setSelectedChannel] = useState(null);
    const [amountDetails, setAmountDetails] = useState({
        amount: payment?.amount || 0,
        admin_fee: payment?.admin_fee || 0
    });

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

    // Update internal state when props change (e.g. re-renders)
    useEffect(() => {
        setToken(snapToken);
        setAmountDetails({
            amount: payment?.amount || 0,
            admin_fee: payment?.admin_fee || 0
        });
    }, [snapToken, payment]);

    const handleChannelSelect = async (channel) => {
        if (loading) return;
        setLoading(true);
        try {
            const response = await axios.post(route('midtrans.payment.update-token'), {
                payment_id: payment.id,
                channel_code: channel.code
            });

            if (response.data.status === 'success') {
                setToken(response.data.snapToken);
                setAmountDetails({
                    amount: response.data.amount,
                    admin_fee: response.data.admin_fee
                });
                setSelectedChannel(channel);
            }
        } catch (error) {
            console.error('Failed to update payment channel', error);
            Swal.fire({
                title: 'Gagal',
                text: 'Gagal memperbarui metode pembayaran. Silakan coba lagi.',
                icon: 'error',
                confirmButtonColor: '#E02424'
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePay = () => {
        if (!window.snap || typeof window.snap.pay !== 'function') {
            Swal.fire({
                title: 'Gagal Memuat Sistem',
                text: 'Gagal memuat sistem pembayaran otomatis. Mohon refresh halaman dan coba lagi.',
                icon: 'error',
                confirmButtonColor: '#E02424'
            });
            return;
        }
        if (!token) {
            Swal.fire({
                title: 'Token Tidak Tersedia',
                text: 'Token pembayaran tidak tersedia.',
                icon: 'error',
                confirmButtonColor: '#E02424'
            });
            return;
        }
        
        // Ensure channel is selected if channels are available
        if (channels.length > 0 && !selectedChannel) {
             Swal.fire({
                title: 'Pilih Metode Pembayaran',
                text: 'Silakan pilih metode pembayaran terlebih dahulu untuk melanjutkan.',
                icon: 'warning',
                confirmButtonColor: '#E02424'
            });
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

        window.snap.pay(token, {
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

    const groupedChannels = channels.reduce((acc, channel) => {
        const type = channel.type || 'other';
        if (!acc[type]) acc[type] = [];
        acc[type].push(channel);
        return acc;
    }, {});

    const typeLabels = {
        'bank_transfer': 'Transfer Bank (Virtual Account)',
        'e_wallet': 'E-Wallet / QRIS',
        'cstore': 'Minimarket',
        'cardless_credit': 'Cicilan Tanpa Kartu',
        'credit_card': 'Kartu Kredit/Debit'
    };

    const content = (
        <div className="w-full bg-gray-50/70 flex items-center justify-center py-3 sm:py-6">
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
                    <div className="p-6 space-y-6">
                        
                        {/* Channel Selection */}
                        {channels.length > 0 && (
                            <div className="space-y-4">
                                <h3 className="font-semibold text-gray-800 border-b pb-2">Pilih Metode Pembayaran</h3>
                                {Object.entries(groupedChannels).map(([type, groupChannels]) => (
                                    <div key={type} className="space-y-2">
                                        <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{typeLabels[type] || type}</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {groupChannels.map((channel) => (
                                                <div 
                                                    key={channel.code}
                                                    onClick={() => handleChannelSelect(channel)}
                                                    className={`cursor-pointer rounded-xl border p-3 flex items-center space-x-3 transition-all ${
                                                        selectedChannel?.code === channel.code 
                                                            ? 'border-secondary ring-2 ring-secondary/20 bg-blue-50' 
                                                            : 'border-gray-200 hover:border-secondary/50 hover:bg-gray-50'
                                                    }`}
                                                >
                                                    {channel.icon_url && (
                                                        <img src={`/${channel.icon_url}`} alt={channel.name} className="h-8 w-auto object-contain" />
                                                    )}
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-800 text-sm">{channel.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            Biaya: {channel.fee_type === 'percent' ? `${channel.fee}%` : `Rp ${Number(channel.fee).toLocaleString('id-ID')}`}
                                                        </div>
                                                    </div>
                                                    {selectedChannel?.code === channel.code && (
                                                        <div className="text-secondary">
                                                            <i className="fas fa-check-circle"></i>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Summary */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <table className="min-w-full text-sm">
                                <tbody className="divide-y divide-gray-100">
                                    <tr className="bg-gray-50/80">
                                        <td className="px-4 py-2.5 text-gray-500 w-1/3">Kegiatan</td>
                                        <td className="px-4 py-2.5 font-medium text-gray-900">{activity?.name || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-2.5 text-gray-500">Harga Dasar</td>
                                        <td className="px-4 py-2.5 font-medium text-gray-900">
                                            Rp {Number(amountDetails.amount - amountDetails.admin_fee).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                    {amountDetails.admin_fee > 0 && (
                                        <tr>
                                            <td className="px-4 py-2.5 text-gray-500">Biaya Layanan</td>
                                            <td className="px-4 py-2.5 font-medium text-orange-600">
                                                + Rp {Number(amountDetails.admin_fee).toLocaleString('id-ID')}
                                            </td>
                                        </tr>
                                    )}
                                    <tr className="bg-blue-50/50">
                                        <td className="px-4 py-3 text-gray-700 font-bold">Total Bayar</td>
                                        <td className="px-4 py-3 font-bold text-secondary text-xl">
                                            Rp {Number(amountDetails.amount).toLocaleString('id-ID')}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <button
                            type="button"
                            onClick={handlePay}
                            disabled={loading || (channels.length > 0 && !selectedChannel)}
                            className={`w-full py-3.5 px-4 font-bold rounded-xl shadow-lg flex items-center justify-center transition-all ${
                                loading || (channels.length > 0 && !selectedChannel)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-secondary hover:bg-blue-700 text-white'
                            }`}
                        >
                            {loading ? (
                                <><i className="fas fa-spinner fa-spin mr-2"></i> Memproses...</>
                            ) : (
                                <><i className="fas fa-credit-card mr-2"></i> Bayar Sekarang</>
                            )}
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
