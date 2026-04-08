import React, { useState, useRef, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { router, usePage } from '@inertiajs/react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { CheckCircle, XCircle, AlertCircle, FileText, Image, DollarSign, Calendar, User, CreditCard, Users, Upload, Save } from 'lucide-react';

export default function PaymentValidationModal({ show, onClose, payment, participant, activity, paymentMethods = [] }) {
    const { props } = usePage();
    const [processing, setProcessing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [notes, setNotes] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [localProofUrl, setLocalProofUrl] = useState(null);
    const [amount, setAmount] = useState('0');
    const [paymentMethodId, setPaymentMethodId] = useState('');
    const [senderName, setSenderName] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        setLocalProofUrl(payment?.proof_url);
        if (payment) {
            const isGroup = payment.is_group_payment || (payment.group_members && payment.group_members.length > 0);
            const totalMembers = 1 + (payment.group_members?.length || 0);
            const paymentAmount = Number(payment.amount);
            const activityPrice = Number(activity?.price);

            let initialAmount = 0;
            if (Number.isFinite(paymentAmount) && paymentAmount > 0) {
                initialAmount = paymentAmount;
            } else if (isGroup && Number.isFinite(activityPrice) && activityPrice > 0) {
                initialAmount = activityPrice * totalMembers;
            } else if (Number.isFinite(paymentAmount)) {
                initialAmount = paymentAmount;
            }

            setAmount(String(initialAmount));
            setPaymentMethodId(payment.payment_method_id || '');
            // Fallback ke nama user jika sender_name kosong
            setSenderName(payment.sender_name || participant?.user?.name || '');
            setIsDirty(false);
        }
    }, [payment, activity, participant]); // Added participant dependency

    if (!show || !payment) return null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Ukuran file maksimal 10MB'
            });
            return;
        }

        setUploading(true);

        const formData = new FormData();
        formData.append('proof_file', file);

        axios.post(route('payments.update-proof', payment.id), formData, {
            headers: {
                'Accept': 'application/json'
            }
        })
            .then(response => {
                if (response.data.success) {
                    setLocalProofUrl(response.data.proof_url);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    // Reload parent data silently to keep sync
                    router.reload({ only: ['participants'] });
                }
            })
            .catch(error => {
                console.error('Upload failed:', error);
                const msg = error?.response?.data?.message
                    || error?.response?.data?.error
                    || error?.message
                    || 'Gagal mengunggah bukti pembayaran';
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: msg
                });
            })
            .finally(() => {
                setUploading(false);
            });
    };

    const handleSave = () => {
        setProcessing(true);

        router.put(route('payments.update', payment.id), {
            notes: notes,
            amount: amount === '' ? 0 : Number(amount),
            payment_method_id: paymentMethodId,
            sender_name: senderName,
        }, {
            onSuccess: (page) => {
                setProcessing(false);
                if (page.props.flash?.error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: page.props.flash.error
                    });
                } else {
                    onClose();
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Data pembayaran berhasil disimpan',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            },
            onError: (errors) => {
                setProcessing(false);
                console.error('Save failed:', errors);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal menyimpan: ' + Object.values(errors).join(', ')
                });
            }
        });
    };

    const handleVerify = (status) => {
        if (status === 'rejected' && !showRejectInput) {
            setShowRejectInput(true);
            return;
        }

        if (status === 'rejected' && !rejectReason.trim()) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Mohon isi alasan penolakan'
            });
            return;
        }

        setProcessing(true);

        const finalNotes = status === 'rejected' ? rejectReason : notes;

        router.put(route('payments.verify', payment.id), {
            status: status,
            notes: finalNotes,
            amount: amount === '' ? 0 : Number(amount),
            payment_method_id: paymentMethodId,
            sender_name: senderName,
        }, {
            onSuccess: (page) => {
                setProcessing(false);
                if (page.props.flash?.error) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: page.props.flash.error
                    });
                } else {
                    setNotes('');
                    setRejectReason('');
                    setShowRejectInput(false);
                    onClose();
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Status pembayaran berhasil diperbarui',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            },
            onError: (errors) => {
                setProcessing(false);
                console.error('Verification failed:', errors);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal memproses: ' + Object.values(errors).join(', ')
                });
            }
        });
    };

    const isGroupPayment = payment.is_group_payment || (payment.group_members && payment.group_members.length > 0);
    const registrationMethod = participant?.participantGroup || isGroupPayment ? 'Kelompok' : 'Mandiri';
    const paymentMethodName = payment.payment_method?.name || (payment.midtrans_transaction_id ? 'Payment Gateway (Otomatis)' : 'Transfer Bank (Manual)');

    return (
        <Transition appear show={show} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-3xl transform rounded-2xl bg-white text-left align-middle shadow-xl transition-all max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y">
                                <div className="bg-white p-6">
                                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-6 -mx-6 -mt-6 px-6 pt-6 bg-slate-50/50 rounded-t-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100 shadow-sm">
                                                <CreditCard className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <Dialog.Title as="h3" className="text-xl font-bold text-slate-900 leading-none">
                                                    Validasi Pembayaran
                                                </Dialog.Title>
                                                <p className="text-xs text-slate-500 font-medium mt-1">Verifikasi bukti transfer peserta</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right hidden sm:block">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ring-1 ring-inset ${registrationMethod === 'Kelompok' ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'}`}>
                                                    {registrationMethod}
                                                </span>
                                                {participant?.participantGroup && (
                                                    <div className="text-[10px] text-slate-400 mt-0.5 font-medium truncate max-w-[120px]">
                                                        {participant.participantGroup.name}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={onClose}
                                                className="group p-2 rounded-full hover:bg-slate-100 transition-all text-slate-400 hover:text-rose-500"
                                            >
                                                <XCircle className="w-6 h-6 transform group-hover:rotate-90 transition-transform duration-300" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                        {/* Left Column: Details (5 cols) */}
                                        <div className="md:col-span-5 space-y-6">
                                            {/* Participant Card */}
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                                        <User className="w-6 h-6" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">Peserta</div>
                                                        <div className="font-bold text-slate-900 truncate" title={participant?.user?.name}>
                                                            {participant?.user?.name}
                                                        </div>
                                                        <div className="text-sm text-slate-500 truncate" title={participant?.user?.email}>
                                                            {participant?.user?.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment Info Grid */}
                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                        <DollarSign className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Nominal</span>
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                                                        <input
                                                            type="number"
                                                            value={amount}
                                                            onChange={(e) => { setAmount(e.target.value); setIsDirty(true); }}
                                                            className="w-full pl-10 pr-4 py-2 rounded-lg border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 font-bold text-lg text-slate-900"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                        <Calendar className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Tanggal</span>
                                                    </div>
                                                    <div className="font-medium text-slate-900">
                                                        {new Date(payment.created_at).toLocaleDateString('id-ID', {
                                                            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </div>
                                                </div>

                                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                        <CreditCard className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Metode Pembayaran</span>
                                                    </div>
                                                    <select
                                                        value={paymentMethodId}
                                                        onChange={(e) => { setPaymentMethodId(e.target.value); setIsDirty(true); }}
                                                        className="w-full border-0 p-0 text-slate-900 font-medium focus:ring-0 bg-transparent cursor-pointer"
                                                    >
                                                        <option value="">-- Pilih Metode --</option>
                                                        {paymentMethods.map(pm => (
                                                            <option key={pm.id} value={pm.id}>{pm.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* Group Members List */}
                                            {isGroupPayment && payment.group_members && payment.group_members.length > 0 && (
                                                <div className="bg-white p-3 rounded-lg border border-slate-200">
                                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                        <Users className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Anggota Kelompok ({payment.group_members.length})</span>
                                                    </div>
                                                    <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
                                                        {payment.group_members.map((member, idx) => (
                                                            <div key={member.id || idx} className="flex items-center gap-2 text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="font-medium text-slate-700 truncate">{member.name}</div>
                                                                    <div className="text-xs text-slate-500 truncate">{member.email}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Column: Proof & Actions (7 cols) */}
                                        <div className="md:col-span-7 flex flex-col h-full">
                                            <div className="flex-grow space-y-4">
                                                {/* Sender Info Section - Show for ALL transaction types to fix missing sender info issue */}
                                                <div>
                                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                        <CreditCard className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Informasi Pengirim</span>
                                                    </div>
                                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                                                        <div>
                                                            <label className="text-slate-500 text-xs block mb-1 font-bold">Nama Pengirim</label>
                                                            <input
                                                                type="text"
                                                                value={senderName}
                                                                onChange={(e) => { setSenderName(e.target.value); setIsDirty(true); }}
                                                                className="w-full rounded-lg border-slate-300 focus:border-primary focus:ring-primary text-slate-900 font-medium placeholder:text-slate-400"
                                                                placeholder="Masukkan nama pengirim..."
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                        <Image className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Bukti Pembayaran</span>
                                                    </div>
                                                    {localProofUrl ? (
                                                        <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3] flex items-center justify-center">
                                                            <img
                                                                src={localProofUrl}
                                                                alt="Bukti Pembayaran"
                                                                className="max-w-full max-h-full object-contain"
                                                                onError={() => setLocalProofUrl(null)}
                                                            />
                                                            <a
                                                                href={localProofUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white font-medium gap-2"
                                                            >
                                                                <Image className="w-5 h-5" />
                                                                Lihat Ukuran Penuh
                                                            </a>
                                                        </div>
                                                    ) : payment.has_proof_file ? (
                                                        <div className="rounded-xl border border-rose-200 border-dashed bg-rose-50 aspect-[4/3] flex flex-col items-center justify-center text-rose-500 p-4 text-center">
                                                            <AlertCircle className="w-10 h-10 mb-3" />
                                                            <span className="text-sm font-bold">File Bukti Pembayaran Hilang/Corrupt</span>
                                                            <span className="text-xs mt-1 text-rose-400">File tercatat di database namun tidak ditemukan di server.</span>
                                                        </div>
                                                    ) : (
                                                        <div className="rounded-xl border border-slate-200 border-dashed bg-slate-50 aspect-[4/3] flex flex-col items-center justify-center text-slate-400">
                                                            <Image className="w-10 h-10 mb-3" />
                                                            <span className="text-sm">Tidak ada bukti pembayaran</span>
                                                        </div>
                                                    )}
                                                    <div className="mt-2 flex justify-end">
                                                        <button
                                                            onClick={() => fileInputRef.current.click()}
                                                            disabled={uploading}
                                                            className="text-xs flex items-center gap-1 text-primary hover:text-indigo-700 font-medium disabled:opacity-50"
                                                        >
                                                            <Upload className="w-3 h-3" />
                                                            {uploading ? 'Mengunggah...' : (localProofUrl ? 'Ganti Bukti' : 'Upload Bukti')}
                                                        </button>
                                                        <input
                                                            type="file"
                                                            ref={fileInputRef}
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={handleFileChange}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Notes Input */}
                                                <div>
                                                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                                                        <FileText className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">Catatan Untuk Peserta</span>
                                                    </div>
                                                    <textarea
                                                        value={showRejectInput ? rejectReason : notes}
                                                        onChange={(e) => {
                                                            if (showRejectInput) {
                                                                setRejectReason(e.target.value);
                                                            } else {
                                                                setNotes(e.target.value);
                                                                setIsDirty(true);
                                                            }
                                                        }}
                                                        placeholder={showRejectInput ? "Tuliskan alasan penolakan..." : "Tuliskan catatan tambahan jika ada..."}
                                                        rows="3"
                                                        className={`w-full rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 text-sm ${showRejectInput ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 bg-rose-50' : ''}`}
                                                    ></textarea>
                                                    {payment.verifier && (
                                                        <div className="mt-2 text-xs text-slate-500 text-right">
                                                            Divalidasi oleh: <span className="font-medium text-slate-700">{payment.verifier.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="pt-6 mt-2 border-t border-slate-100">
                                                {showRejectInput ? (
                                                    <div className="flex items-center justify-end gap-3 animate-in fade-in slide-in-from-bottom-2">
                                                        <button
                                                            onClick={() => setShowRejectInput(false)}
                                                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                                                        >
                                                            Batal
                                                        </button>
                                                        <button
                                                            onClick={() => handleVerify('rejected')}
                                                            disabled={processing}
                                                            className="px-6 py-2 text-sm font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-sm shadow-rose-200 transition-all transform active:scale-95"
                                                        >
                                                            {processing ? 'Menolak...' : 'Konfirmasi Tolak'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className={`grid grid-cols-1 ${isDirty ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3`}>
                                                        {isDirty && (
                                                            <button
                                                                onClick={handleSave}
                                                                disabled={processing}
                                                                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-indigo-100 text-primary rounded-xl hover:bg-indigo-50 hover:border-indigo-200 font-bold transition-colors disabled:opacity-50"
                                                            >
                                                                {processing ? (
                                                                    <span className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                                ) : (
                                                                    <Save className="w-5 h-5" />
                                                                )}
                                                                Simpan
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleVerify('rejected')}
                                                            disabled={processing}
                                                            className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-rose-100 text-rose-600 rounded-xl hover:bg-rose-50 hover:border-rose-200 font-bold transition-colors disabled:opacity-50"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                            Tolak
                                                        </button>
                                                        <button
                                                            onClick={() => handleVerify('approved')}
                                                            disabled={processing || payment.status === 'approved'}
                                                            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold transition-all shadow-md shadow-emerald-200 hover:shadow-lg hover:shadow-emerald-200 transform active:scale-95 disabled:opacity-50 disabled:transform-none disabled:shadow-none"
                                                        >
                                                            {processing ? 'Memproses...' : (
                                                                <>
                                                                    <CheckCircle className="w-5 h-5" />
                                                                    Validasi
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
