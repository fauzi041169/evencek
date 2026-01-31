import React, { useMemo, useState } from 'react';
import { Head, router, usePage, Link, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import Modal from '@/Components/Modal';

export default function SubscriptionManagePayments({ subscriptions, stats }) {
    const { flash } = usePage().props;
    const rows = subscriptions?.data || subscriptions || [];

    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        status: '',
        reason: '',
    });

    const openModal = (sub) => {
        setSelectedSubscription(sub);
        setData({
            status: sub.status,
            reason: '',
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedSubscription(null);
        reset();
    };

    const updateStatus = (e) => {
        e.preventDefault();
        post(route('subscriptions.payments.status', selectedSubscription.id), {
            onSuccess: () => closeModal(),
        });
    };

    const initialFilters = useMemo(() => {
        const params = new URLSearchParams(window.location.search);
        return {
            search: params.get('search') || '',
            status: params.get('status') || '',
            payment_type: params.get('payment_type') || '',
            sort_by: params.get('sort_by') || 'created_at',
            sort_order: params.get('sort_order') || 'desc',
        };
    }, []);

    const submitFilter = (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form).entries());
        router.get(window.location.pathname, data, { preserveState: true, replace: true });
    };

    const FinanceNav = () => (
        <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-gray-100/50 rounded-2xl border border-gray-200">
            <Link
                href={route('payments.rules')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('payments.rules') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className={`fas fa-sliders-h transition-transform duration-500 ${route().current('payments.rules') ? 'rotate-180' : ''}`}></i>
                <span>Administrasi</span>
            </Link>
            <Link
                href={route('payments.manage')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('payments.manage') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className={`fas fa-wallet transition-bounce ${route().current('payments.manage') ? 'animate-bounce' : ''}`}></i>
                <span>Kegiatan</span>
            </Link>
            <Link
                href={route('subscriptions.payments.manage')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('subscriptions.payments.manage') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className={`fas fa-file-invoice transition-pulse ${route().current('subscriptions.payments.manage') ? 'animate-pulse' : ''}`}></i>
                <span>Langganan</span>
            </Link>
            <Link
                href={route('payments.admin.withdraw.history')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('payments.admin.withdraw.history') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className="fas fa-money-bill-transfer"></i>
                <span>Penarikan</span>
            </Link>
            <Link
                href={route('payments.ledger')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('payments.ledger') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className={`fas fa-balance-scale transition-tilt ${route().current('payments.ledger') ? 'rotate-12' : ''}`}></i>
                <span>Neraca</span>
            </Link>
        </div>
    );

    return (
        <MainLayout title="Keuangan Sistem">
            <Head title="Manajemen Pembayaran Langganan" />
            <div className="min-h-screen bg-white py-6 px-4">
                <div className="max-w-full mx-auto">
                    <FinanceNav />
                    {/* Flash messages are handled globally */}


                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-indigo-600 rounded-xl shadow-lg p-5 text-white transform transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-lg">
                                    <i className="fas fa-file-invoice text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase opacity-80 mb-1">Total Langganan</div>
                                    <div className="text-2xl font-bold">{stats?.total || 0}</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-amber-500 rounded-xl shadow-lg p-5 text-white transform transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-lg">
                                    <i className="fas fa-clock text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase opacity-80 mb-1">Pending</div>
                                    <div className="text-2xl font-bold">{stats?.pending || 0}</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-600 rounded-xl shadow-lg p-5 text-white transform transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-lg">
                                    <i className="fas fa-check-circle text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase opacity-80 mb-1">Disetujui</div>
                                    <div className="text-2xl font-bold">{stats?.approved || 0}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <form onSubmit={submitFilter} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cari</label>
                                <input
                                    type="text"
                                    name="search"
                                    defaultValue={initialFilters.search}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select name="status" defaultValue={initialFilters.status} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Semua</option>
                                    <option value="pending">Pending</option>
                                    <option value="active">Aktif</option>
                                    <option value="cancelled">Dibatalkan</option>
                                    <option value="expired">Kedaluwarsa</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                                <select name="payment_type" defaultValue={initialFilters.payment_type} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Semua</option>
                                    <option value="midtrans">Otomatis</option>
                                    <option value="manual">Manual</option>
                                    <option value="gratis">Gratis</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Urutkan</label>
                                <select name="sort_by" defaultValue={initialFilters.sort_by} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="created_at">Tanggal</option>
                                    <option value="end_date">Tanggal Berakhir</option>
                                    <option value="start_date">Tanggal Mulai</option>
                                </select>
                            </div>
                            <div className="flex items-end gap-2">
                                <select name="sort_order" defaultValue={initialFilters.sort_order} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="desc">Terbaru</option>
                                    <option value="asc">Terlama</option>
                                </select>
                                <button type="submit" className="px-4 py-2 bg-secondary text-white rounded-md">
                                    <i className="fas fa-search"></i>
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">No</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Paket</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Jumlah</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {rows.length > 0 ? (
                                        rows.map((sub, idx) => (
                                            <tr key={sub.id}>
                                                <td className="px-4 py-2 text-sm text-gray-700">{idx + 1}</td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                    {sub.user?.name || '-'}
                                                    <div className="text-xs text-gray-500">{sub.user?.email || ''}</div>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">{sub.plan?.name || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-right text-gray-700">
                                                    Rp {Number(sub.plan?.price || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                    <button
                                                        type="button"
                                                        onClick={() => openModal(sub)}
                                                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                            sub.status === 'active' ? 'bg-green-100 text-green-800' :
                                                            sub.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            sub.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                        } hover:opacity-80 transition-opacity`}
                                                    >
                                                        {sub.status || '-'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                                                Tidak ada data pembayaran langganan
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <Modal show={isModalOpen} onClose={closeModal}>
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">Detail Langganan</h2>
                    {selectedSubscription && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">User</label>
                                    <div className="mt-1 text-sm text-gray-900">
                                        {selectedSubscription.user?.name} <br />
                                        <span className="text-gray-500">{selectedSubscription.user?.email}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Paket</label>
                                    <div className="mt-1 text-sm text-gray-900">{selectedSubscription.plan?.name}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Harga</label>
                                    <div className="mt-1 text-sm text-gray-900">Rp {Number(selectedSubscription.plan?.price || 0).toLocaleString('id-ID')}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Metode</label>
                                    <div className="mt-1 text-sm text-gray-900">
                                        {selectedSubscription.midtrans_order_id ? 'Otomatis (Midtrans)' : 'Manual / Gratis'}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tanggal Mulai</label>
                                    <div className="mt-1 text-sm text-gray-900">{selectedSubscription.start_date ? new Date(selectedSubscription.start_date).toLocaleDateString('id-ID') : '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tanggal Berakhir</label>
                                    <div className="mt-1 text-sm text-gray-900">{selectedSubscription.end_date ? new Date(selectedSubscription.end_date).toLocaleDateString('id-ID') : '-'}</div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Order ID</label>
                                    <div className="mt-1 text-sm text-gray-900 font-mono">{selectedSubscription.midtrans_order_id || '-'}</div>
                                </div>
                            </div>

                            <hr className="my-4" />

                            <form onSubmit={updateStatus}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Ubah Status</label>
                                    <select
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        disabled={!!selectedSubscription.midtrans_order_id}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="active">Active</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                    {selectedSubscription.midtrans_order_id && (
                                        <p className="mt-1 text-xs text-red-500">
                                            Status pembayaran via Midtrans dikelola otomatis.
                                        </p>
                                    )}
                                    {errors.status && <div className="text-red-500 text-xs mt-1">{errors.status}</div>}
                                </div>

                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Catatan / Alasan</label>
                                    <textarea
                                        value={data.reason}
                                        onChange={(e) => setData('reason', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                        rows="3"
                                        placeholder="Catatan perubahan status..."
                                        disabled={!!selectedSubscription.midtrans_order_id}
                                    ></textarea>
                                    {errors.reason && <div className="text-red-500 text-xs mt-1">{errors.reason}</div>}
                                </div>

                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing || !!selectedSubscription.midtrans_order_id}
                                        className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${processing || !!selectedSubscription.midtrans_order_id
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                                            }`}
                                    >
                                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </Modal>
        </MainLayout>
    );
}

