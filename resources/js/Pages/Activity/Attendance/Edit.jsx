import React from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import AcaraLayout from '@/Layouts/AcaraLayout';
import Swal from 'sweetalert2';

export default function Edit({ activity, attendance, batches }) {
    const { data, setData, put, processing, errors } = useForm({
        name: attendance.name || '',
        description: attendance.description || '',
        jenis_absen: attendance.jenis_absen || 'Manual',
        activity_batch_id: attendance.activity_batch_id || '',
    });

    const submit = (e) => {
        e.preventDefault();
        put(route('attendance.update', { activity: activity.id, attendance: attendance.id }), {
            onSuccess: () => {
                Swal.fire({
                    title: 'Berhasil!',
                    text: 'Jenis absen berhasil diperbarui.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                });
            },
        });
    };

    return (
        <AcaraLayout activity={activity}>
            <Head title={`Edit Absensi - ${activity.name}`} />
            <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-6 py-3 sm:py-4">
                            <h3 className="text-lg sm:text-xl font-bold text-white">Edit Jenis Absen</h3>
                        </div>

                        <div className="p-4 sm:p-6">
                            <form onSubmit={submit} className="space-y-4 sm:space-y-6">
                                <div>
                                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-tag mr-2 text-secondary"></i>Nama Jenis Absen
                                    </label>
                                    <input
                                        type="text"
                                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                            errors.name ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Masukkan nama jenis absen"
                                        required
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                                            <i className="fas fa-exclamation-circle mr-1 text-xs"></i>
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="fas fa-list mr-2 text-secondary"></i>Metode Absensi
                                        </label>
                                        <div className={`p-4 border rounded-lg bg-gray-50 space-y-2 ${
                                            errors.jenis_absen ? 'border-red-500' : 'border-gray-300'
                                        }`}>
                                            {['Mandiri', 'Manual', 'QR Mandiri', 'QR Manual'].map((type) => (
                                                <label key={type} className="flex items-center space-x-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        value={type}
                                                        checked={data.jenis_absen.includes(type)}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            if (checked) {
                                                                setData('jenis_absen', [...data.jenis_absen, type]);
                                                            } else {
                                                                setData('jenis_absen', data.jenis_absen.filter(t => t !== type));
                                                            }
                                                        }}
                                                        className="rounded text-secondary focus:ring-blue-500 w-4 h-4 border-gray-300"
                                                    />
                                                    <span className="text-gray-700">{type}</span>
                                                </label>
                                            ))}
                                        </div>
                                        {errors.jenis_absen && (
                                            <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                                                <i className="fas fa-exclamation-circle mr-1 text-xs"></i>
                                                {errors.jenis_absen}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="activity_batch_id" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="fas fa-users mr-2 text-secondary"></i>Batch / Sesi (Opsional)
                                        </label>
                                        <select
                                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                                errors.activity_batch_id ? 'border-red-500' : 'border-gray-300'
                                            }`}
                                            id="activity_batch_id"
                                            value={data.activity_batch_id}
                                            onChange={(e) => setData('activity_batch_id', e.target.value)}
                                        >
                                            <option value="">Semua Peserta</option>
                                            {batches && batches.map((batch) => (
                                                <option key={batch.id} value={batch.id}>
                                                    {batch.name}
                                                </option>
                                            ))}
                                        </select>
                                        {errors.activity_batch_id && (
                                            <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                                                <i className="fas fa-exclamation-circle mr-1 text-xs"></i>
                                                {errors.activity_batch_id}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-align-left mr-2 text-secondary"></i>Deskripsi
                                    </label>
                                    <textarea
                                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                            errors.description ? 'border-red-500' : 'border-gray-300'
                                        }`}
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        rows="4"
                                        placeholder="Masukkan deskripsi jenis absen"
                                    ></textarea>
                                    {errors.description && (
                                        <p className="mt-1 text-xs sm:text-sm text-red-600 flex items-center">
                                            <i className="fas fa-exclamation-circle mr-1 text-xs"></i>
                                            {errors.description}
                                        </p>
                                    )}
                                </div>

                                <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 border-t border-gray-200">
                                    <Link
                                        href={route('attendance.management', activity.id)}
                                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-all text-sm sm:text-base"
                                    >
                                        <i className="fas fa-arrow-left mr-2"></i>
                                        Kembali
                                    </Link>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base disabled:opacity-50"
                                    >
                                        <i className="fas fa-save mr-2"></i>
                                        {processing ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </AcaraLayout>
    );
}

