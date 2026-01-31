import React, { useState } from 'react';
import { Head, usePage, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import Swal from 'sweetalert2';

export default function CreatorFinance({ entries = [], summary = {}, bankAccount }) {
    const { auth } = usePage().props;

    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '',
        notes: '',
        bank_name: bankAccount?.bank_name || '',
        account_name: bankAccount?.account_name || '',
        account_number: bankAccount?.account_number || '',
    });

    const handleWithdraw = (e) => {
        e.preventDefault();

        // Validasi Nama Rekening harus sama dengan Nama Akun
        if (auth.user && data.account_name.toLowerCase() !== auth.user.name.toLowerCase()) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Nama rekening penarikan harus sama dengan nama akun Anda (' + auth.user.name + ')',
            });
            return;
        }

        // Validasi Saldo
        if (Number(data.amount) > Number(summary.balance || 0)) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Saldo tidak mencukupi untuk melakukan penarikan ini.',
            });
            return;
        }

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

    return (
        <MainLayout title="Keuangan Creator">
            <Head title="Keuangan Creator" />
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="bg-gradient-to-r from-secondary to-purple-600 bg-clip-text text-transparent">
                                    Keuangan Creator
                                </span>
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Kelola pendapatan dan pantau arus kas kegiatan Anda
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsWithdrawModalOpen(true)}
                                className="px-5 py-2.5 bg-secondary text-white font-semibold rounded-xl hover:bg-secondary/90 transition-all flex items-center gap-2 shadow-lg shadow-secondary/30"
                            >
                                <i className="fas fa-money-bill-transfer"></i>
                                <span>Tarik Dana</span>
                            </button>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
                        {/* Total Pendapatan */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
                                    <i className="fas fa-arrow-trend-up text-xl text-emerald-600"></i>
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 bg-gray-50 text-gray-500 rounded-lg">
                                    Semua Waktu
                                </span>
                            </div>
                            <div className="text-gray-500 text-sm font-medium mb-1">Total Pendapatan</div>
                            <div className="text-xl font-bold text-gray-900">
                                Rp {Number(summary.income || 0).toLocaleString('id-ID')}
                            </div>
                        </div>

                        {/* Pendapatan Manual */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors">
                                    <i className="fas fa-hand-holding-dollar text-xl text-blue-600"></i>
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
                                    Manual
                                </span>
                            </div>
                            <div className="text-gray-500 text-sm font-medium mb-1">Pendapatan Manual</div>
                            <div className="text-xl font-bold text-gray-900">
                                Rp {Number(summary.income_manual || 0).toLocaleString('id-ID')}
                            </div>
                        </div>

                        {/* Pendapatan Gateway */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors">
                                    <i className="fas fa-credit-card text-xl text-indigo-600"></i>
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg">
                                    Gateway
                                </span>
                            </div>
                            <div className="text-gray-500 text-sm font-medium mb-1">Pendapatan Gateway</div>
                            <div className="text-xl font-bold text-gray-900">
                                Rp {Number(summary.income_gateway || 0).toLocaleString('id-ID')}
                            </div>
                        </div>

                        {/* Total Penarikan */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-rose-50 rounded-xl group-hover:bg-rose-100 transition-colors">
                                    <i className="fas fa-arrow-trend-down text-xl text-rose-600"></i>
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 bg-gray-50 text-gray-500 rounded-lg">
                                    Terproses
                                </span>
                            </div>
                            <div className="text-gray-500 text-sm font-medium mb-1">Total Penarikan</div>
                            <div className="text-xl font-bold text-gray-900">
                                Rp {Number(summary.expense || 0).toLocaleString('id-ID')}
                            </div>
                        </div>

                        {/* Saldo Tersedia */}
                        <div className="bg-white rounded-2xl p-6 shadow-lg shadow-purple-100 border border-purple-100 hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-4 -mt-4 opacity-50"></div>
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors relative z-10">
                                    <i className="fas fa-wallet text-xl text-purple-600"></i>
                                </div>
                                <span className="text-xs font-semibold px-2 py-1 bg-purple-50 text-purple-700 rounded-lg relative z-10">
                                    Bisa Ditarik
                                </span>
                            </div>
                            <div className="text-gray-500 text-sm font-medium mb-1 relative z-10">Saldo Tersedia</div>
                            <div className="text-xl font-bold text-purple-700 relative z-10">
                                Rp {Number(summary.balance || 0).toLocaleString('id-ID')}
                            </div>
                        </div>
                    </div>

                    {/* Transaction Table */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-secondary to-purple-600 px-6 py-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <i className="fas fa-receipt"></i>
                                Riwayat Transaksi
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Tanggal</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Deskripsi</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">Kategori</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Nominal</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Total Peserta</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">Total Pendapatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {entries.length > 0 ? (
                                        entries.map((entry, index) => (
                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {entry.date || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-sm">
                                                    <div className="font-semibold text-gray-900">{entry.title}</div>
                                                    <div className="text-gray-500 text-xs">{entry.description}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${entry.category === 'income'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                        <i className={`fas ${entry.category === 'income' ? 'fa-arrow-up' : 'fa-arrow-down'} mr-1`}></i>
                                                        {entry.category === 'income' ? 'Pendapatan' : 'Penarikan'}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${entry.category === 'income' ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                    {entry.category === 'income' ? '+' : '-'} Rp {Number(entry.amount || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-700">
                                                    {entry.participant_count ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            {entry.participant_count} Orang
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    {entry.category === 'income' && entry.total_income ? (
                                                        <div>
                                                            <div className="text-sm font-bold text-blue-600">
                                                                Rp {Number(entry.total_income || 0).toLocaleString('id-ID')}
                                                            </div>

                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <i className="fas fa-inbox text-5xl text-gray-300"></i>
                                                    <p className="text-gray-500 font-medium">Belum ada transaksi</p>
                                                    <p className="text-gray-400 text-sm">Transaksi Anda akan muncul di sini</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Withdraw */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm" onClick={() => setIsWithdrawModalOpen(false)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <form onSubmit={handleWithdraw}>
                                <div className="bg-gradient-to-r from-secondary to-purple-600 px-6 py-5">
                                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                        <i className="fas fa-money-check-dollar"></i>
                                        Ajukan Penarikan Dana
                                    </h3>
                                    <p className="text-white/80 text-sm mt-2">
                                        Isi formulir untuk menarik saldo Anda
                                    </p>
                                </div>

                                <div className="bg-white px-6 py-6">
                                    {/* Info Saldo */}
                                    <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider">Saldo Bisa Ditarik</p>
                                            <p className="text-2xl font-black text-purple-700 mt-1">
                                                Rp {Number(summary.balance || 0).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                        <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                                            <i className="fas fa-wallet"></i>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Jumlah Penarikan (Rp)</label>
                                            <input
                                                type="number"
                                                value={data.amount}
                                                onChange={e => setData('amount', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
                                                placeholder="Masukkan jumlah"
                                                min="1000"
                                                required
                                            />
                                            {errors.amount && <div className="text-red-500 text-xs mt-1 font-medium">{errors.amount}</div>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Bank Tujuan</label>
                                            <input
                                                type="text"
                                                value={data.bank_name}
                                                onChange={e => setData('bank_name', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
                                                placeholder="Nama Bank (cth: BCA, Mandiri)"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Nama Pemilik</label>
                                                <input
                                                    type="text"
                                                    value={data.account_name}
                                                    onChange={e => setData('account_name', e.target.value)}
                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
                                                    placeholder="Atas Nama"
                                                />
                                                <p className="text-xs text-gray-500 mt-1">
                                                    *Nama rekening harus sama dengan nama akun Anda: <span className="font-bold text-gray-800">{auth.user?.name}</span>
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Nomor Rekening</label>
                                                <input
                                                    type="text"
                                                    value={data.account_number}
                                                    onChange={e => setData('account_number', e.target.value)}
                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
                                                    placeholder="No. Rek"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Catatan (Opsional)</label>
                                            <textarea
                                                value={data.notes}
                                                onChange={e => setData('notes', e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
                                                rows="3"
                                                placeholder="Tambahkan catatan jika diperlukan"
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse gap-3">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl border border-transparent shadow-lg px-6 py-3 bg-gradient-to-r from-secondary to-purple-600 text-base font-bold text-white hover:from-secondary/90 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50 transition-all"
                                    >
                                        {processing ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin"></i>
                                                Mengirim...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-paper-plane"></i>
                                                Kirim Pengajuan
                                            </>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsWithdrawModalOpen(false)}
                                        className="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-xl border-2 border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all"
                                    >
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Detail Activity */}
            {isDetailModalOpen && selectedActivity && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
                            <div className="bg-gradient-to-r from-secondary to-purple-600 px-6 py-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                            <i className="fas fa-chart-line"></i>
                                            Detail Pendapatan Kegiatan
                                        </h3>
                                        <p className="text-white/80 text-sm mt-2">
                                            Informasi lengkap tentang pendapatan dari kegiatan ini
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsDetailModalOpen(false)}
                                        className="text-white/80 hover:text-white transition-colors"
                                    >
                                        <i className="fas fa-times text-2xl"></i>
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
                                {/* Activity Info */}
                                <div className="mb-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <i className="fas fa-calendar-check text-secondary"></i>
                                        Informasi Kegiatan
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Nama Kegiatan</p>
                                            <p className="font-semibold text-gray-900">{selectedActivity.activity_name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Kode Kegiatan</p>
                                            <p className="font-semibold text-gray-900">{selectedActivity.activity_code || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Total Pendapatan</p>
                                            <p className="font-bold text-emerald-600 text-lg">
                                                Rp {Number(selectedActivity.total_income || 0).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-1">Jumlah Peserta Bayar</p>
                                            <p className="font-bold text-secondary text-lg">
                                                {selectedActivity.participant_count || 0} Peserta
                                            </p>
                                        </div>
                                    </div>
                                    {selectedActivity.activity_code && (
                                        <div className="mt-4">
                                            <Link
                                                href={`/activity/${selectedActivity.activity_code}`}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-secondary text-sm font-bold rounded-lg hover:bg-gray-50 transition-all border-2 border-secondary"
                                            >
                                                <i className="fas fa-external-link-alt"></i>
                                                <span>Buka Halaman Kegiatan</span>
                                            </Link>
                                        </div>
                                    )}
                                </div>

                                {/* Participant List */}
                                {selectedActivity.participants && selectedActivity.participants.length > 0 && (
                                    <div className="mb-4">
                                        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                            <i className="fas fa-users text-secondary"></i>
                                            Daftar Peserta ({selectedActivity.participants.length})
                                        </h4>
                                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">No</th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Nama</th>
                                                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Email</th>
                                                        <th className="px-4 py-3 text-right text-xs font-bold text-gray-700 uppercase">Nominal</th>
                                                        <th className="px-4 py-3 text-center text-xs font-bold text-gray-700 uppercase">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {selectedActivity.participants.map((participant, index) => (
                                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-4 py-3 text-sm text-gray-600">{index + 1}</td>
                                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">{participant.name || '-'}</td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">{participant.email || '-'}</td>
                                                            <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">
                                                                Rp {Number(participant.amount || 0).toLocaleString('id-ID')}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                                    {participant.status || 'Lunas'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-gray-50 px-6 py-4 flex justify-end">
                                <button
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="inline-flex justify-center rounded-xl border-2 border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
