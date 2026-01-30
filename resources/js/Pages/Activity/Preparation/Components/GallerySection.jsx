import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { FileText, Plus, Trash2, Image } from 'lucide-react';
import Modal from '@/Components/Modal';
import Swal from 'sweetalert2';

export default function GallerySection({ activity, materials }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        file: null,
        files: [],
        material_type: 'image', // Explicitly set for gallery uploads
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('activity.preparation.store-material', activity.id), {
            onSuccess: () => {
                setIsModalOpen(false);
                reset();
            },
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Hapus Foto?',
            text: "Foto yang dihapus tidak dapat dikembalikan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('activity.preparation.destroy-material', [activity.id, id]));
            }
        });
    };

    return (
        <div className="p-8 bg-white font-primary relative">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Koleksi Foto</h3>
                    <p className="text-sm text-gray-500">Dokumentasi kegiatan</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-lg font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:border-indigo-900 focus:ring ring-indigo-300 disabled:opacity-25 transition ease-in-out duration-150 shadow-sm"
                >
                    <Plus className="w-4 h-4 mr-2" /> Tambah Foto
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {materials.map((material) => (
                    <div key={material.id} className="group relative bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                        <div className="aspect-w-16 aspect-h-12 bg-gray-200 relative">
                            {material.file_type === 'image' ? (
                                <img
                                    src={route('activity.preparation.serve-material', [activity.uid || activity.id, material.uid || material.id])}
                                    alt={material.name}
                                    className="object-cover w-full h-full"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-gray-400">
                                    <FileText className="w-12 h-12" />
                                </div>
                            )}

                            {/* Delete Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => handleDelete(material.id)}
                                    className="p-2 bg-white rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                                    title="Hapus Foto"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-3">
                            <p className="text-sm font-medium text-gray-900 truncate" title={material.name}>
                                {material.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                {material.created_at ? new Date(material.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                            </p>
                        </div>
                    </div>
                ))}

                {materials.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-gray-300">
                            <Image className="w-8 h-8" />
                        </div>
                        <h4 className="text-gray-900 font-medium mb-1">Belum ada foto</h4>
                        <p className="text-gray-500 text-sm mb-4">Mulai dokumentasikan kegiatan dengan mengupload foto.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="text-indigo-600 text-sm font-medium hover:text-indigo-800"
                        >
                            Upload Foto Pertama &rarr;
                        </button>
                    </div>
                )}
            </div>

            {/* Upload Modal */}
            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-bold text-gray-900">Upload Foto Baru</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <i className="fas fa-times"></i>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Judul Foto (Opsional)</label>
                            <input
                                type="text"
                                className="w-full border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                                placeholder="Biarkan kosong untuk menggunakan nama file"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                            />
                            <p className="text-[10px] text-gray-400 mt-1 italic">Judul ini akan digunakan untuk semua foto jika upload sekaligus.</p>
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">File Foto <span className="text-red-500">*</span></label>
                            <div className="mt-1 flex justify-center px-4 pt-4 pb-4 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative">
                                <div className="space-y-1 text-center">
                                    <div className="flex text-sm text-gray-600 justify-center">
                                        <label htmlFor="file-upload" className="relative cursor-pointer bg-transparent rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                                            <span>Pilih Foto (Bisa banyak)</span>
                                            <input
                                                id="file-upload"
                                                name="file-upload"
                                                type="file"
                                                className="sr-only"
                                                accept="image/*"
                                                multiple
                                                onChange={(e) => setData('files', Array.from(e.target.files))}
                                                required
                                            />
                                        </label>
                                    </div>
                                    <p className="text-[10px] text-gray-500">PNG, JPG, GIF up to 5MB per file</p>
                                    {data.files && data.files.length > 0 && (
                                        <div className="mt-2 bg-white p-2 rounded border border-gray-100 shadow-sm">
                                            <p className="text-xs text-emerald-600 font-bold mb-1">
                                                {data.files.length} Foto Terpilih
                                            </p>
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {data.files.slice(0, 3).map((f, i) => (
                                                    <span key={i} className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100 truncate max-w-[80px]">
                                                        {f.name}
                                                    </span>
                                                ))}
                                                {data.files.length > 3 && <span className="text-[10px] text-gray-400">+{data.files.length - 3} lainnya</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
                            {errors.files && <p className="text-xs text-red-500 mt-1">{errors.files}</p>}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                {processing ? 'Mengupload...' : 'Upload Foto'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}
