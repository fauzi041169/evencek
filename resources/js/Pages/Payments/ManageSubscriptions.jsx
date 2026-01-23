import React from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import Swal from 'sweetalert2';

export default function ManageSubscriptions({ activeSubscription, subscriptions, plans }) {
    const { flash } = usePage().props;

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleRenew = (id) => {
        router.post(route('subscriptions.renew', id), {}, {
            onSuccess: () => Swal.fire('Berhasil', 'Langganan berhasil diperpanjang', 'success'),
            onError: () => Swal.fire('Error', 'Gagal memperpanjang langganan', 'error'),
        });
    };

    return (
        <MainLayout>
            <Head title="Kelola Langganan" />
            
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl shadow-lg px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white flex items-center">
                                    <i className="fas fa-user-cog mr-3"></i>
                                    Kelola Langganan
                                </h2>
                                <Link href={route('subscriptions.pricing')} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all flex items-center">
                                    <i className="fas fa-arrow-left mr-2"></i>
                                    Kembali
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Flash messages are handled globally */}


                    {/* No Active Subscription */}
                    {!activeSubscription && (!subscriptions || subscriptions.length === 0) && (
                        <div className="bg-white rounded-xl shadow-xl overflow-hidden mb-6">
                            <div className="p-6 text-center">
                                <div className="bg-gray-100 rounded-full p-6 mb-4 inline-block">
                                    <i className="fas fa-credit-card text-4xl text-gray-400"></i>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Belum ada paket langganan</h3>
                                <p className="text-gray-600 mb-6">Belum ada paket langganan yang diambil. Silakan upgrade paket langganan untuk menikmati fitur lengkap.</p>
                                <Link href={route('subscriptions.pricing')} className="inline-flex items-center px-6 py-3 bg-secondary hover:bg-blue-700 text-white rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg">
                                    <i className="fas fa-arrow-up mr-2"></i>
                                    Upgrade Paket Langganan
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Subscription History */}
                    {subscriptions && subscriptions.length > 0 && (
                        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Riwayat Langganan</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {subscriptions.map((subscription) => (
                                        <div key={subscription.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4 shadow-sm hover:bg-gray-100 transition">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h4 className="text-lg font-bold text-gray-900">{subscription.plan?.name || 'Paket Tidak Diketahui'}</h4>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Mulai: {formatDate(subscription.start_date)}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        Berakhir: {formatDate(subscription.end_date)}
                                                    </p>
                                                </div>
                                                <div>
                                                    {subscription.status === 'active' && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                            Aktif
                                                        </span>
                                                    )}
                                                    {subscription.status === 'expired' && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                                            Kedaluwarsa
                                                        </span>
                                                    )}
                                                    {subscription.status === 'cancelled' && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                                            Dibatalkan
                                                        </span>
                                                    )}
                                                    {subscription.status === 'pending' && (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mt-4 flex gap-2">
                                                {subscription.status === 'expired' && (
                                                    <button 
                                                        onClick={() => handleRenew(subscription.id)}
                                                        className="px-3 py-2 bg-secondary hover:bg-blue-700 text-white rounded-md text-sm font-medium shadow"
                                                    >
                                                        Perpanjang
                                                    </button>
                                                )}
                                                {subscription.status === 'pending' && (
                                                    <Link 
                                                        href={route('subscriptions.payment.show', { subscription: subscription.id })} 
                                                        className="px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-sm font-medium shadow"
                                                    >
                                                        Lanjutkan Pembayaran
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}

