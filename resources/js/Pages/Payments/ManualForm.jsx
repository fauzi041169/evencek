import React from 'react';
import { Head, useForm, usePage } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';

export default function ManualForm({ activity, paymentMethods = [], bulk_import_payment, is_modal, defaultSenderName }) {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors } = useForm({
        payment_method_id: '',
        sender_name: bulk_import_payment?.sender_name || defaultSenderName || '',
        payment_proof: null,
        is_bulk: bulk_import_payment ? 1 : 0,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route('payments.store', activity.id), { forceFormData: true });
    };

    const totalAmount = bulk_import_payment?.gross_amount || activity?.price || 0;

    const content = (
        <div className={`w-full bg-white ${is_modal ? 'p-4' : 'p-6 rounded-xl shadow-sm border border-gray-100'}`}>
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
                    <label className="block text-sm font-medium text-gray-700 mb-3">Pilih Metode Transfer</label>
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
                                        <div className="font-bold text-gray-900">{method.name}</div>
                                        {(method.account_name || method.account_number) && (
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {method.account_name || '-'} â€¢ {method.account_number || '-'}
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
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="space-y-1 text-center">
                            <i className="fas fa-cloud-upload-alt text-gray-400 text-3xl mb-2"></i>
                            <div className="flex text-sm text-gray-600">
                                <label
                                    htmlFor="file-upload"
                                    className="relative cursor-pointer bg-white rounded-md font-medium text-secondary hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                                >
                                    <span>Upload file</span>
                                    <input 
                                        id="file-upload" 
                                        name="file-upload" 
                                        type="file" 
                                        className="sr-only"
                                        accept="image/jpeg,image/png,image/jpg"
                                        onChange={(e) => setData('payment_proof', e.target.files[0])}
                                    />
                                </label>
                                <p className="pl-1">atau drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">
                                PNG, JPG, JPEG up to 2MB
                            </p>
                            {data.payment_proof && (
                                <p className="text-sm text-emerald-600 font-medium mt-2">
                                    File terpilih: {data.payment_proof.name}
                                </p>
                            )}
                        </div>
                    </div>
                    {errors.payment_proof && <p className="text-xs text-red-600 mt-1">{errors.payment_proof}</p>}
                </div>

                <button
                    type="submit"
                    disabled={processing}
                    className="w-full py-3.5 bg-secondary text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="py-12 bg-gray-50 min-h-screen">
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

