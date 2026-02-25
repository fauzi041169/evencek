import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import FinanceContainer from '@/Components/Finance/FinanceContainer';
import Swal from 'sweetalert2';

// Modal Component for Withdrawal Details
const WithdrawalDetailModal = ({ withdrawal, onClose }) => {
    const { data, setData, post, processing, errors, reset } = useForm({
        proof: null,
    });

    if (!withdrawal) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        
        Swal.fire({
            title: 'Konfirmasi Pembayaran',
            text: "Apakah Anda yakin ingin menandai penarikan ini sebagai sudah dibayar?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Tandai Dibayar!'
        }).then((result) => {
            if (result.isConfirmed) {
                post(route('payments.withdraw.paid', withdrawal.id), {
                    onSuccess: () => {
                        Swal.fire(
                            'Berhasil!',
                            'Status penarikan telah diperbarui.',
                            'success'
                        );
                        reset();
                        onClose();
                    },
                    onError: () => {
                        Swal.fire(
                            'Gagal!',
                            'Terjadi kesalahan saat memproses data.',
                            'error'
                        );
                    }
                });
            }
        });
    };

    // Parse bank details from notes if available
    const getDetails = (notes) => {
        let result = { text: '-', proof: null };
        if (!notes) return result;

        try {
            // Check if notes is JSON
            if (typeof notes === 'string' && (notes.trim().startsWith('{') || notes.trim().startsWith('['))) {
                const parsed = JSON.parse(notes);
                
                // Extract proof path
                if (parsed.proof_path) {
                    result.proof = parsed.proof_path;
                }

                // Extract text content
                if (parsed.bank_name) {
                    result.text = `${parsed.bank_name} - ${parsed.account_number} a.n ${parsed.account_name}`;
                    if (parsed.notes) result.text += ` | ${parsed.notes}`;
                } else if (parsed.notes) {
                    result.text = parsed.notes;
                } else {
                    // If it's just proof path, text is empty or dash
                    const copy = { ...parsed };
                    delete copy.proof_path;
                    if (Object.keys(copy).length > 0) {
                        // If there are other fields, show them
                        result.text = Object.values(copy).join(', ');
                    }
                }
            } else {
                result.text = notes;
            }
        } catch (e) {
            result.text = notes;
        }
        
        // Strip HTML tags if any (basic sanitization for display)
        if (result.text && typeof result.text === 'string') {
            result.text = result.text.replace(/<[^>]*>?/gm, '');
        }

        return result;
    };

    const details = getDetails(withdrawal.notes);

    // Get phone number with fallback
    const phoneNumber = withdrawal.user?.profile?.no_hp || withdrawal.user?.phone || '-';

    return (
        <div className="fixed inset-0 z-[999999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-4 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                    Detail Penarikan
                                </h3>
                                
                                <div className="mt-4 border-t border-gray-100 pt-4 space-y-3">
                                    {/* User Info */}
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Pemohon</p>
                                        <p className="font-medium text-gray-900">{withdrawal.user?.name}</p>
                                        <p className="text-sm text-gray-600">{withdrawal.user?.email}</p>
                                        <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                            <i className="fas fa-phone text-gray-400"></i>
                                            <span className="font-medium select-all">{phoneNumber}</span>
                                        </p>
                                    </div>

                                    {/* Withdrawal Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Nominal</p>
                                            <p className="text-lg font-bold text-secondary">
                                                Rp {Number(withdrawal.amount).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold">Tanggal</p>
                                            <p className="text-sm text-gray-700">
                                                {new Date(withdrawal.created_at).toLocaleDateString('id-ID', {
                                                    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Bank Details */}
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Info Rekening / Catatan</p>
                                        <p className="text-sm text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-100 mt-1 break-words">
                                            {details.text}
                                        </p>
                                    </div>

                                    {/* Proof Image if available */}
                                    {details.proof && (
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Bukti Transfer</p>
                                            <div className="border rounded p-1 bg-gray-50">
                                                <img
                                                    src={details.proof.startsWith('http') ? details.proof : `/storage/${details.proof.replace(/^storage\//, '')}`}
                                                    alt="Bukti Transfer"
                                                    className="w-full h-auto rounded max-h-64 object-contain"
                                                    onError={(e) => { e.target.onerror = null; e.target.src = '/assets/images/hero/defoult.webp'; e.target.alt = 'Gambar tidak dapat dimuat'; }}
                                                />
                                                <a
                                                    href={details.proof.startsWith('http') ? details.proof : `/storage/${details.proof.replace(/^storage\//, '')}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-blue-600 hover:underline mt-1 block text-center"
                                                >
                                                    Lihat Ukuran Penuh
                                                </a>
                                            </div>
                                        </div>
                                    )}

                                    {/* Status */}
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-semibold">Status</p>
                                        <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${
                                            withdrawal.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                            withdrawal.status === 'approved' ? 'bg-blue-100 text-blue-800' : 
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {withdrawal.status.toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Action Form (Only for Admin/Superadmin and non-paid status) */}
                                    {withdrawal.status !== 'paid' && (
                                        <div className="mt-6 border-t border-gray-200 pt-4">
                                            <h4 className="font-medium text-gray-900 mb-3">Proses Pembayaran</h4>
                                            <form onSubmit={handleSubmit}>
                                                <div className="mb-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                                        Upload Bukti Transfer (Opsional)
                                                    </label>
                                                    <input
                                                        type="file"
                                                        accept="image/*,application/pdf"
                                                        onChange={e => setData('proof', e.target.files[0])}
                                                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
                                                    />
                                                    {errors.proof && <p className="text-red-500 text-xs mt-1">{errors.proof}</p>}
                                                </div>
                                                
                                                <button
                                                    type="submit"
                                                    disabled={processing}
                                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                                                >
                                                    {processing ? 'Memproses...' : 'Setujui & Tandai Lunas'}
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                        <button
                            type="button"
                            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                            onClick={onClose}
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function WithdrawHistory({ withdrawals, stats }) {
    const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const rows = withdrawals?.data || withdrawals || [];

    const openModal = (withdrawal) => {
        setSelectedWithdrawal(withdrawal);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedWithdrawal(null);
    };

    const statsCard = (
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
    );

    return (
        <FinanceContainer title="Riwayat Penarikan" stats={statsCard}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Tanggal</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">No HP</th>
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
                                                <td className="px-4 py-2 text-sm text-gray-700">{row.user?.profile?.no_hp || row.user?.phone || '-'}</td>
                                                <td className="px-4 py-2 text-sm text-right text-gray-700">
                                                    Rp {Number(row.amount || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-4 py-2 text-sm">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold leading-5 rounded-full ${
                                                        row.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                                        row.status === 'approved' ? 'bg-blue-100 text-blue-800' : 
                                                        'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {row.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <button
                                                        onClick={() => openModal(row)}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10 hover:bg-blue-200 text-secondary"
                                                        title="Detail"
                                                    >
                                                        <i className="fas fa-eye text-xs"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                                                Tidak ada riwayat penarikan
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
            
            {/* Modal Detail */}
            {isModalOpen && (
                <WithdrawalDetailModal 
                    withdrawal={selectedWithdrawal} 
                    onClose={closeModal} 
                />
            )}
        </FinanceContainer>
    );
}

