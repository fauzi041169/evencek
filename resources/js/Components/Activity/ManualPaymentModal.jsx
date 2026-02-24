import React, { useState, useEffect, useRef } from 'react';
import Modal from '@/Components/Modal';
import axios from 'axios';
import { usePage } from '@inertiajs/react';

/** Hapus tag HTML dan decode entity agar teks tampil plain (tidak ada kode HTML terlihat). */
function stripHtml(str) {
    if (str == null || typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.innerHTML = str.replace(/<[^>]*>/g, ' ');
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

export default function ManualPaymentModal({ show, onClose, activity, paymentMethods = [], bulk_import_payment, defaultSenderName }) {
    const { props } = usePage();
    const [data, setData] = useState({
        payment_method_id: '',
        sender_name: bulk_import_payment?.sender_name || defaultSenderName || '',
        proof_of_payment: null,
        is_bulk: bulk_import_payment ? 1 : 0,
        modal: 1, // Indicate this is a modal submission
    });
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    // Reset form when modal opens/closes or activity changes
    useEffect(() => {
        if (show) {
            setData({
                payment_method_id: '',
                sender_name: bulk_import_payment?.sender_name || defaultSenderName || '',
                proof_of_payment: null,
                is_bulk: bulk_import_payment ? 1 : 0,
                modal: 1,
            });
            setErrors({});
            setSuccessMessage(null);
            setPreviewUrl(null);
            setIsDragging(false);
        }
    }, [show, activity, bulk_import_payment, defaultSenderName]);

    useEffect(() => {
        if (data.payment_proof instanceof File) {
            const url = URL.createObjectURL(data.payment_proof);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [data.payment_proof]);

    const handleInputChange = (key, value) => {
        setData(prev => ({ ...prev, [key]: value }));
        // Clear error for this field
        if (errors[key]) {
            setErrors(prev => ({ ...prev, [key]: null }));
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.type.match(/image.*/)) {
                handleInputChange('payment_proof', file);
            }
        }
    };

    const submit = (e) => {
        e.preventDefault();
        setProcessing(true);
        setErrors({});

        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key] !== null) {
                formData.append(key, data[key]);
            }
        });

        // Ensure we send modal=1 explicitly if not in data (though it is)
        // formData.append('modal', '1');

        axios.post(route('payments.store', activity.id), formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Accept': 'application/json',
            }
        })
            .then(response => {
                if (response.data.success) {
                    setSuccessMessage(response.data.message || 'Pembayaran berhasil dikirim!');
                    setTimeout(() => {
                        onClose();
                        // Reload the page to reflect changes (e.g. status update)
                        window.location.reload();
                    }, 1500);
                } else {
                    // Should not happen if success is false but status 200, but just in case
                    if (response.data.redirect_url) {
                        window.location.href = response.data.redirect_url;
                    }
                }
            })
            .catch(error => {
                console.error('Payment error:', error);
                if (error.response?.data?.errors) {
                    setErrors(error.response.data.errors);
                } else {
                    setErrors({ general: error.response?.data?.message || 'Terjadi kesalahan saat memproses pembayaran.' });
                }
            })
            .finally(() => {
                setProcessing(false);
            });
    };

    const totalAmount = bulk_import_payment?.gross_amount || activity?.price || 0;

    if (!show) return null;

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="w-full bg-white p-6">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <h3 className="text-xl font-bold text-gray-900">Selesaikan Pembayaran</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <i className="fas fa-times text-xl"></i>
                    </button>
                </div>

                {successMessage ? (
                    <div className="flex flex-col items-center justify-center py-6 sm:py-10 space-y-4">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                            <i className="fas fa-check text-3xl"></i>
                        </div>
                        <h4 className="text-xl font-bold text-gray-900">Berhasil!</h4>
                        <p className="text-gray-600 text-center">{successMessage}</p>
                    </div>
                ) : (
                    <>
                        {errors.general && (
                            <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
                                {errors.general}
                            </div>
                        )}

                        <div className="mb-6 border rounded-xl p-4 bg-gray-50 flex justify-between items-center">
                            <div>
                                <div className="text-sm text-gray-500 mb-1">Kegiatan</div>
                                <div className="font-semibold text-gray-900">{activity?.name || '-'}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-gray-500 mb-1">Total Tagihan</div>
                                <div className="text-xl font-bold text-blue-600">
                                    Rp {Number(totalAmount || 0).toLocaleString('id-ID')}
                                </div>
                            </div>
                        </div>

                        <form onSubmit={submit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">Pilih Metode Transfer</label>
                                {paymentMethods.length === 0 ? (
                                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4">
                                        Tidak ada metode pembayaran tersedia.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3 max-h-60 overflow-y-auto pr-1">
                                        {paymentMethods.map((method) => (
                                            <label key={method.id} className={`border rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-all ${String(data.payment_method_id) === String(method.id) ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-gray-50'}`}>
                                                <input
                                                    type="radio"
                                                    name="payment_method_id"
                                                    value={method.id}
                                                    checked={String(data.payment_method_id) === String(method.id)}
                                                    onChange={(e) => handleInputChange('payment_method_id', e.target.value)}
                                                    required
                                                    className="mt-1 text-blue-600 focus:ring-blue-500"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-bold text-gray-900">{stripHtml(method.name)}</div>
                                                    {(method.account_name || method.account_number) && (
                                                        <div className="text-xs text-gray-500 mt-0.5">
                                                            {stripHtml(method.account_name) || '-'} • {stripHtml(method.account_number) || '-'}
                                                        </div>
                                                    )}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                                {errors.payment_method_id && <p className="text-xs text-red-600 mt-1">{errors.payment_method_id}</p>}
                            </div>

                            {/* Sender Name Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pengirim</label>
                                <input
                                    type="text"
                                    value={data.sender_name}
                                    onChange={(e) => handleInputChange('sender_name', e.target.value)}
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    placeholder="Nama pemilik rekening"
                                />
                                {errors.sender_name && <p className="text-xs text-red-600 mt-1">{errors.sender_name}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Bukti Pembayaran</label>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${isDragging ? 'border-blue-500 bg-blue-100' :
                                            previewUrl ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="space-y-1 text-center w-full">
                                        {previewUrl ? (
                                            <div className="relative group">
                                                <img
                                                    src={previewUrl}
                                                    alt="Preview Bukti Pembayaran"
                                                    className="max-h-64 mx-auto rounded-lg shadow-sm"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                                    <div className="text-white font-medium flex items-center gap-2">
                                                        <i className="fas fa-camera"></i> Ganti Foto
                                                    </div>
                                                </div>
                                                <p className="text-sm text-blue-600 font-medium mt-3">
                                                    {data.payment_proof?.name}
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <i className="fas fa-cloud-upload-alt text-gray-400 text-3xl mb-2"></i>
                                                <div className="flex text-sm text-gray-600 justify-center">
                                                    <span className="relative rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                        <span>Upload file</span>
                                                    </span>
                                                    <p className="pl-1">atau drag and drop</p>
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    PNG, JPG, JPEG up to 2MB
                                                </p>
                                            </>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            id="modal-file-upload"
                                            name="file-upload"
                                            type="file"
                                            className="hidden"
                                            accept="image/jpeg,image/png,image/jpg"
                                            onChange={(e) => handleInputChange('payment_proof', e.target.files[0])}
                                        />
                                    </div>
                                </div>
                                {errors.payment_proof && <p className="text-xs text-red-600 mt-1">{errors.payment_proof}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={processing || !data.payment_proof}
                                className="w-full py-3.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <i className="fas fa-circle-notch fa-spin"></i> Memproses...
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        <i className="fas fa-paper-plane"></i> Kirim Pembayaran
                                    </span>
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </Modal>
    );
}
