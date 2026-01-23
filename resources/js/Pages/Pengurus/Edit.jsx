import React, { useMemo, useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function Edit({ pengurus }) {
    const [previewUrl, setPreviewUrl] = useState('');
    const { data, setData, post, processing, errors, transform } = useForm({
        nama: pengurus?.nama || '',
        email: pengurus?.email || '',
        kode: pengurus?.kode || '',
        gelar: pengurus?.gelar || '',
        jabatan: pengurus?.jabatan || '',
        foto: null,
        deskripsi: pengurus?.deskripsi || '',
        periode: pengurus?.periode || '',
        linkedin_url: pengurus?.linkedin_url || '',
        twitter_url: pengurus?.twitter_url || '',
        telepon: pengurus?.telepon || '',
        is_active: !!pengurus?.is_active,
        _method: 'PUT',
    });

    const submit = (e) => {
        e.preventDefault();
        transform((payload) => {
            const next = { ...payload };
            if (!next.is_active) {
                delete next.is_active;
            }
            return next;
        });
        post(route('pengurus.update', pengurus.id), {
            forceFormData: true,
        });
    };

    const handleFileChange = (file) => {
        setData('foto', file);
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setPreviewUrl(event.target.result);
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl('');
        }
    };

    const backUrl = useMemo(() => route('pengurus.index'), []);
    const currentPhoto = pengurus?.foto ? `/storage/${pengurus.foto}` : '';

    return (
        <MainLayout>
            <Head title="Edit Pengurus" />
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl shadow-lg px-6 py-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-white flex items-center">
                                    <i className="fas fa-user-tie mr-3"></i>
                                    Edit Pengurus
                                </h2>
                                <Link
                                    href={backUrl}
                                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all flex items-center"
                                >
                                    <i className="fas fa-arrow-left mr-2"></i>
                                    Kembali
                                </Link>
                            </div>
                        </div>
                    </div>

                    {Object.keys(errors).length > 0 && (
                        <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center">
                                <i className="fas fa-exclamation-circle text-red-500 mr-3 text-xl"></i>
                                <div className="flex-1">
                                    <h3 className="text-red-800 font-semibold mb-2">Terdapat kesalahan:</h3>
                                    <ul className="list-disc list-inside text-red-700">
                                        {Object.values(errors).map((error, index) => (
                                            <li key={index}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-b-xl shadow-xl overflow-hidden">
                        <div className="p-6">
                            <form onSubmit={submit} encType="multipart/form-data">
                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <i className="fas fa-user-circle mr-2 text-secondary"></i>
                                        Informasi Dasar
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="nama" className="block text-sm font-semibold text-gray-700 mb-2">
                                                Nama Lengkap <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="nama"
                                                name="nama"
                                                value={data.nama}
                                                onChange={(e) => setData('nama', e.target.value)}
                                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.nama ? 'border-red-500' : 'border-gray-300'}`}
                                                placeholder="Masukkan nama lengkap"
                                                required
                                            />
                                            {errors.nama && <p className="mt-1 text-sm text-red-600">{errors.nama}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={data.email}
                                                onChange={(e) => setData('email', e.target.value)}
                                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                                                placeholder="contoh@email.com"
                                            />
                                            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="gelar" className="block text-sm font-semibold text-gray-700 mb-2">
                                                Gelar Akademik
                                            </label>
                                            <input
                                                type="text"
                                                id="gelar"
                                                name="gelar"
                                                value={data.gelar}
                                                onChange={(e) => setData('gelar', e.target.value)}
                                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.gelar ? 'border-red-500' : 'border-gray-300'}`}
                                                placeholder="Contoh: S.H., M.H., Ph.D"
                                            />
                                            {errors.gelar && <p className="mt-1 text-sm text-red-600">{errors.gelar}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="telepon" className="block text-sm font-semibold text-gray-700 mb-2">
                                                Nomor Telepon
                                            </label>
                                            <input
                                                type="text"
                                                id="telepon"
                                                name="telepon"
                                                value={data.telepon}
                                                onChange={(e) => setData('telepon', e.target.value)}
                                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.telepon ? 'border-red-500' : 'border-gray-300'}`}
                                                placeholder="Contoh: 081234567890"
                                            />
                                            {errors.telepon && <p className="mt-1 text-sm text-red-600">{errors.telepon}</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <i className="fas fa-briefcase mr-2 text-secondary"></i>
                                        Posisi & Periode
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="jabatan" className="block text-sm font-semibold text-gray-700 mb-2">
                                                Jabatan <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="jabatan"
                                                name="jabatan"
                                                value={data.jabatan}
                                                onChange={(e) => setData('jabatan', e.target.value)}
                                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.jabatan ? 'border-red-500' : 'border-gray-300'}`}
                                                placeholder="Contoh: Direktur Utama, Komisaris, dll"
                                                required
                                            />
                                            {errors.jabatan && <p className="mt-1 text-sm text-red-600">{errors.jabatan}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="periode" className="block text-sm font-semibold text-gray-700 mb-2">
                                                Periode <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                id="periode"
                                                name="periode"
                                                value={data.periode}
                                                onChange={(e) => setData('periode', e.target.value)}
                                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.periode ? 'border-red-500' : 'border-gray-300'}`}
                                                placeholder="Contoh: 2024-2029"
                                                required
                                            />
                                            {errors.periode && <p className="mt-1 text-sm text-red-600">{errors.periode}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="kode" className="block text-sm font-semibold text-gray-700 mb-2">
                                                Divisi/Unit <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                id="kode"
                                                name="kode"
                                                value={data.kode}
                                                onChange={(e) => setData('kode', e.target.value)}
                                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.kode ? 'border-red-500' : 'border-gray-300'}`}
                                                required
                                            >
                                                <option value="">Pilih Divisi/Unit</option>
                                                <option value="SLCC">SLCC</option>
                                                <option value="DPLP">DPLP</option>
                                                <option value="LAINNYA">Lainnya</option>
                                            </select>
                                            {errors.kode && <p className="mt-1 text-sm text-red-600">{errors.kode}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="is_active" className="block text-sm font-semibold text-gray-700 mb-2">
                                                Status
                                            </label>
                                            <div className="flex items-center mt-2">
                                                <input
                                                    type="checkbox"
                                                    id="is_active"
                                                    name="is_active"
                                                    checked={!!data.is_active}
                                                    onChange={(e) => setData('is_active', e.target.checked)}
                                                    className="w-4 h-4 text-secondary bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                />
                                                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                                                    Aktif
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <i className="fas fa-camera mr-2 text-secondary"></i>
                                        Foto Profil
                                    </h3>
                                    <div>
                                        {currentPhoto && (
                                            <div className="mb-4">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Saat Ini</label>
                                                <img
                                                    src={currentPhoto}
                                                    alt="Foto Pengurus"
                                                    className="max-w-xs rounded-lg shadow-md border-2 border-gray-200"
                                                />
                                            </div>
                                        )}
                                        <label htmlFor="foto" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Upload Foto Baru (Opsional)
                                        </label>
                                        <label
                                            htmlFor="foto"
                                            className="mt-2 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg hover:border-blue-400 transition-colors cursor-pointer border-gray-300"
                                        >
                                            <div className="space-y-1 text-center">
                                                <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-2"></i>
                                                <div className="flex text-sm text-gray-600">
                                                    <span className="relative cursor-pointer bg-white rounded-md font-medium text-secondary hover:text-blue-500">
                                                        Pilih file
                                                    </span>
                                                    <p className="pl-1">atau drag and drop</p>
                                                </div>
                                                <p className="text-xs text-gray-500">PNG, JPG, JPEG maksimal 2MB</p>
                                            </div>
                                            <input
                                                id="foto"
                                                name="foto"
                                                type="file"
                                                className="sr-only"
                                                accept="image/jpeg,image/png,image/jpg"
                                                onChange={(e) => handleFileChange(e.target.files[0])}
                                            />
                                        </label>
                                        {previewUrl && (
                                            <div className="mt-4">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Preview Foto Baru</label>
                                                <img src={previewUrl} alt="Preview" className="max-w-xs rounded-lg shadow-md" />
                                            </div>
                                        )}
                                        {errors.foto && <p className="mt-1 text-sm text-red-600">{errors.foto}</p>}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <i className="fas fa-align-left mr-2 text-secondary"></i>
                                        Deskripsi & Profil
                                    </h3>
                                    <div>
                                        <label htmlFor="deskripsi" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Biodata/Deskripsi
                                        </label>
                                        <textarea
                                            id="deskripsi"
                                            name="deskripsi"
                                            rows="5"
                                            value={data.deskripsi}
                                            onChange={(e) => setData('deskripsi', e.target.value)}
                                            className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.deskripsi ? 'border-red-500' : 'border-gray-300'}`}
                                            placeholder="Masukkan biodata atau deskripsi singkat tentang pengurus..."
                                        ></textarea>
                                        {errors.deskripsi && <p className="mt-1 text-sm text-red-600">{errors.deskripsi}</p>}
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <i className="fas fa-share-alt mr-2 text-secondary"></i>
                                        Media Sosial (Opsional)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label htmlFor="linkedin_url" className="block text-sm font-semibold text-gray-700 mb-2">
                                                LinkedIn URL
                                            </label>
                                            <input
                                                type="url"
                                                id="linkedin_url"
                                                name="linkedin_url"
                                                value={data.linkedin_url}
                                                onChange={(e) => setData('linkedin_url', e.target.value)}
                                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.linkedin_url ? 'border-red-500' : 'border-gray-300'}`}
                                                placeholder="https://linkedin.com/in/username"
                                            />
                                            {errors.linkedin_url && <p className="mt-1 text-sm text-red-600">{errors.linkedin_url}</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="twitter_url" className="block text-sm font-semibold text-gray-700 mb-2">
                                                Twitter/X URL
                                            </label>
                                            <input
                                                type="url"
                                                id="twitter_url"
                                                name="twitter_url"
                                                value={data.twitter_url}
                                                onChange={(e) => setData('twitter_url', e.target.value)}
                                                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${errors.twitter_url ? 'border-red-500' : 'border-gray-300'}`}
                                                placeholder="https://twitter.com/username"
                                            />
                                            {errors.twitter_url && <p className="mt-1 text-sm text-red-600">{errors.twitter_url}</p>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                                    <Link
                                        href={backUrl}
                                        className="px-6 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                                    >
                                        <i className="fas fa-times mr-2"></i>Batal
                                    </Link>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-secondary hover:bg-blue-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        disabled={processing}
                                    >
                                        <i className="fas fa-save mr-2"></i>Simpan Perubahan
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

