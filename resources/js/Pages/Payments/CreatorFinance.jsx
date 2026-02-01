import React, { useState } from 'react';
import { Head, usePage, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import Swal from 'sweetalert2';
import Modal from '@/Components/Modal';

export default function CreatorFinance({ entries = [], summary = {}, bankAccount }) {
    const { auth } = usePage().props;

    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        amount: '',
        notes: '',
        bank_name: bankAccount?.bank_name || '',
        account_name: bankAccount?.account_name || '',
        account_number: bankAccount?.account_number || '',
    });

    const bankOptions = [
        'BCA', 'Mandiri', 'BNI', 'BRI', 'BSI', 'CIMB Niaga', 
        'Bank Danamon', 'Bank Permata', 'Bank Mega', 'BTN', 
        'BTPN', 'Jenius', 'Jago', 'SeaBank', 'Lainnya'
    ];

    const [selectedBank, setSelectedBank] = useState('');

    // Sync selectedBank when modal opens or data changes
    React.useEffect(() => {
        if (isWithdrawModalOpen) {
            const currentBank = data.bank_name;
            if (currentBank && bankOptions.includes(currentBank)) {
                setSelectedBank(currentBank);
            } else if (currentBank) {
                setSelectedBank('Lainnya');
            } else {
                setSelectedBank('');
            }
        }
    }, [isWithdrawModalOpen, data.bank_name]);

    const handleWithdraw = (e) => {
        e.preventDefault();

        // Validasi Saldo
        if (Number(data.amount) > Number(summary.balance || 0)) {
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Saldo tidak mencukupi untuk melakukan penarikan ini.',
                didOpen: () => {
                    const container = Swal.getContainer();
                    if (container) container.style.zIndex = '999999';
                }
            });
            return;
        }

        const submitWithdraw = () => {
            post(route('payments.withdraw.request'), {
                preserveScroll: true,
                onSuccess: () => {
                    setIsWithdrawModalOpen(false);
                    reset();
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Permintaan penarikan dana telah dikirim!',
                        timer: 2000,
                        showConfirmButton: false,
                        didOpen: () => {
                            const container = Swal.getContainer();
                            if (container) container.style.zIndex = '999999';
                        }
                    });
                },
                onError: (errors) => {
                    console.error('Withdrawal errors:', errors);
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: 'Terjadi kesalahan saat mengirim permintaan. Silakan periksa input Anda.',
                        didOpen: () => {
                            const container = Swal.getContainer();
                            if (container) container.style.zIndex = '999999';
                        }
                    });
                }
            });
        };

        // Validasi Nama Rekening (Soft Warning)
        // Jika nama berbeda, minta konfirmasi tapi tetap izinkan
        if (auth.user && data.account_name.trim().toLowerCase() !== auth.user.name.trim().toLowerCase()) {
            Swal.fire({
                icon: 'warning',
                title: 'Nama Berbeda',
                text: `Nama rekening penarikan (${data.account_name}) berbeda dengan nama akun Anda (${auth.user.name}). Pastikan nama rekening benar agar proses transfer lancar. Lanjutkan?`,
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Ya, Lanjutkan',
                cancelButtonText: 'Periksa Lagi',
                didOpen: () => {
                    const container = Swal.getContainer();
                    if (container) container.style.zIndex = '999999';
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    submitWithdraw();
                }
            });
            return;
        }

        submitWithdraw();
    };

    const getWithdrawalDetails = (notes) => {
        let result = { text: '-', proof: null };
        if (!notes) return result;

        try {
            if (typeof notes === 'string' && (notes.trim().startsWith('{') || notes.trim().startsWith('['))) {
                const parsed = JSON.parse(notes);
                if (parsed.proof_path) result.proof = parsed.proof_path;
                
                if (parsed.bank_name) {
                    result.text = `${parsed.bank_name} - ${parsed.account_number} a.n ${parsed.account_name}`;
                    if (parsed.notes) result.text += ` | ${parsed.notes}`;
                } else if (parsed.notes) {
                    result.text = parsed.notes;
                } else {
                    const copy = { ...parsed };
                    delete copy.proof_path;
                    if (Object.keys(copy).length > 0) result.text = Object.values(copy).join(', ');
                }
            } else {
                result.text = notes;
            }
        } catch (e) {
            result.text = notes;
        }
        
        if (result.text && typeof result.text === 'string') {
            result.text = result.text.replace(/<[^>]*>?/gm, '');
        }
        return result;
    };

    const openDetailModal = (transaction) => {
        setSelectedTransaction(transaction);
        setIsDetailModalOpen(true);
    };

    const renderTransactionDescription = (description) => {
        if (!description) return '-';
        
        const tryParse = (str) => {
            try {
                if (typeof str === 'string' && (str.trim().startsWith('{') || str.trim().startsWith('['))) {
                    return JSON.parse(str);
                }
            } catch (e) {}
            return null;
        };

        // Split description by pipe '|' to handle mixed content (e.g. "Text | JSON")
        const parts = description.toString().split('|').map(p => p.trim());

        return (
            <div className="flex flex-col gap-1 text-xs text-gray-600 mt-1">
                {parts.map((part, idx) => {
                    const parsed = tryParse(part);
                    
                    if (parsed) {
                        // Handle JSON content
                        if (parsed.bank_name || parsed.account_name || parsed.account_number) {
                            return (
                                <div key={idx} className="flex flex-col gap-0.5 p-2 bg-gray-50 rounded border border-gray-100">
                                    {parsed.bank_name && (
                                        <div className="flex items-center gap-1.5">
                                            <i className="fas fa-university w-3.5 text-gray-400"></i>
                                            <span className="font-semibold text-gray-700">{parsed.bank_name}</span>
                                        </div>
                                    )}
                                    {parsed.account_number && (
                                        <div className="flex items-center gap-1.5">
                                            <i className="fas fa-hashtag w-3.5 text-gray-400"></i>
                                            <span className="font-mono text-gray-600">{parsed.account_number}</span>
                                        </div>
                                    )}
                                    {parsed.account_name && (
                                        <div className="flex items-center gap-1.5">
                                            <i className="fas fa-user w-3.5 text-gray-400"></i>
                                            <span className="text-gray-600">{parsed.account_name}</span>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        // Ignore internal JSON (like proof_path)
                        return null;
                    } else {
                        // Handle Text content
                        const cleanText = part.replace(/<[^>]*>?/gm, '');
                        if (!cleanText) return null;

                        return (
                            <div key={idx} className="flex items-start gap-1.5">
                                <span className="text-gray-500">{cleanText}</span>
                            </div>
                        );
                    }
                })}
            </div>
        );
    };

    return (
        <MainLayout title="Keuangan Creator">
            <Head title="Keuangan Creator" />
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-2 sm:py-8 px-4">
                <div className="max-w-7xl mx-auto">
                    {/* Header Banner */}
                    <div className="mb-8 bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden ring-1 ring-white/10">
                        {/* Decorative elements */}
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-purple-500/30 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-indigo-500/30 rounded-full blur-3xl"></div>
                        
                        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                            <div>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md shadow-inner border border-white/20">
                                        <i className="fas fa-wallet text-2xl text-purple-200"></i>
                                    </div>
                                    <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md">
                                        Keuangan Creator
                                    </h1>
                                </div>
                                <p className="text-indigo-100 text-lg max-w-xl font-medium leading-relaxed drop-shadow-sm">
                                    Kelola pendapatan dan pantau arus kas kegiatan Anda dengan mudah dan transparan.
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 bg-black/20 p-6 rounded-2xl backdrop-blur-md border border-white/10 shadow-lg">
                                <div>
                                    <p className="text-indigo-200 text-sm font-bold mb-1 uppercase tracking-wider">Saldo Bisa Ditarik</p>
                                    <div className="text-3xl sm:text-4xl font-black text-white drop-shadow-md">
                                        Rp {Number(summary.balance || 0).toLocaleString('id-ID')}
                                    </div>
                                </div>
                                <div className="h-12 w-px bg-white/20 hidden sm:block"></div>
                                <button
                                    onClick={() => setIsWithdrawModalOpen(true)}
                                    className="px-8 py-4 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 group"
                                >
                                    <div className="p-1 bg-indigo-100 rounded-full group-hover:bg-indigo-200 transition-colors">
                                        <i className="fas fa-money-bill-transfer text-lg text-indigo-700"></i>
                                    </div>
                                    <span>Tarik Dana</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                    </div>

                    {/* Transaction Table */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="bg-gradient-to-r from-indigo-800 to-purple-800 px-6 py-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <i className="fas fa-receipt"></i>
                                Riwayat Transaksi
                            </h2>
                            <a 
                                href={route('payments.creator.finance.pdf')} 
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2 backdrop-blur-sm"
                            >
                                <i className="fas fa-file-pdf"></i>
                                <span className="hidden sm:inline">Download Laporan</span>
                            </a>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">Tanggal</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">Transaksi</th>
                                        <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">Detail</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-emerald-700 uppercase tracking-wider border-b border-gray-200">Debit (Masuk)</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-rose-700 uppercase tracking-wider border-b border-gray-200">Kredit (Keluar)</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider border-b border-gray-200">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {entries.length > 0 ? (
                                        entries.map((entry, index) => (
                                            <tr key={index} className="hover:bg-gray-50/80 transition-colors group">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top font-mono">
                                                    {entry.date || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-sm align-top">
                                                    <div className="font-bold text-gray-800 mb-1">{entry.title}</div>
                                                    {renderTransactionDescription(entry.description)}
                                                    {entry.status === 'pending' && entry.category === 'expense' && (
                                                        <span className="inline-flex mt-2 items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                                                            <i className="fas fa-clock mr-1"></i> Menunggu Proses
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    <button 
                                                        onClick={() => openDetailModal(entry)}
                                                        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm group border ${
                                                            entry.category === 'income'
                                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700'
                                                                : (entry.status === 'pending' 
                                                                    ? 'bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100 hover:text-orange-700'
                                                                    : (entry.status === 'paid'
                                                                        ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:text-blue-700'
                                                                        : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700'))
                                                        }`}
                                                    >
                                                        <i className={`fas fa-eye mr-2 ${
                                                            entry.category === 'income'
                                                                ? 'text-emerald-400 group-hover:text-emerald-600'
                                                                : (entry.status === 'pending'
                                                                    ? 'text-orange-400 group-hover:text-orange-600'
                                                                    : (entry.status === 'paid'
                                                                        ? 'text-blue-400 group-hover:text-blue-600'
                                                                        : 'text-rose-400 group-hover:text-rose-600'))
                                                        }`}></i> 
                                                        {entry.category === 'income' ? 'Pendapatan' : 'Penarikan'}
                                                    </button>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-emerald-600">
                                                    {entry.category === 'income' ? (
                                                        `Rp ${Number(entry.amount || 0).toLocaleString('id-ID')}`
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-rose-600">
                                                    {entry.category === 'expense' ? (
                                                        `Rp ${Number(entry.amount || 0).toLocaleString('id-ID')}`
                                                    ) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-800">
                                                    Rp {Number(entry.running_balance || 0).toLocaleString('id-ID')}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-2 sm:py-6 text-center">
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
            <Modal show={isWithdrawModalOpen} onClose={() => setIsWithdrawModalOpen(false)} maxWidth="lg">
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
                                            <select
                                                value={selectedBank}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setSelectedBank(val);
                                                    if (val !== 'Lainnya') {
                                                        setData('bank_name', val);
                                                    } else {
                                                        setData('bank_name', '');
                                                    }
                                                }}
                                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-secondary transition-all mb-2"
                                            >
                                                <option value="">Pilih Bank</option>
                                                {bankOptions.map(bank => (
                                                    <option key={bank} value={bank}>{bank}</option>
                                                ))}
                                            </select>
                                            
                                            {selectedBank === 'Lainnya' && (
                                                <input
                                                    type="text"
                                                    value={data.bank_name}
                                                    onChange={e => setData('bank_name', e.target.value)}
                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-secondary focus:border-secondary transition-all"
                                                    placeholder="Nama Bank Lainnya"
                                                />
                                            )}
                                            {errors.bank_name && <div className="text-red-500 text-xs mt-1 font-medium">{errors.bank_name}</div>}
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
                                                {errors.account_name && <div className="text-red-500 text-xs mt-1 font-medium">{errors.account_name}</div>}
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
                                                {errors.account_number && <div className="text-red-500 text-xs mt-1 font-medium">{errors.account_number}</div>}
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
                                            {errors.notes && <div className="text-red-500 text-xs mt-1 font-medium">{errors.notes}</div>}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3">
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex justify-center items-center gap-2 rounded-lg border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 transition-all"
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
                                        className="inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm transition-all"
                                    >
                                        Batal
                                    </button>
                                </div>
                </form>
            </Modal>

            {/* Modal Detail Transaction */}
            {selectedTransaction && (
            <Modal show={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} maxWidth={selectedTransaction.type === 'payment' ? '4xl' : 'lg'}>
                {selectedTransaction.type === 'payment' ? (
                    <>
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
                                <button onClick={() => setIsDetailModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
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
                                        <p className="font-semibold text-gray-900">{selectedTransaction.activity_name || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Kode Kegiatan</p>
                                        <p className="font-semibold text-gray-900">{selectedTransaction.activity_code || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Total Pendapatan</p>
                                        <p className="font-bold text-emerald-600 text-lg">
                                            Rp {Number(selectedTransaction.total_income || 0).toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Jumlah Peserta Bayar</p>
                                        <p className="font-bold text-secondary text-lg">
                                            {selectedTransaction.participant_count || 0} Peserta
                                        </p>
                                    </div>
                                </div>
                                {selectedTransaction.activity_code && (
                                    <div className="mt-4">
                                        <Link
                                            href={`/activity/${selectedTransaction.activity_code}`}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-secondary text-sm font-bold rounded-lg hover:bg-gray-50 transition-all border-2 border-secondary"
                                        >
                                            <i className="fas fa-external-link-alt"></i>
                                            <span>Buka Halaman Kegiatan</span>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Participant List */}
                            {selectedTransaction.participants && selectedTransaction.participants.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                        <i className="fas fa-users text-secondary"></i>
                                        Daftar Peserta ({selectedTransaction.participants.length})
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
                                                {selectedTransaction.participants.map((participant, index) => (
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
                    </>
                ) : (
                    <>
                        <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                        <i className="fas fa-file-invoice-dollar"></i>
                                        Detail Penarikan Dana
                                    </h3>
                                    <p className="text-white/80 text-sm mt-2">
                                        Informasi lengkap tentang penarikan dana
                                    </p>
                                </div>
                                <button onClick={() => setIsDetailModalOpen(false)} className="text-white/80 hover:text-white transition-colors">
                                    <i className="fas fa-times text-2xl"></i>
                                </button>
                            </div>
                        </div>

                        <div className="bg-white px-6 py-6">
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Tanggal Request</p>
                                    <p className="font-medium text-gray-900">{selectedTransaction.date}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Nominal</p>
                                    <p className="font-bold text-rose-600 text-lg">
                                        - Rp {Number(selectedTransaction.amount).toLocaleString('id-ID')}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Status</p>
                                    <span className={`inline-flex px-2 py-1 mt-1 text-xs font-bold rounded-full ${
                                        ['paid', 'approved', 'completed'].includes(selectedTransaction.status) ? 'bg-green-100 text-green-800' : 
                                        selectedTransaction.status === 'pending' ? 'bg-red-100 text-red-800' : 
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {selectedTransaction.status.toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            {(() => {
                                const details = getWithdrawalDetails(selectedTransaction.notes);
                                return (
                                    <div className="space-y-4 border-t pt-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Info Rekening / Catatan</p>
                                            <div className="bg-yellow-50 border border-yellow-100 p-3 rounded text-sm text-gray-700 break-words">
                                                {details.text}
                                            </div>
                                        </div>
                                        
                                        {details.proof && (
                                            <div>
                                                <p className="text-xs text-gray-500 uppercase font-bold mb-2">Bukti Transfer</p>
                                                <div className="border rounded p-2 bg-gray-50">
                                                    <img 
                                                        src={`/storage/${details.proof}`} 
                                                        alt="Bukti Transfer" 
                                                        className="w-full h-auto rounded max-h-80 object-contain mx-auto"
                                                    />
                                                    <a 
                                                        href={`/storage/${details.proof}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-center block mt-2 text-blue-600 text-sm hover:underline"
                                                    >
                                                        Lihat Ukuran Penuh
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </>
                )}

                <div className="bg-gray-50 px-6 py-4 flex justify-end">
                    <button
                        onClick={() => setIsDetailModalOpen(false)}
                        className="inline-flex justify-center rounded-xl border-2 border-gray-300 shadow-sm px-6 py-3 bg-white text-base font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary transition-all"
                    >
                        Tutup
                    </button>
                </div>
            </Modal>
            )}
        </MainLayout>
    );
}
