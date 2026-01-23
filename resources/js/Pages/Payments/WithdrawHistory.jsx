import React from 'react';
import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function WithdrawHistory({ withdrawals, stats }) {
    const rows = withdrawals?.data || withdrawals || [];

    return (
        <MainLayout>
            <Head title="Riwayat Penarikan" />
            <div className="min-h-screen bg-white py-6 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="mb-4 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800">
                        Saldo tersedia: Rp {Number(stats?.total_amount || 0).toLocaleString('id-ID')}
                    </div>

                    <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Tanggal</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Nominal</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {rows.length > 0 ? (
                                        rows.map((row) => (
                                            <tr key={row.id}>
                                                <td className="px-4 py-2 text-sm text-gray-700">{row.created_at || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-gray-700">{row.user?.name || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-right text-gray-700">
                                                    Rp {Number(row.amount || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">{row.status}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <Link
                                                        href={route('payments.withdraw.show', row.id)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10 hover:bg-blue-200 text-secondary"
                                                        title="Detail"
                                                    >
                                                        <i className="fas fa-eye text-xs"></i>
                                                    </Link>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-8 text-center text-sm text-gray-500">
                                                Tidak ada riwayat penarikan
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

