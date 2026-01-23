import React, { useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function SubscriptionManagePayments({ subscriptions, stats }) {
    const { flash } = usePage().props;
    const rows = subscriptions?.data || subscriptions || [];

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

    return (
        <MainLayout>
            <Head title="Manajemen Pembayaran Langganan" />
            <div className="min-h-screen bg-white py-6 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Flash messages are handled globally */}


                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="rounded-lg shadow-md p-4 text-white bg-gradient-to-r from-primary to-secondary">
                            <div className="text-sm opacity-90">Total Langganan</div>
                            <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        </div>
                        <div className="rounded-lg shadow-md p-4 text-white bg-gradient-to-r from-yellow-500 to-orange-600">
                            <div className="text-sm opacity-90">Pending</div>
                            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
                        </div>
                        <div className="rounded-lg shadow-md p-4 text-white bg-gradient-to-r from-emerald-500 to-green-600">
                            <div className="text-sm opacity-90">Disetujui</div>
                            <div className="text-2xl font-bold">{stats?.approved || 0}</div>
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
                                                <td className="px-4 py-2 text-sm text-gray-700">{sub.status || '-'}</td>
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
        </MainLayout>
    );
}

