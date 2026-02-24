import React from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Upload, Loader2, Send } from 'lucide-react';
import WebLayout from '@/Layouts/WebLayout';

/** Hapus tag HTML dan decode entity agar teks tampil plain (tidak ada kode HTML terlihat). */
function stripHtml(str) {
    if (str == null || typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.innerHTML = str.replace(/<[^>]*>/g, ' ');
    return (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
}

export default function ManualForm({ activity, paymentMethods = [], bulk_import_payment, is_modal, defaultSenderName, return_to, onSuccess }) {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        payment_method_id: paymentMethods.length > 0 ? paymentMethods[0].id : '',
        sender_name: bulk_import_payment?.sender_name || defaultSenderName || '',
        payment_proof: null,
        is_bulk: bulk_import_payment ? 1 : 0,
        return_to: return_to || '',
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('payments.store', activity.id), {
            forceFormData: true,
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Bukti pembayaran berhasil dikirim!',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
                if (onSuccess) onSuccess();
            },
            onError: (errors) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal mengirim pembayaran. Periksa input Anda.',
                });
            }
        });
    };

    const totalAmount = bulk_import_payment?.gross_amount || activity?.price || 0;

    const content = (
        <div className={`w-full bg-white ${is_modal ? 'p-3' : 'p-3 sm:p-6 rounded-xl shadow-sm border border-gray-100'}`}>
            {flash?.error && (
                <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
                    {flash.error}
                </div>
            )}
            <div className="mb-6 border rounded-xl p-5 bg-gray-50">
                <div className="text-sm text-gray-500 mb-1">Kegiatan</div>
                <div className="font-bold text-gray-900 text-lg mb-3">{activity?.name || '-'}</div>
                <div className="text-sm text-gray-500 mb-1">Total Tagihan</div>
                <div className="text-2xl font-bold text-secondary">
                    Rp {Number(totalAmount || 0).toLocaleString('id-ID')}
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Metode Transfer</label>
                    {paymentMethods.length === 0 ? (
                        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4">
                            Tidak ada metode pembayaran tersedia.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {paymentMethods.map((method) => (
                                <label key={method.id} className={`border rounded-xl p-4 flex items-start gap-3 cursor-pointer transition-all ${String(data.payment_method_id) === String(method.id) ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'hover:bg-gray-50'}`}>
                                    <input
                                        type="radio"
                                        name="payment_method_id"
                                        value={method.id}
                                        checked={String(data.payment_method_id) === String(method.id)}
                                        onChange={(e) => setData('payment_method_id', e.target.value)}
                                        required
                                        className="mt-1 text-secondary focus:ring-blue-500"
                                    />
                                    <div>
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

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pengirim</label>
                    <input
                        type="text"
                        value={data.sender_name}
                        onChange={(e) => setData('sender_name', e.target.value)}
                        className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Nama pemilik rekening"
                    />
                    {errors.sender_name && <p className="text-xs text-red-600 mt-1">{errors.sender_name}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload Bukti Pembayaran</label>
                    <label
                        className={`w-full mt-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl transition-all cursor-pointer group relative overflow-hidden ${data.previewUrl
                                ? 'border-indigo-500 bg-indigo-50 p-2'
                                : 'px-6 pt-5 pb-6 bg-indigo-50 border-indigo-400 hover:bg-indigo-100 hover:border-indigo-500'
                            }`}
                        style={{ minHeight: data.previewUrl ? '200px' : 'auto' }}
                    >
                        {data.previewUrl ? (
                            <div className="relative w-full h-full flex flex-col items-center">
                                <img
                                    src={data.previewUrl}
                                    alt="Payment Proof Preview"
                                    className="max-h-[300px] w-auto object-contain rounded-lg shadow-md"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                    <p className="text-white font-medium flex items-center gap-2">
                                        <Upload className="w-5 h-5" /> Ganti Gambar
                                    </p>
                                </div>
                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full shadow-sm border border-indigo-100 mb-1 z-10">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <p className="text-sm text-indigo-800 font-medium truncate max-w-[200px]">
                                        {data.payment_proof?.name || 'Gambar Terpilih'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1 text-center pointer-events-none">
                                <div className="flex justify-center mb-2">
                                    <Upload className="h-10 w-10 text-indigo-500 group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="text-sm text-indigo-700 font-medium">
                                    <span>Klik area ini untuk upload file</span>
                                    <span className="text-indigo-500 font-normal ml-1">atau drag and drop</span>
                                </div>
                                <p className="text-xs text-indigo-400">
                                    PNG, JPG, JPEG up to 2MB
                                </p>
                            </div>
                        )}
                        <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="sr-only"
                            accept="image/jpeg,image/png,image/jpg"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    const url = URL.createObjectURL(file);
                                    setData(data => ({ ...data, payment_proof: file, previewUrl: url }));
                                } else {
                                    setData(data => ({ ...data, payment_proof: null, previewUrl: null }));
                                }
                            }}
                        />
                    </label>
                    {errors.payment_proof && <p className="text-xs text-red-600 mt-1">{errors.payment_proof}</p>}
                </div>

                <button
                    type="submit"
                    disabled={processing || !data.payment_proof}
                    className="w-full py-3.5 bg-secondary text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {processing ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" /> Memproses...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <Send className="w-5 h-5" /> Kirim Bukti Pembayaran
                        </span>
                    )}
                </button>
            </form>
        </div>
    );

    if (is_modal) {
        return (
            <>
                <Head title="Pembayaran Manual" />
                {content}
            </>
        );
    }

    return (
        <WebLayout>
            <Head title="Pembayaran Manual" />
            <div className="py-2 sm:py-6 bg-gray-50 min-h-screen">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Selesaikan Pembayaran</h1>
                        <p className="text-gray-500">Silakan lakukan transfer dan upload bukti pembayaran.</p>
                    </div>
                    {content}
                </div>
            </div>
        </WebLayout>
    );
}

