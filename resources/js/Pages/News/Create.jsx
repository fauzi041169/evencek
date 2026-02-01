import React, { useState } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import CategoryManager from '@/Components/CategoryManager';
import Swal from 'sweetalert2';

export default function Create({ categories, subscriptionLimits, canCreate, currentNewsCount }) {
    const { data, setData, post, processing, errors } = useForm({
        title: '',
        category_id: '',
        content: '',
        status: 'published',
        image: null,
        featured: false,
    });

    const [imagePreview, setImagePreview] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('image', file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!canCreate.allowed) {
            Swal.fire('Limit Tercapai', canCreate.message, 'warning');
            return;
        }

        post(route('news.store'), {
            onSuccess: () => {
                Swal.fire('Berhasil', 'Berita berhasil dibuat', 'success');
            },
            onError: (err) => {
                Swal.fire('Error', 'Gagal membuat berita. Periksa input Anda.', 'error');
            }
        });
    };
    return (
        <MainLayout title="Buat Berita Baru">
            <div className="py-2 sm:py-6 min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Buat Berita Baru</h1>
                        <Link href={route('news.index')} className="text-gray-600 hover:text-secondary">
                            <i className="fas fa-arrow-left mr-2"></i> Kembali
                        </Link>
                    </div>

                    {!canCreate.allowed && (
                        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded shadow-sm">
                            <p className="font-bold">Limit Tercapai</p>
                            <p>{canCreate.message}</p>
                            <Link href={route('subscriptions.pricing')} className="underline mt-2 inline-block">Upgrade Paket</Link>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-md overflow-hidden p-4 sm:p-6 md:p-8">
                        <form onSubmit={handleSubmit}>
                            {/* Title */}
                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Judul Berita</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Masukkan judul berita..."
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    required
                                />
                                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Category */}
                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Kategori</label>
                                    <CategoryManager
                                        initialCategories={categories}
                                        selectedId={data.category_id}
                                        onChange={id => setData('category_id', id)}
                                        error={errors.category_id}
                                    />
                                </div>

                                {/* Status */}
                                <div>
                                    <label className="block text-gray-700 text-sm font-bold mb-2">Status</label>
                                    <select
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={data.status}
                                        onChange={(e) => setData('status', e.target.value)}
                                    >
                                        <option value="published">Published</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                    {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
                                </div>
                            </div>

                            {/* Image Upload */}
                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Gambar Utama</label>
                                <div className="flex items-start space-x-4">
                                    <div className="w-full">
                                        <input
                                            type="file"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            onChange={handleImageChange}
                                            accept="image/*"
                                        />
                                        <p className="text-gray-500 text-xs mt-1">Format: JPG, PNG, GIF. Maks: 5MB.</p>
                                        {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
                                    </div>
                                    {imagePreview && (
                                        <div className="w-32 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2">Konten Berita</label>
                                <textarea
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 h-64"
                                    placeholder="Tulis konten berita di sini..."
                                    value={data.content}
                                    onChange={(e) => setData('content', e.target.value)}
                                    required
                                ></textarea>
                                <p className="text-gray-500 text-xs mt-1">* Mendukung HTML dasar</p>
                                {errors.content && <p className="text-red-500 text-xs mt-1">{errors.content}</p>}
                            </div>

                            {/* Featured Checkbox */}
                            <div className="mb-8">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox h-5 w-5 text-secondary rounded"
                                        checked={data.featured}
                                        onChange={(e) => setData('featured', e.target.checked)}
                                    />
                                    <span className="text-gray-700 font-medium">Jadikan Berita Utama (Featured)</span>
                                </label>
                            </div>

                            {/* Submit Button */}
                            <div className="flex justify-end border-t pt-6">
                                <Link
                                    href={route('news.index')}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition mr-4"
                                >
                                    Batal
                                </Link>
                                <button
                                    type="submit"
                                    disabled={processing || !canCreate.allowed}
                                    className="px-6 py-2 bg-secondary text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center shadow-lg"
                                >
                                    {processing && <i className="fas fa-spinner fa-spin mr-2"></i>}
                                    Simpan Berita
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

