import React from 'react';
import Modal from '@/Components/Modal';

export default function PaymentDetailModal({ show, onClose, payment, loading }) {
    if (!show) return null;

    const getStatusBadge = (status) => {
        const s = (status || '-').toLowerCase();
        let badgeClass = 'bg-gray-100 text-gray-700 border-gray-200';
        let icon = 'fa-question-circle';
        
        if (s === 'pending') {
            badgeClass = 'bg-amber-100 text-amber-700 border-amber-200';
            icon = 'fa-clock';
        } else if (s === 'approved') {
            badgeClass = 'bg-emerald-100 text-emerald-700 border-emerald-200';
            icon = 'fa-check-circle';
        } else if (s === 'rejected') {
            badgeClass = 'bg-red-100 text-red-700 border-red-200';
            icon = 'fa-times-circle';
        }

        return { className: badgeClass, icon };
    };

    const statusData = getStatusBadge(payment?.status);

    return (
        <Modal show={show} onClose={onClose} maxWidth="md">
            <div className="bg-white shadow-lg w-full rounded-lg overflow-hidden">
                <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-5 py-4 border-b border-indigo-700 flex items-center justify-between">
                    <h6 className="m-0 font-semibold text-white">Detail Pembayaran</h6>
                    <button onClick={onClose} className="p-1 text-white hover:text-gray-200 transition-colors">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="px-5 py-5 max-h-[80vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                        </div>
                    ) : payment ? (
                        <div className="space-y-5">
                            {/* Status Section */}
                            <div className={`flex flex-col items-center justify-center py-4 rounded-xl border bg-opacity-20 ${statusData.className}`}>
                                <div className={`w-16 h-16 rounded-full flex items-center justify-center bg-white mb-2 shadow-sm ${statusData.className.replace('bg-opacity-20', '')}`}>
                                    <i className={`fas ${statusData.icon} text-3xl`}></i>
                                </div>
                                <span className="font-bold text-lg uppercase tracking-wide">{payment.status || '-'}</span>
                                {payment.status === 'pending' && (
                                    <p className="text-sm mt-1 text-center px-4">Menunggu validasi pembayaran dari panitia</p>
                                )}
                                {payment.status === 'rejected' && payment.rejection_reason && (
                                    <p className="text-sm mt-1 text-center px-4">{payment.rejection_reason}</p>
                                )}
                            </div>

                            {/* Details Grid */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center text-gray-600">
                                        <i className="fas fa-wallet w-6 text-center mr-3 text-indigo-500"></i>Metode
                                    </div>
                                    <div className="font-semibold text-gray-800">
                                        {payment.method_name || (payment.midtrans_transaction_id ? 'Midtrans' : 'Transfer Bank')}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center border-b border-gray-200 pb-2 last:border-0 last:pb-0">
                                    <div className="flex items-center text-gray-600">
                                        <i className="fas fa-money-bill-wave w-6 text-center mr-3 text-emerald-500"></i>Jumlah
                                    </div>
                                    <div className="font-bold text-gray-900">
                                        {payment.amount ? `Rp ${parseInt(payment.amount).toLocaleString('id-ID')}` : '-'}
                                    </div>
                                </div>
                            </div>

                            {/* Group Members */}
                            {payment.group_members && payment.group_members.length > 0 && (
                                <div className="rounded-xl border border-indigo-100 overflow-hidden shadow-sm mt-4">
                                    <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100 flex items-center justify-between">
                                        <span className="font-bold text-indigo-800 flex items-center">
                                            <i className="fas fa-users mr-2"></i>Daftar Anggota Kelompok
                                        </span>
                                        <span className="bg-white text-indigo-600 border border-indigo-200 py-0.5 px-2.5 rounded-full text-xs font-bold shadow-sm">
                                            Total: {payment.group_members.length}
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto bg-white">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">No</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Peserta</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {payment.group_members.map((member, idx) => (
                                                    <tr key={idx} className="hover:bg-indigo-50 transition-colors">
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-center">{idx + 1}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                                            <i className="fas fa-user-circle text-gray-400 mr-2"></i>
                                                            {member.name || member}
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{member.email || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Proof */}
                            {payment.proof_url && (
                                <div className="space-y-2">
                                    <div className="font-semibold text-gray-700 flex items-center">
                                        <i className="fas fa-image mr-2 text-gray-500"></i>Bukti Pembayaran
                                    </div>
                                    <div className="group relative rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                        <img
                                            src={payment.proof_url}
                                            alt="Bukti Pembayaran"
                                            className="w-full h-auto object-cover"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/assets/images/hero/defoult.webp';
                                                e.target.alt = 'Gambar tidak dapat dimuat';
                                            }}
                                        />
                                        <a href={payment.proof_url} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-semibold no-underline">
                                            <i className="fas fa-expand mr-2"></i> Lihat Ukuran Penuh
                                        </a>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {payment.notes && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800 flex items-start">
                                    <i className="fas fa-info-circle mt-0.5 mr-2 text-yellow-600 flex-shrink-0"></i>
                                    <div><span className="font-semibold block mb-1 text-yellow-900">Catatan:</span>{payment.notes}</div>
                                </div>
                            )}

                            {/* Pay Button for Pending Midtrans */}
                            {payment.status === 'pending' && payment.midtrans_snap_token && (
                                <div className="pt-2">
                                    <button 
                                        onClick={() => window.startSnapPayment && window.startSnapPayment(payment.midtrans_snap_token)}
                                        className="w-full inline-flex justify-center items-center px-4 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        <i className="fas fa-credit-card mr-2"></i> Bayar Sekarang
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-6 sm:py-10 text-gray-500">Data pembayaran tidak ditemukan.</div>
                    )}
                </div>
            </div>
        </Modal>
    );
}
