import React, { useState } from 'react';
import { Head, Link, usePage, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import Modal from '@/Components/Modal';
import Swal from 'sweetalert2';
import FinanceContainer from '@/Components/Finance/FinanceContainer';

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

    const statsContent = (
        <div className="space-y-6">
            {!isAdmin && (
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Neraca Keuangan</h1>
                    <p className="text-gray-600">Ringkasan pendapatan dari kegiatan yang Anda buat</p>
                </div>
            )}

            {/* View Type Toggle */}
            <div className="flex justify-center">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
    );

    return (
        <FinanceContainer title="Neraca Keuangan" stats={statsContent} withNav={isAdmin}>
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

                    <a
                        href={route('payments.ledger.pdf', { view_type: viewType })}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 hover:text-secondary transition-colors shadow-sm flex items-center gap-2"
                    >
                        <i className="fas fa-file-pdf text-red-600"></i>
                        <span className="hidden sm:inline">Download Laporan (PDF)</span>
                    </a>
                </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">Tanggal & Waktu</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-secondary uppercase tracking-wider">Keterangan</th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-green-600 uppercase tracking-wider">Masuk (Debit)</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-red-600 uppercase tracking-wider">Keluar (Kredit)</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Saldo</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedEntries.length > 0 ? (
                            paginatedEntries.map((entry) => (
                                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(entry.date).toLocaleDateString('id-ID', {
                                            day: 'numeric',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{entry.title}</div>
                                        {entry.description && (
                                            <div className="text-xs text-gray-500 mt-0.5">{entry.description}</div>
                                        )}
                                        {entry.is_automatic && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                                                System
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                                            entry.status === 'approved' || entry.status === 'paid' || entry.status === 'active'
                                                ? 'bg-green-100 text-green-800'
                                                : entry.status === 'pending'
                                                    ? 'bg-yellow-100 text-yellow-800'
                                                    : 'bg-red-100 text-red-800'
                                        }`}>
                                            {entry.status ? entry.status.toUpperCase() : '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        {entry.category === 'income' ? (
                                            <span className="text-sm font-bold text-green-600">
                                                +Rp {Number(entry.amount || 0).toLocaleString('id-ID')}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        {entry.category === 'expense' ? (
                                            <span className="text-sm font-bold text-red-600">
                                                -Rp {Number(entry.amount || 0).toLocaleString('id-ID')}
                                            </span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap text-sm font-bold text-gray-800">
                                        Rp {Number(entry.runningBalance || 0).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                                    <div className="flex flex-col items-center justify-center">
                                        <i className="fas fa-file-invoice-dollar text-4xl text-gray-300 mb-3"></i>
                                        <p>Belum ada data transaksi.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Sebelumnya
                    </button>
                    <span className="text-sm text-gray-700">
                        Halaman <span className="font-medium">{currentPage}</span> dari <span className="font-medium">{totalPages}</span>
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Selanjutnya
                    </button>
                </div>
            )}

            <Modal show={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)}>
                <div className="p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Pengajuan Penarikan Dana</h2>
                    <p className="text-sm text-gray-500 mb-6">
                        Saldo tersedia untuk ditarik: <span className="font-bold text-gray-900">Rp {Number(specialSummary.balance || 0).toLocaleString('id-ID')}</span>
                    </p>

                    <form onSubmit={handleWithdraw}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nominal Penarikan</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">Rp</span>
                                </div>
                                <input
                                    type="number"
                                    name="amount"
                                    min="10000"
                                    max={specialSummary.balance}
                                    value={data.amount}
                                    onChange={(e) => setData('amount', e.target.value)}
                                    className="focus:ring-secondary focus:border-secondary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                                    placeholder="0"
                                    required
                                />
                            </div>
                            {errors.amount && <div className="text-red-500 text-xs mt-1">{errors.amount}</div>}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                            <h3 className="text-sm font-medium text-gray-900 mb-3">Informasi Rekening Tujuan</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <div>
                                    <label className="block text-xs text-gray-500">Bank</label>
                                    <input
                                        type="text"
                                        value={data.bank_name}
                                        onChange={(e) => setData('bank_name', e.target.value)}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm"
                                        placeholder="Contoh: BCA"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Nomor Rekening</label>
                                    <input
                                        type="text"
                                        value={data.account_number}
                                        onChange={(e) => setData('account_number', e.target.value)}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm"
                                        placeholder="1234567890"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Atas Nama</label>
                                    <input
                                        type="text"
                                        value={data.account_name}
                                        onChange={(e) => setData('account_name', e.target.value)}
                                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-secondary focus:border-secondary sm:text-sm"
                                        placeholder="Nama Pemilik Rekening"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (Opsional)</label>
                            <textarea
                                name="notes"
                                rows="2"
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                className="shadow-sm focus:ring-secondary focus:border-secondary block w-full sm:text-sm border-gray-300 rounded-md"
                                placeholder="Keterangan tambahan..."
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsWithdrawModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50"
                            >
                                {processing ? 'Memproses...' : 'Kirim Pengajuan'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </FinanceContainer>
    );
}
