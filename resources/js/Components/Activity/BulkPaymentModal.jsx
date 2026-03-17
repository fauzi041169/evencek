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

    const failures = Array.isArray(importResult?.failures) ? importResult.failures : [];
    const hasFailures = failures.length > 0;
    const skippedCount = Number.isFinite(Number(importResult?.skipped)) ? Number(importResult?.skipped) : failures.length;

    const newUsers = importResult?.stats?.new_users ?? 0;
    const billableParticipants = importResult?.stats?.new_participants ?? importResult?.debug_info?.pending_count ?? 0;
    const alreadyRegistered = importResult?.stats?.already_registered ?? 0;
    const totalInputRows = importResult?.stats?.total_input_rows;
    const totalRawRows = importResult?.stats?.total_raw_rows;
    const pricePerPerson = Number(activity?.price ?? 0);
    const grossAmount = Number(billableParticipants) * pricePerPerson;

    useEffect(() => {
        if (show && activity?.id) {
            setPaymentMode('selection');
            if (!hasFailures && Number(billableParticipants) > 0) {
                fetchUnifiedMethods();
            }
        } else {
            setPaymentMode(null);
            setSnapToken(null);
            setSelectedChannel(null);
        }
    }, [show, activity?.id, hasFailures, billableParticipants]);

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
                    params: { modal: '1', ajax: '1' }
                });

                if (paymentResponse.data.snapToken) {
                    setLoading(false);

                    // Directly open Snap popup
                    if (!window.snap) {
                        Swal.fire('Error', 'Midtrans Snap belum siap. Silakan refresh halaman.', 'error');
                        setPaymentMode('selection');
                        return;
                    }

                    onClose();
                    window.snap.pay(paymentResponse.data.snapToken, {
                        onSuccess: (result) => {
                            console.log('Payment success:', result);
                            window.location.reload();
                        },
                        onPending: (result) => {
                            console.log('Payment pending:', result);
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

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="bg-white rounded-xl overflow-hidden max-h-[95vh] flex flex-col shadow-2xl">
                {/* Header: Judul utama = Ringkasan Impor & Perhitungan */}
                <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-lg font-bold">Ringkasan Impor & Perhitungan</h3>
                            <p className="text-indigo-100 text-sm mt-0.5">Perhitungan dari data impor — hanya user baru dan peserta baru yang dikenakan biaya.</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/20 text-white/90 transition-colors" aria-label="Tutup">
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-indigo-50/40 to-gray-50/60">
                    {loading ? (
                        <div className="py-20 text-center">
                            <div className="flex justify-center mb-4">
                                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-gray-500 font-semibold text-sm">Memproses transaksi...</p>
                        </div>
                    ) : paymentMode === 'selection' ? (
                        <>
                            {hasFailures && (
                                <div className="bg-white rounded-xl border border-red-200 shadow-md overflow-hidden">
                                    <div className="px-5 py-4 border-b border-red-100 bg-gradient-to-r from-red-50 to-white">
                                        <h4 className="text-sm font-bold text-red-900 flex items-center gap-2">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 text-red-600"><i className="fas fa-triangle-exclamation"></i></span>
                                            Ada data yang gagal saat impor
                                        </h4>
                                        <p className="text-xs text-red-700 mt-1">
                                            Perbaiki baris yang gagal dulu, lalu impor ulang. Pembayaran tidak dapat dilanjutkan sebelum semua baris valid.
                                        </p>
                                    </div>
                                    <div className="p-5">
                                        <div className="overflow-hidden border border-red-100 rounded-xl bg-red-50/30">
                                            <div className="max-h-64 overflow-y-auto">
                                                <table className="min-w-full divide-y divide-red-100">
                                                    <thead className="bg-red-50/50 sticky top-0 backdrop-blur-sm">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-[10px] font-bold text-red-800 uppercase tracking-widest">Baris</th>
                                                            <th className="px-4 py-2 text-left text-[10px] font-bold text-red-800 uppercase tracking-widest">Email</th>
                                                            <th className="px-4 py-2 text-left text-[10px] font-bold text-red-800 uppercase tracking-widest">Alasan</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-red-100">
                                                        {failures.map((err, i) => (
                                                            <tr key={i} className="hover:bg-red-50/50 transition-colors">
                                                                <td className="px-4 py-2.5 text-xs font-mono text-red-900 leading-relaxed font-bold">{err.row || i + 1}</td>
                                                                <td className="px-4 py-2.5 text-xs text-red-700 leading-relaxed truncate max-w-[170px]" title={err.email}>{err.email || '-'}</td>
                                                                <td className="px-4 py-2.5 text-xs text-red-600 leading-relaxed font-medium">
                                                                    {err.error || err.reason || (typeof err === 'string' ? err : 'Terjadi kesalahan tidak diketahui')}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <div className="mt-3 text-xs text-gray-600">
                                            {totalInputRows != null && (
                                                <div>
                                                    Diproses: <span className="font-semibold">{totalInputRows}</span>{totalRawRows != null && totalRawRows !== totalInputRows ? ` (dari ${totalRawRows})` : ''} · Sudah jadi peserta: <span className="font-semibold">{alreadyRegistered}</span> · Gagal: <span className="font-semibold text-red-700">{skippedCount}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* BLOK 1: Perhitungan dari data impor — paling atas */}
                            <div className="bg-white rounded-xl border border-indigo-100 shadow-md overflow-hidden">
                                <div className="px-5 py-4 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-white">
                                    <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600"><i className="fas fa-calculator"></i></span>
                                        Perhitungan dari data impor
                                    </h4>
                                </div>
                                <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:justify-start gap-1 p-4 rounded-xl bg-blue-50 border border-blue-100">
                                            <span className="text-xs font-medium text-blue-700">User baru</span>
                                            <span className="text-2xl font-bold text-blue-700">{newUsers}</span>
                                        </div>
                                        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:justify-start gap-1 p-4 rounded-xl bg-amber-50 border border-amber-100">
                                            <span className="text-xs font-medium text-amber-700">Sudah jadi peserta</span>
                                            <span className="text-2xl font-bold text-amber-700">{alreadyRegistered}</span>
                                            <p className="text-[10px] text-amber-600 mt-1 sm:mt-0.5">Tidak masuk perhitungan biaya</p>
                                        </div>
                                        <div className="flex items-center justify-between sm:flex-col sm:items-start sm:justify-start gap-1 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                                            <span className="text-xs font-medium text-emerald-700">Peserta baru</span>
                                            <span className="text-2xl font-bold text-emerald-700">{billableParticipants}</span>
                                            <p className="text-[10px] text-emerald-600 mt-1 sm:mt-0.5">Yang akan dibuatkan tagihan</p>
                                        </div>
                                    </div>
                                    {totalInputRows != null && (
                                        <p className="text-xs text-gray-500 -mt-1">
                                            Data diproses: <strong>{totalInputRows}</strong> baris{totalRawRows != null && totalRawRows !== totalInputRows ? ` (dari ${totalRawRows} baris; email sama dihitung sekali)` : ''}{skippedCount ? ` · Gagal: ${skippedCount}` : ''}
                                        </p>
                                    )}
                                    <div className="pt-3 border-t border-gray-100 space-y-2">
                                        <div className="flex justify-between text-sm text-gray-600">
                                            <span>Harga per peserta</span>
                                            <span className="font-semibold text-gray-800">Rp {new Intl.NumberFormat('id-ID').format(pricePerPerson)}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-3 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100">
                                            <span className="font-bold text-indigo-800">Total bayar</span>
                                            <span className="text-xl font-black text-indigo-700">Rp {new Intl.NumberFormat('id-ID').format(grossAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BLOK 2: Pilih metode pembayaran */}
                            <div className="bg-white rounded-xl border border-indigo-100 shadow-md overflow-hidden">
                                <div className="px-5 py-4 border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-white">
                                    <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600"><i className="fas fa-credit-card"></i></span>
                                        Pilih Metode Pembayaran
                                    </h4>
                                </div>
                                <div className="p-5">
                                    {hasFailures || Number(billableParticipants) <= 0 ? (
                                        <div className="text-sm text-gray-600">
                                            {hasFailures ? 'Perbaiki data yang gagal terlebih dahulu untuk melanjutkan pembayaran.' : 'Tidak ada peserta baru yang perlu dibayar.'}
                                        </div>
                                    ) : (
                                        <ChannelList
                                            channels={midtransChannels}
                                            manualMethods={paymentMethods}
                                            isSelectionMode={true}
                                            onSelect={handleChannelSelect}
                                            selectedId={selectedChannel}
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="relative">
                            <div className="mb-4">
                                <button onClick={() => setPaymentMode('selection')} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 transition-colors">
                                    <i className="fas fa-arrow-left"></i> Kembali ke pilihan metode
                                </button>
                            </div>
                            <ManualForm
                                activity={activity}
                                paymentMethods={paymentMethods.filter(m => m.id === selectedChannel)}
                                bulk_import_payment={{
                                    gross_amount: grossAmount
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
