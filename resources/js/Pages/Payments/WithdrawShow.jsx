import React, { useState } from 'react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import Swal from 'sweetalert2';

export default function WithdrawShow({ withdrawal }) {
    const { auth } = usePage().props;
    const isAuthorized = auth.user.role === 'admin' || auth.user.role === 'superadmin';
    
    // Parse notes to check for proof path or original notes
    let parsedNotes = withdrawal.notes;
    let proofPath = null;
    
    try {
        const jsonNotes = JSON.parse(withdrawal.notes);
        if (jsonNotes && typeof jsonNotes === 'object') {
            if (jsonNotes.proof_path) {
                proofPath = jsonNotes.proof_path;
                // Remove proof_path from display notes if needed, or keep it hidden
                // For now, we assume other keys are not present or not important to show if proof exists
                // If there were original text notes, they might have been lost by the backend logic identified earlier.
                // Assuming backend preserves them in a specific key or we just show what's left.
            }
            // If it's just a wrapper for proof_path, we might not have text notes to show
        }
    } catch (e) {
        // Not JSON, assume plain text
        parsedNotes = withdrawal.notes;
    }

    const { data, setData, post, processing, errors, reset } = useForm({
        proof: null,
    });

    const handleApprove = (e) => {
        e.preventDefault();
        
        Swal.fire({
            title: 'Konfirmasi Pembayaran',
            text: "Apakah Anda yakin ingin menandai penarikan ini sebagai sudah dibayar?",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Tandai Dibayar'
        }).then((result) => {
            if (result.isConfirmed) {
                post(route('payments.withdraw.pay', withdrawal.id), {
                    onSuccess: () => {
                        Swal.fire(
                            'Berhasil!',
                            'Status penarikan telah diperbarui.',
                            'success'
                        );
                        reset();
                    },
                    onError: (err) => {
                        console.error(err);
                        Swal.fire(
                            'Gagal',
                            'Terjadi kesalahan saat memproses data.',
                            'error'
                        );
                    }
                });
            }
        });
    };

    return (
        <MainLayout title="Detail Penarikan">
            <Head title="Detail Penarikan" />
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header Navigation */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">Detail Penarikan</h2>
                        <Link 
                            href={route('payments.admin.withdraw.history')} 
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <i className="fas fa-arrow-left"></i>
                            Kembali
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Main Info Card */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <i className="fas fa-receipt opacity-80"></i>
                                            Informasi Permintaan
                                        </h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                                            withdrawal.status === 'paid' ? 'bg-green-500 text-white' : 
                                            withdrawal.status === 'rejected' ? 'bg-red-500 text-white' : 
                                            'bg-yellow-400 text-yellow-900'
                                        }`}>
                                            {withdrawal.status === 'paid' ? 'Selesai' : 
                                             withdrawal.status === 'rejected' ? 'Ditolak' : 'Menunggu Proses'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Diajukan Oleh</p>
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                                                    {withdrawal.user?.name?.charAt(0) || 'U'}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{withdrawal.user?.name || '-'}</p>
                                                    <p className="text-xs text-gray-500">{withdrawal.user?.email || '-'}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-500 mb-1">Nominal Penarikan</p>
                                            <p className="text-2xl font-black text-gray-900">
                                                Rp {Number(withdrawal.amount || 0).toLocaleString('id-ID')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <p className="text-sm text-gray-500 mb-1">Tanggal Pengajuan</p>
                                                <p className="font-medium text-gray-900 flex items-center gap-2">
                                                    <i className="far fa-calendar-alt text-gray-400"></i>
                                                    {withdrawal.created_at ? new Date(withdrawal.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : '-'}
                                                </p>
                                            </div>
                                            {withdrawal.status === 'paid' && (
                                                <div>
                                                    <p className="text-sm text-gray-500 mb-1">Diproses Oleh</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-gray-900">{withdrawal.verifier?.name || 'Admin'}</span>
                                                        <span className="text-xs text-gray-400">
                                                            ({withdrawal.verified_at ? new Date(withdrawal.verified_at).toLocaleDateString('id-ID') : '-'})
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Bank Details / Notes */}
                                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                        <h4 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                                            <i className="fas fa-sticky-note text-gray-400"></i>
                                            Catatan / Info Rekening
                                        </h4>
                                        <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                            {/* If parsedNotes is just text, show it. If it was JSON with proof, maybe we don't show raw JSON */}
                                            {typeof parsedNotes === 'string' ? parsedNotes : (
                                                <span className="italic text-gray-400">Tidak ada catatan teks.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Proof of Transfer Section (Visible if paid) */}
                            {withdrawal.status === 'paid' && proofPath && (
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="bg-emerald-600 px-6 py-3">
                                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                            <i className="fas fa-check-circle"></i>
                                            Bukti Transfer
                                        </h3>
                                    </div>
                                    <div className="p-6 flex justify-center bg-gray-50">
                                        <div className="relative group max-w-md w-full">
                                            <img 
                                                src={`/storage/${proofPath}`} 
                                                alt="Bukti Transfer" 
                                                className="w-full h-auto rounded-lg shadow-md border border-gray-200"
                                            />
                                            <a 
                                                href={`/storage/${proofPath}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold gap-2 rounded-lg"
                                            >
                                                <i className="fas fa-search-plus"></i>
                                                Lihat Ukuran Penuh
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Sidebar (Only for Admin/Superadmin if not paid) */}
                        {isAuthorized && withdrawal.status !== 'paid' && (
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
                                    <div className="bg-gray-800 px-6 py-4">
                                        <h3 className="text-lg font-bold text-white">
                                            <i className="fas fa-cog mr-2"></i>
                                            Tindakan
                                        </h3>
                                    </div>
                                    <div className="p-6">
                                        <form onSubmit={handleApprove} className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                                    Upload Bukti Transfer
                                                </label>
                                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:bg-gray-50 transition-colors cursor-pointer relative">
                                                    <div className="space-y-1 text-center">
                                                        <i className="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                                                        <div className="flex text-sm text-gray-600 justify-center">
                                                            <label htmlFor="proof-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                                                <span>Upload file</span>
                                                                <input 
                                                                    id="proof-upload" 
                                                                    name="proof" 
                                                                    type="file" 
                                                                    className="sr-only"
                                                                    accept="image/*,application/pdf"
                                                                    onChange={e => setData('proof', e.target.files[0])}
                                                                />
                                                            </label>
                                                        </div>
                                                        <p className="text-xs text-gray-500">PNG, JPG, PDF up to 20MB</p>
                                                    </div>
                                                </div>
                                                {data.proof && (
                                                    <div className="mt-2 text-sm text-emerald-600 font-medium flex items-center gap-2">
                                                        <i className="fas fa-file-check"></i>
                                                        File dipilih: {data.proof.name}
                                                    </div>
                                                )}
                                                {errors.proof && <div className="text-red-500 text-xs mt-1">{errors.proof}</div>}
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="w-full flex justify-center items-center gap-2 px-4 py-3 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all"
                                            >
                                                {processing ? (
                                                    <>
                                                        <i className="fas fa-spinner fa-spin"></i>
                                                        Memproses...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className="fas fa-check-circle"></i>
                                                        Setujui & Tandai Lunas
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

