import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import ManualForm from '@/Pages/Payments/ManualForm';
import { ChannelList } from '@/Pages/Payments/Channels';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function BulkPaymentModal({ show, onClose, activity, importResult, return_to }) {
    const [loading, setLoading] = useState(false);
    const [paymentMode, setPaymentMode] = useState(null); // 'selection' | 'midtrans' | 'manual'
    const [snapToken, setSnapToken] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [creatorBank, setCreatorBank] = useState(null);
    const [creatorBankAccounts, setCreatorBankAccounts] = useState([]);
    const [defaultSenderName, setDefaultSenderName] = useState('');
    const [defaultSenderBank, setDefaultSenderBank] = useState('');
    const [midtransChannels, setMidtransChannels] = useState([]);
    const [selectedChannel, setSelectedChannel] = useState(null);

    useEffect(() => {
        if (show && activity?.id) {
            setPaymentMode('selection');
            fetchUnifiedMethods();
        } else {
            setPaymentMode(null);
            setSnapToken(null);
            setSelectedChannel(null);
        }
    }, [show, activity?.id]);

    const fetchUnifiedMethods = async () => {
        setLoading(true);
        try {
            if (activity.payment_method_type === 'automatic') {
                const midtransRes = await axios.get(route('payments.midtrans.channels'));
                if (midtransRes.data.success) {
                    setMidtransChannels(midtransRes.data.channels);
                }
            }

            const manualRes = await axios.get(route('payments.methods', activity.id));
            if (manualRes.data.success) {
                setPaymentMethods(manualRes.data.paymentMethods);
                setCreatorBank(manualRes.data.creatorBank);
                setCreatorBankAccounts(manualRes.data.creatorBankAccounts);
                setDefaultSenderName(manualRes.data.defaultSenderName);
                setDefaultSenderBank(manualRes.data.defaultSenderBank);
            }
        } catch (err) {
            console.error("Error fetching payment methods", err);
        } finally {
            setLoading(false);
        }
    };

    const handleChannelSelect = (channel) => {
        if (channel.is_manual) {
            setPaymentMode('manual');
            setSelectedChannel(channel.id);
        } else {
            // Directly process Midtrans payment
            processMidtransPayment(channel.code);
        }
    };

    const processMidtransPayment = async (channelCode = null) => {
        setLoading(true);
        setSelectedChannel(channelCode);

        try {
            const response = await axios.get(route('payments.create', {
                activity: activity.id,
                modal: 1,
                is_bulk: 1,
                channel_code: channelCode
            }));

            const isMidtransUrl = response.data.redirect_url && response.data.redirect_url.includes('/midtrans/payment/');

            if (isMidtransUrl) {
                setPaymentMode('midtrans');

                const paymentResponse = await axios.get(response.data.redirect_url, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
                    params: { modal: 'true', is_ajax: 'true' }
                });

                if (paymentResponse.data.snapToken) {
                    setLoading(false);

                    // Directly open Snap popup
                    if (!window.snap) {
                        Swal.fire('Error', 'Midtrans Snap belum siap. Silakan refresh halaman.', 'error');
                        setPaymentMode('selection');
                        return;
                    }

                    window.snap.pay(paymentResponse.data.snapToken, {
                        onSuccess: (result) => {
                            console.log('Payment success:', result);
                            onClose();
                            window.location.reload();
                        },
                        onPending: (result) => {
                            console.log('Payment pending:', result);
                            onClose();
                            window.location.reload();
                        },
                        onError: (result) => {
                            console.error('Payment error:', result);
                            Swal.fire({
                                title: 'Pembayaran Gagal',
                                text: 'Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.',
                                icon: 'error',
                                confirmButtonColor: '#3b82f6'
                            });
                            setPaymentMode('selection');
                        },
                        onClose: () => {
                            console.log('Payment popup closed');
                            setPaymentMode('selection');
                        }
                    });
                } else {
                    setPaymentMode('selection');
                    setLoading(false);
                    Swal.fire('Error', 'Gagal mendapatkan token pembayaran', 'error');
                }
            } else {
                setPaymentMode('manual');
                setLoading(false);
            }
        } catch (error) {
            console.error("Error processing Midtrans payment", error);
            setLoading(false);

            if (error.response && error.response.status === 422) {
                setPaymentMode('manual');
            } else {
                Swal.fire({
                    title: 'Error',
                    text: 'Gagal menghubungi server pembayaran. Silakan coba lagi atau pilih metode manual.',
                    icon: 'error',
                    confirmButtonColor: '#3b82f6'
                });
                setPaymentMode('selection');
            }
        }
    };

    if (!show) return null;

    const bulkPaymentData = importResult ? {
        gross_amount: importResult.stats?.total_bill || 0,
        participant_count: importResult.stats?.success || 0,
    } : null;

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="bg-white rounded-lg overflow-hidden max-h-[95vh] flex flex-col">
                {/* Header matching image title style */}
                <div className="bg-white px-6 py-4 border-b">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800">Pilih Metode Pembayaran</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="flex justify-center mb-4">
                                <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Memproses Transaksi...</p>
                        </div>
                    ) : paymentMode === 'selection' ? (
                        <>
                            {/* RENDER THE ACTUAL ChannelList FROM Channels.jsx IN GRID MODE */}
                            <ChannelList
                                channels={midtransChannels}
                                manualMethods={paymentMethods}
                                isSelectionMode={true}
                                onSelect={handleChannelSelect}
                                selectedId={selectedChannel}
                            />

                            {/* SUMMARY BOX AT THE BOTTOM - IDENTICAL TO IMAGE */}
                            <div className="mt-8 border rounded-2xl overflow-hidden bg-gray-50/30">
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-gray-100">
                                        <tr>
                                            <td className="px-5 py-3 text-gray-500 font-medium">Layanan</td>
                                            <td className="px-5 py-3 text-right font-bold text-gray-800">Pembayaran Massal ({bulkPaymentData?.participant_count} Peserta)</td>
                                        </tr>
                                        <tr>
                                            <td className="px-5 py-3 text-gray-500 font-medium">Harga Dasar</td>
                                            <td className="px-5 py-3 text-right font-bold text-gray-800">Rp {new Intl.NumberFormat('id-ID').format(bulkPaymentData?.gross_amount || 0)}</td>
                                        </tr>
                                        <tr className="bg-blue-50/50">
                                            <td className="px-5 py-4 text-gray-800 font-black">Total Bayar</td>
                                            <td className="px-5 py-4 text-right font-black text-secondary text-2xl">
                                                Rp {new Intl.NumberFormat('id-ID').format(bulkPaymentData?.gross_amount || 0)}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="relative">
                            <div className="mb-6">
                                <button onClick={() => setPaymentMode('selection')} className="text-[10px] font-black text-gray-400 hover:text-secondary flex items-center gap-2 uppercase tracking-widest transition-colors">
                                    <i className="fas fa-arrow-left"></i> Kembali ke Semua Pilihan
                                </button>
                            </div>
                            <ManualForm
                                activity={activity}
                                paymentMethods={paymentMethods.filter(m => m.id === selectedChannel)}
                                bulk_import_payment={{
                                    gross_amount: bulkPaymentData?.gross_amount || 0
                                }}
                                is_modal={true}
                                defaultSenderName={defaultSenderName}
                                defaultSenderBank={defaultSenderBank}
                                return_to={return_to}
                                onSuccess={onClose}
                            />
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
