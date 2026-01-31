import React, { useMemo, useEffect } from 'react';
import { Head, router, usePage, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Search } from 'lucide-react';
import MainLayout from '@/Layouts/MainLayout';

export default function Manage({ payments, stats, bankAccount }) {
    const { flash, auth } = usePage().props;
    const rows = payments?.data || payments || [];

    const userRole = (auth?.user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'superadmin'].includes(userRole);

    const [filters, setFilters] = React.useState({
        search: new URLSearchParams(window.location.search).get('search') || '',
        status: new URLSearchParams(window.location.search).get('status') || '',
        payment_type: new URLSearchParams(window.location.search).get('payment_type') || '',
        sort_by: new URLSearchParams(window.location.search).get('sort_by') || 'created_at',
        sort_order: new URLSearchParams(window.location.search).get('sort_order') || 'desc',
    });

    const hasMount = React.useRef(false);

    useEffect(() => {
        if (!hasMount.current) {
            hasMount.current = true;
            return;
        }

        const timer = setTimeout(() => {
            router.get(window.location.pathname, filters, {
                preserveState: true,
                replace: true,
                preserveScroll: true
            });
        }, 300);

        return () => clearTimeout(timer);
    }, [filters]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const FinanceNav = () => (
        <div className="flex flex-wrap gap-2 mb-8 p-1.5 bg-gray-100/50 rounded-2xl border border-gray-200">
            {isAdmin && (
                <Link
                    href={route('payments.rules')}
                    className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('payments.rules') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
                >
                    <i className={`fas fa-sliders-h transition-transform duration-500 ${route().current('payments.rules') ? 'rotate-180' : ''}`}></i>
                    <span>Administrasi</span>
                </Link>
            )}

            <Link
                href={route('payments.manage')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('payments.manage') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className={`fas fa-wallet transition-bounce ${route().current('payments.manage') ? 'animate-bounce' : ''}`}></i>
                <span>Kegiatan</span>
            </Link>

            {isAdmin && (
                <>
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
                </>
            )}

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
            <Head title="Keuangan" />
            <div className="min-h-screen bg-white py-6 px-4">
                <div className="max-w-full mx-auto">
                    <FinanceNav />
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-indigo-600 rounded-xl shadow-lg p-5 text-white transform transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-lg">
                                    <i className="fas fa-calendar-alt text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase opacity-80 mb-1">Total Kegiatan</div>
                                    <div className="text-2xl font-bold">{stats?.total_activities || 0}</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-600 rounded-xl shadow-lg p-5 text-white transform transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-lg">
                                    <i className="fas fa-money-bill-wave text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase opacity-80 mb-1">Total Pendapatan</div>
                                    <div className="text-2xl font-bold">
                                        Rp {Number(stats?.income_amount || 0).toLocaleString('id-ID')}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-teal-600 rounded-xl shadow-lg p-5 text-white transform transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-white/20 rounded-lg">
                                    <i className="fas fa-coins text-xl"></i>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase opacity-80 mb-1">Saldo Tersedia</div>
                                    <div className="text-2xl font-bold leading-tight">
                                        Rp {Number(stats?.balance_amount || 0).toLocaleString('id-ID')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {bankAccount && (
                        <div className="mb-6 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800">
                            Rekening tersimpan: {bankAccount.bank_name || '-'} â€¢ {bankAccount.account_name || '-'} â€¢ {bankAccount.account_number || '-'}
                        </div>
                    )}

                    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cari</label>
                                <input
                                    type="text"
                                    name="search"
                                    value={filters.search}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                    placeholder="Nama kegiatan atau user..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                                <select
                                    name="status"
                                    value={filters.status}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="">Semua</option>
                                    <option value="pending">Pending</option>
                                    <option value="approved">Disetujui</option>
                                    <option value="rejected">Ditolak</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
                                <select
                                    name="payment_type"
                                    value={filters.payment_type}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="">Semua</option>
                                    <option value="midtrans">Otomatis</option>
                                    <option value="manual">Manual</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Urutkan</label>
                                <select
                                    name="sort_by"
                                    value={filters.sort_by}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="created_at">Tanggal</option>
                                    <option value="amount">Harga</option>
                                    <option value="status">Pendapatan</option>
                                </select>
                            </div>
                            <div className="md:col-span-1">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Arah</label>
                                <select
                                    name="sort_order"
                                    value={filters.sort_order}
                                    onChange={handleFilterChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                >
                                    <option value="desc">Terbaru</option>
                                    <option value="asc">Terlama</option>
                                </select>
                            </div>
                        </div>
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
                                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Jml Peserta</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Harga</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Pendapatan</th>
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
                                                <td className="px-4 py-2 text-sm text-gray-700 text-center font-semibold text-blue-600">
                                                    {payment.participants_count || '-'} org
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700 text-right">
                                                    Rp {Number(payment.amount || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-4 py-2 text-sm font-bold text-green-700">
                                                    Rp {Number(payment.calculated_income || 0).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500">
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

