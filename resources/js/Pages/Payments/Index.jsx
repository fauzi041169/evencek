import React, { useState } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import ManualPaymentModal from '@/Components/Activity/ManualPaymentModal';
import axios from 'axios';

export default function Index({ activity, payments, existingPayment }) {
    const { flash } = usePage().props;
    const rows = payments?.data || payments || [];
    
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentModalData, setPaymentModalData] = useState(null);
    const [loadingPaymentModal, setLoadingPaymentModal] = useState(false);

    const handlePaymentClick = (e) => {
        e.preventDefault();
        setLoadingPaymentModal(true);
        axios.get(route('payments.create', { activity: activity.id, modal: true }))
            .then(res => {
                if (res.data.redirect_url) {
                    window.location.href = res.data.redirect_url;
                } else if (res.data.success !== false) {
                    setPaymentModalData(res.data);
                    setShowPaymentModal(true);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: 'Gagal memuat form pembayaran. Silakan coba lagi.',
                    });
                }
            })
            .catch(err => {
                console.error('Error fetching payment data:', err);
                Swal.fire({
                    icon: 'error',
                    title: 'Kesalahan',
                    text: 'Terjadi kesalahan saat memuat data pembayaran.',
                });
            })
            .finally(() => setLoadingPaymentModal(false));
    };

    return (
        <MainLayout>
            <Head title="Daftar Transaksi" />
            <div className="min-h-screen bg-white py-6 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
                        <div className="bg-gradient-to-r from-primary to-pink-600 px-6 py-4 flex items-center justify-between">
                            <h4 className="text-white text-xl font-bold flex items-center">
                                <i className="fas fa-money-check-alt mr-2"></i> Daftar Transaksi
                            </h4>
                            {activity?.id ? (
                                <Link
                                    href={route('payments.create', activity.id)}
                                    className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-md text-sm transition"
                                >
                                    Tambah Transaksi
                                </Link>
                            ) : (
                                <span className="text-xs text-white/80">Activity ID tidak ditemukan</span>
                            )}
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            {/* Flash messages are handled globally */}

                            {existingPayment && (
                                <div className="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
                                    Anda sudah memiliki transaksi untuk kegiatan ini. Status terakhir:{" "}
                                    <span className="font-semibold">{existingPayment.status}</span>
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">No</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Tanggal</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Kegiatan</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Jumlah</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Metode</th>
                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {rows.length > 0 ? (
                                            rows.map((payment, index) => (
                                                <tr key={payment.id}>
                                                    <td className="px-4 py-2 text-sm text-gray-700">{index + 1}</td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">
                                                        {payment.created_at || '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">
                                                        {payment.activity?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">
                                                        Rp {Number(payment.amount || 0).toLocaleString('id-ID')}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm text-gray-700">
                                                        {payment.payment_method?.name || payment.paymentMethod?.name || '-'}
                                                    </td>
                                                    <td className="px-4 py-2 text-sm">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {payment.status || '-'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2 text-center">
                                                        {payment.id ? (
                                                            <Link
                                                                href={route('payments.show', payment.id)}
                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10 hover:bg-blue-200 text-secondary"
                                                                title="Detail"
                                                            >
                                                                <i className="fas fa-eye text-xs"></i>
                                                            </Link>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500">
                                                    Tidak ada data transaksi
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ManualPaymentModal
                show={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                activity={paymentModalData?.activity || activity}
                paymentMethods={paymentModalData?.paymentMethods || []}
                bulk_import_payment={paymentModalData?.bulk_import_payment}
                defaultSenderName={paymentModalData?.defaultSenderName}
            />
        </MainLayout>
    );
}

