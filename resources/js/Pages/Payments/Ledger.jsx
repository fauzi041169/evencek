import React, { useState } from 'react';
import { Head, Link, usePage, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import Modal from '@/Components/Modal';
import Swal from 'sweetalert2';

export default function Ledger({ entries = [], summary = {}, specialSummary = {}, bankAccount }) {
    const { auth } = usePage().props;
    const userRole = (auth?.user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'superadmin'].includes(userRole);

    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const openDetailModal = (entry) => {
        setSelectedEntry(entry);
        setIsDetailModalOpen(true);
    };

    const [viewType, setViewType] = useState('general'); // 'general' or 'special'

    // Determine current summary and entries based on viewType
    const currentSummary = viewType === 'special' ? specialSummary : summary;

    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const processedEntries = React.useMemo(() => {
        // 1. Filter
        let filtered = entries.filter(entry => {
            if (viewType === 'special') {
                if (!(entry.is_automatic === true || entry.type === 'withdrawal')) return false;
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return (
                    (entry.title && entry.title.toLowerCase().includes(q)) ||
                    (entry.description && entry.description.toLowerCase().includes(q)) ||
                    (entry.status && entry.status.toLowerCase().includes(q))
                );
            }
            return true;
        });

        // 2. Sort ASC for Running Balance
        // Create a copy to avoid mutating original if needed, though filter returns new array
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

        // 3. Calculate Running Balance
        let balance = 0;
        filtered = filtered.map(entry => {
            const amount = parseFloat(entry.amount || 0);
            let effectiveAmount = 0;

            // Logic: Income adds to balance if approved/paid/active
            // Expense subtracts from balance if paid
            // Note: Since this is a historical ledger, we calculate balance based on valid transactions

            const status = (entry.status || '').toLowerCase();
            if (['approved', 'active', 'paid'].includes(status)) {
                if (entry.category === 'income') {
                    balance += amount;
                    effectiveAmount = amount;
                } else if (entry.category === 'expense') {
                    balance -= amount;
                    effectiveAmount = -amount;
                }
            }

            return { ...entry, runningBalance: balance, effectiveAmount };
        });

        // 4. Sort DESC for display (Newest First)
        return filtered.reverse();
    }, [entries, viewType, searchQuery]);

    const totalPages = Math.ceil(processedEntries.length / itemsPerPage);
    const paginatedEntries = processedEntries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // Reset pagination when filter changes
    React.useEffect(() => {
        setCurrentPage(1);
    }, [viewType, searchQuery]);

    const exportToCSV = () => {
        const headers = ["Tanggal", "Keterangan", "Masuk", "Keluar", "Saldo", "Status"];
        const csvContent = [
            headers.join(","),
            ...processedEntries.map(e => [
                `"${new Date(e.date).toLocaleDateString('id-ID')}"`,
                `"${e.title} - ${e.description.replace(/"/g, '""')}"`,
                e.category === 'income' ? e.amount : 0,
                e.category === 'expense' ? e.amount : 0,
                e.runningBalance,
                e.status
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ledger_export_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '',
        notes: '',
        bank_name: bankAccount?.bank_name || '',
        account_name: bankAccount?.account_name || '',
        account_number: bankAccount?.account_number || '',
    });

    const handleWithdraw = (e) => {
        e.preventDefault();
        post(route('payments.withdraw.request'), {
            onSuccess: () => {
                setIsWithdrawModalOpen(false);
                reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Permintaan penarikan dana telah dikirim!',
                    timer: 2000,
                    showConfirmButton: false
                });
            },
        });
    };

    // Navigation tabs for admin/superadmin to navigate between finance pages
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

    // Simple header for pure creators
    const PageHeader = () => (
        <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">Neraca Keuangan</h1>
            <p className="text-gray-600">Ringkasan pendapatan dari kegiatan yang Anda buat</p>
        </div>
    );

    return (
        <MainLayout title="Keuangan">
            <Head title="Neraca Keuangan" />
            <div className="min-h-screen bg-white py-8 px-4">
                <div className="max-w-full mx-auto">
                    {/* Show navigation tabs for admin/superadmin, simple header for creators */}
                    {isAdmin ? <FinanceNav /> : <PageHeader />}

                    {/* View Type Toggle */}
                    <div className="flex justify-center mb-8">
                        <div className="bg-gray-100 p-1 rounded-xl flex">
                            <button
                                onClick={() => setViewType('general')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${viewType === 'general'
                                    ? 'bg-white text-secondary shadow-md'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Neraca Umum
                            </button>
                            <button
                                onClick={() => setViewType('special')}
                                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${viewType === 'special'
                                    ? 'bg-white text-secondary shadow-md'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                Neraca Khusus
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-emerald-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-white/20 rounded-xl text-2xl">
                                    <i className="fas fa-arrow-trend-up"></i>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase opacity-80 mb-1">
                                        {viewType === 'special' ? 'Pendapatan (System)' : 'Total Pendapatan'}
                                    </div>
                                    <div className="text-2xl font-bold">Rp {Number(currentSummary.income || 0).toLocaleString('id-ID')}</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-rose-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-white/20 rounded-xl text-2xl">
                                    <i className="fas fa-arrow-trend-down"></i>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase opacity-80 mb-1">Total Pengeluaran</div>
                                    <div className="text-2xl font-bold">Rp {Number(currentSummary.expense || 0).toLocaleString('id-ID')}</div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-indigo-600 rounded-xl shadow-lg p-6 text-white transform transition-all hover:scale-[1.02]">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-white/20 rounded-xl text-2xl">
                                    <i className="fas fa-scale-balanced"></i>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold uppercase opacity-80 mb-1">
                                        {viewType === 'special' ? 'Saldo Dapat Ditarik' : 'Saldo Akhir'}
                                    </div>
                                    <div className="text-2xl font-bold mb-1">Rp {Number(currentSummary.balance || 0).toLocaleString('id-ID')}</div>
                                    {!isAdmin && (
                                        <button
                                            onClick={() => setIsWithdrawModalOpen(true)}
                                            className="mt-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 border border-white/20"
                                        >
                                            <i className="fas fa-money-bill-transfer"></i>
                                            <span>Tarik Dana</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Professional Ledger Table */}
                <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
                    {/* Table Header & Tools */}
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary/10 text-secondary rounded-lg">
                                <i className="fas fa-list-ul"></i>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">Riwayat Transaksi</h3>
                                <p className="text-xs text-gray-500">
                                    {viewType === 'special' ? 'Menampilkan transaksi sistem & penarikan' : 'Menampilkan semua aktivitas keuangan'}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="relative">
                                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input
                                    type="text"
                                    placeholder="Cari transaksi..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-secondary focus:ring-secondary text-sm w-full md:w-64"
                                />
                            </div>

                            <button
                                onClick={exportToCSV}
                                className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:text-secondary transition-colors shadow-sm flex items-center gap-2"
                            >
                                <i className="fas fa-file-export"></i>
                                <span className="hidden sm:inline">Export CSV</span>
                            </button>
                        </div>
                    </div>

                    {/* Table Content */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">Tanggal & Waktu</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">Keterangan</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-green-600 uppercase tracking-wider">Masuk (Debit)</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-red-600 uppercase tracking-wider">Keluar (Kredit)</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Saldo</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {paginatedEntries.length > 0 ? (
                                    paginatedEntries.map((entry, index) => (
                                        <tr
                                            key={entry.id || index}
                                            className="hover:bg-gray-50/80 transition-colors group"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-gray-800">
                                                        {new Date(entry.date).toLocaleDateString('id-ID', {
                                                            day: 'numeric', month: 'short', year: 'numeric'
                                                        })}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(entry.date).toLocaleTimeString('id-ID', {
                                                            hour: '2-digit', minute: '2-digit'
                                                        })} WIB
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col max-w-xs">
                                                    <span className="text-sm font-bold text-gray-800 line-clamp-1" title={entry.title}>
                                                        {entry.title}
                                                    </span>
                                                    <span className="text-xs text-gray-500 line-clamp-2" title={entry.description}>
                                                        {entry.description}
                                                    </span>
                                                    {entry.is_automatic && (
                                                        <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                                                            <i className="fas fa-bolt"></i> System Auto
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                {['approved', 'active', 'paid'].includes((entry.status || '').toLowerCase()) && entry.category === 'income' ? (
                                                    <span className="text-sm font-bold text-emerald-600">
                                                        + Rp {Number(entry.amount || 0).toLocaleString('id-ID')}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                {['approved', 'active', 'paid'].includes((entry.status || '').toLowerCase()) && entry.category === 'expense' ? (
                                                    <span className="text-sm font-bold text-rose-600">
                                                        - Rp {Number(entry.amount || 0).toLocaleString('id-ID')}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap bg-gray-50/30">
                                                <span className={`text-sm font-bold ${(entry.runningBalance || 0) < 0 ? 'text-red-700' : 'text-gray-900'
                                                    }`}>
                                                    Rp {Number(entry.runningBalance || 0).toLocaleString('id-ID')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${['approved', 'active', 'paid'].includes((entry.status || '').toLowerCase())
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : ['pending', 'processing'].includes((entry.status || '').toLowerCase())
                                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                                    }`}>
                                                    {entry.status === 'paid' ? 'Dibayar' :
                                                        entry.status === 'approved' ? 'Lunas' :
                                                            entry.status === 'pending' ? 'Pending' : entry.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                {entry.link && (
                                                    <Link
                                                        href={entry.link}
                                                        className="text-gray-400 hover:text-secondary transition-colors"
                                                        title="Lihat Detail"
                                                    >
                                                        <i className="fas fa-external-link-alt"></i>
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400 text-2xl">
                                                    <i className="fas fa-receipt"></i>
                                                </div>
                                                <p className="text-gray-500 font-medium">Belum ada transaksi ditemukan</p>
                                                <p className="text-sm text-gray-400">Transaksi Anda akan muncul di sini</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Menampilkan <span className="font-bold">{paginatedEntries.length}</span> dari <span className="font-bold">{processedEntries.length}</span> transaksi
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <i className="fas fa-chevron-left"></i>
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum = i + 1;
                                if (totalPages > 5) {
                                    if (currentPage > 3) {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                    // Handle edge case where pageNum < 1
                                    if (pageNum < 1) pageNum = i + 1;
                                }

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${currentPage === pageNum
                                                ? 'bg-secondary text-white shadow-md'
                                                : 'text-gray-600 hover:bg-white border border-transparent hover:border-gray-200'
                                            }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || totalPages === 0}
                                className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Withdraw */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsWithdrawModalOpen(false)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleWithdraw}>
                                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                                            <i className="fas fa-money-check-dollar text-blue-600"></i>
                                        </div>
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                                Ajukan Penarikan Dana
                                            </h3>
                                            <div className="mt-2 text-sm text-gray-500">
                                                Isi formulir untuk menarik saldo Anda. Pastikan nama pemilik rekening sesuai dengan profil.
                                            </div>

                                            <div className="mt-4 space-y-3">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Jumlah Penarikan (Rp)</label>
                                                    <input
                                                        type="number"
                                                        value={data.amount}
                                                        onChange={e => setData('amount', e.target.value)}
                                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm"
                                                        placeholder="0"
                                                        min="1000"
                                                        required
                                                    />
                                                    {errors.amount && <div className="text-red-500 text-xs mt-1">{errors.amount}</div>}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Bank Tujuan</label>
                                                    <input
                                                        type="text"
                                                        value={data.bank_name}
                                                        onChange={e => setData('bank_name', e.target.value)}
                                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm"
                                                        placeholder="Nama Bank (cth: BCA)"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Nama Pemilik</label>
                                                        <input
                                                            type="text"
                                                            value={data.account_name}
                                                            onChange={e => setData('account_name', e.target.value)}
                                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm"
                                                            placeholder="Atas Nama"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Nomor Rekening</label>
                                                        <input
                                                            type="text"
                                                            value={data.account_number}
                                                            onChange={e => setData('account_number', e.target.value)}
                                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm"
                                                            placeholder="No. Rek"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Catatan Tambahan (Opsional)</label>
                                                    <textarea
                                                        value={data.notes}
                                                        onChange={e => setData('notes', e.target.value)}
                                                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm"
                                                        rows="2"
                                                    ></textarea>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-secondary text-base font-medium text-white hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                    >
                                        {processing ? 'Mengirim...' : 'Kirim Pengajuan'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsWithdrawModalOpen(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal Detail Transaksi */}
            <Modal show={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)}>
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold text-gray-900">Detail Transaksi</h2>
                        <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    {selectedEntry && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Tanggal</label>
                                    <div className="mt-1 text-sm font-semibold text-gray-900">{selectedEntry.date}</div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Status</label>
                                    <div className="mt-1">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide border ${['approved', 'active', 'paid'].includes((selectedEntry.status || '').toLowerCase())
                                                ? 'bg-green-50 text-green-700 border-green-200'
                                                : ['pending', 'processing'].includes((selectedEntry.status || '').toLowerCase())
                                                    ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                    : 'bg-red-50 text-red-700 border-red-200'
                                            }`}>
                                            {selectedEntry.status || 'Unknown'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase">Judul</label>
                                <div className="mt-1 text-sm text-gray-900">{selectedEntry.title}</div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase">Deskripsi</label>
                                <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    {selectedEntry.description}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Jenis</label>
                                    <div className="mt-1 text-sm font-bold text-gray-900 capitalize">
                                        {selectedEntry.type === 'payment' ? 'Kegiatan' :
                                            selectedEntry.type === 'subscription' ? 'Langganan' :
                                                selectedEntry.type === 'withdrawal' ? 'Penarikan' : selectedEntry.type}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Metode</label>
                                    <div className="mt-1 text-sm font-bold text-gray-900">
                                        {selectedEntry.is_automatic ? 'Payment Gateway' : 'Manual'}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Nominal</label>
                                    <div className={`mt-1 text-sm font-bold ${selectedEntry.category === 'income' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        Rp {Number(selectedEntry.amount || 0).toLocaleString('id-ID')}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 uppercase">Total</label>
                                    <div className="mt-1 text-sm font-black text-gray-900">
                                        Rp {Number(selectedEntry.total || 0).toLocaleString('id-ID')}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
                                    onClick={() => setIsDetailModalOpen(false)}
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </MainLayout>
    );
}
