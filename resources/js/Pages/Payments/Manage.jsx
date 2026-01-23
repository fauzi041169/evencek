import React, { useMemo } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function Manage({ payments, stats, bankAccount }) {
    const { flash } = usePage().props;
    const rows = payments?.data || payments || [];

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
            <Head title="Keuangan" />
            <div className="min-h-screen bg-white py-6 px-4">
                <div className="max-w-7xl mx-auto">
                    {flash?.success && (
                        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {flash.error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-secondary text-white rounded-lg shadow-md p-5">
                            <div className="text-sm uppercase">Total</div>
                            <div className="text-2xl font-bold">{stats?.total || 0}</div>
                        </div>
                        <div className="bg-yellow-500 text-white rounded-lg shadow-md p-5">
                            <div className="text-sm uppercase">Pending</div>
                            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
                        </div>
                        <div className="bg-green-600 text-white rounded-lg shadow-md p-5">
                            <div className="text-sm uppercase">Disetujui</div>
                            <div className="text-2xl font-bold">{stats?.approved || 0}</div>
                        </div>
                        <div className="bg-teal-600 text-white rounded-lg shadow-md p-5">
                            <div className="text-sm uppercase">Saldo</div>
                            <div className="text-2xl font-bold">
                                Rp {Number(stats?.balance_amount || 0).toLocaleString('id-ID')}
                            </div>
                        </div>
                    </div>

                    {bankAccount && (
                        <div className="mb-6 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800">
                            Rekening tersimpan: {bankAccount.bank_name || '-'} â€¢ {bankAccount.account_name || '-'} â€¢ {bankAccount.account_number || '-'}
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <form onSubmit={submitFilter} className="grid grid-cols-1 md:grid-cols-6 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cari</label>
                                <input
                                    type="text"
                                    name="search"
                                    defaultValue={initialFilters.search}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Nama kegiatan atau user..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select name="status" defaultValue={initialFilters.status} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Semua</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Disetujui</option>
                                    <option value="rejected">Ditolak</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                                <select name="payment_type" defaultValue={initialFilters.payment_type} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="">Semua</option>
                                    <option value="midtrans">Otomatis</option>
                                    <option value="manual">Manual</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Urutkan</label>
                                <select name="sort_by" defaultValue={initialFilters.sort_by} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                                    <option value="created_at">Tanggal</option>
                                    <option value="amount">Jumlah</option>
                                    <option value="status">Status</option>
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
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Tanggal</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Kegiatan</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Jumlah</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {rows.length > 0 ? (
                                        rows.map((payment, index) => (
                                            <tr key={payment.id}>
                                                <td className="px-4 py-2 text-sm text-gray-700">{index + 1}</td>
                                                <td className="px-4 py-2 text-sm text-gray-700">{payment.created_at || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                    {payment.user?.name || '-'}
                                                    <div className="text-xs text-gray-500">{payment.user?.email || ''}</div>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">{payment.activity?.name || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-700 text-right">
                                                    Rp {Number(payment.amount || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">
                                                    {payment.status || '-'}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                                                Tidak ada data pembayaran
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

