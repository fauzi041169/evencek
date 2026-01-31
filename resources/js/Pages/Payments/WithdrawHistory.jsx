import React from 'react';
import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function WithdrawHistory({ withdrawals, stats }) {
    const rows = withdrawals?.data || withdrawals || [];

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
            <Head title="Riwayat Penarikan" />
            <div className="min-h-screen bg-white py-6 px-4">
                <div className="max-w-full mx-auto">
                    <FinanceNav />
                    <div className="mb-6">
                        <div className="bg-teal-600 rounded-xl shadow-lg p-5 text-white inline-block min-w-[300px] transform transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-lg">
                                    <i className="fas fa-sack-dollar text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase opacity-80 mb-1">Saldo Tersedia</div>
                                    <div className="text-2xl font-bold">Rp {Number(stats?.total_amount || 0).toLocaleString('id-ID')}</div>
                                </div>
                            </div>
                        </div>
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

