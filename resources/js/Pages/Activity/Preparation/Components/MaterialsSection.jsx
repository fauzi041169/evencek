import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';

export default function MaterialsSection({ activity, materials }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [materialType, setMaterialType] = useState('file'); // 'file' or 'link'

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        name: '',
        description: '',
        material_type: 'file', // logic handler
        file: null,
        link_url: '',
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        
        transform((data) => ({
            ...data,
            material_type: data.material_type === 'file' ? null : data.material_type,
        }));

        post(route('activity.preparation.store-material', activity.id), {
            onSuccess: () => {
                setIsModalOpen(false);
                reset();
                setMaterialType('file');
            },
        });
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: "Ingin menghapus materi ini?",
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

    const getYoutubeEmbedUrl = (url) => {
        if (!url) return '';
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : null;
    };

    return (
        <div className="space-y-6 p-8 bg-white font-primary">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Daftar Materi</h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-indigo-600 border border-transparent rounded-lg font-semibold text-xs text-white uppercase tracking-widest hover:bg-indigo-700 active:bg-indigo-900 focus:outline-none focus:border-indigo-900 focus:ring ring-indigo-300 disabled:opacity-25 transition ease-in-out duration-150"
                >
                    <i className="fas fa-plus mr-2"></i> Tambah Materi
                </button>
            </div>

            {materials.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <i className="fas fa-folder-open text-4xl text-gray-300 mb-4"></i>
                    <p className="text-gray-500">Belum ada materi yang diunggah.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {materials.map((item) => (
                        <div key={item.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                            {item.file_type === 'youtube' ? (
                                <div className="aspect-w-16 aspect-h-9 bg-gray-900 relative pt-[56.25%]">
                                    <iframe
                                        src={getYoutubeEmbedUrl(item.file_path)}
                                        title={item.name}
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className="absolute top-0 left-0 w-full h-full"
                                    ></iframe>
                                </div>
                            ) : (
                                <div className="bg-indigo-50/50 p-6 flex items-center justify-center h-48">
                                    <i className={`fas fa-4x ${
                                        item.file_type === 'pdf' ? 'fa-file-pdf text-red-500' :
                                        item.file_type === 'doc' ? 'fa-file-word text-blue-500' :
                                        item.file_type === 'ppt' ? 'fa-file-powerpoint text-orange-500' :
                                        item.file_type === 'image' ? 'fa-file-image text-purple-500' :
                                        item.file_type === 'link' ? 'fa-link text-gray-500' :
                                        'fa-file-alt text-indigo-500'
                                    }`}></i>
                                </div>
                            )}
                            
                            <div className="p-4">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1 mr-2">
                                        <h4 className="font-bold text-gray-900 line-clamp-1" title={item.name}>{item.name}</h4>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description || 'Tidak ada deskripsi'}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                    >
                                        <i className="fas fa-trash-alt"></i>
                                    </button>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                    <span className="text-xs text-gray-400 uppercase font-semibold badge bg-gray-100 px-2 py-1 rounded">
                                        {item.file_type === 'youtube' ? 'Video' : item.file_type}
                                    </span>
                                    
                                    {item.file_type !== 'youtube' && (
                                        <a
                                            href={item.file_type === 'link' ? item.file_path : route('activity.preparation.download-material', [activity.id, item.id])}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 inline-flex items-center"
                                        >
                                            {item.file_type === 'link' ? 'Buka Link' : 'Download'} <i className="fas fa-external-link-alt ml-1"></i>
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal show={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-xl font-bold text-gray-900">Tambah Materi Baru</h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">Nama Materi <span className="text-red-500">*</span></label>
                            <input
                                id="name"
                                type="text"
                                className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg shadow-sm transition-colors"
                                placeholder="Contoh: Slide Presentasi Sesi 1"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                            />
                            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">Deskripsi (Opsional)</label>
                            <textarea
                                id="description"
                                rows="2"
                                className="w-full border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg shadow-sm transition-colors resize-none"
                                placeholder="Tambahkan keterangan singkat tentang materi ini"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                            />
                            {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description}</p>}
                        </div>

                        <div>
                            <span className="block text-sm font-semibold text-gray-700 mb-2">Tipe Materi</span>
                            <div className="grid grid-cols-2 gap-3">
                                <div 
                                    onClick={() => {
                                        setMaterialType('file');
                                        setData(data => ({ ...data, material_type: 'file', link_url: '' }));
                                    }}
                                    className={`cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${materialType === 'file' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                                >
                                    <i className="fas fa-file-upload text-lg"></i>
                                    <span className="font-medium text-sm">Upload File</span>
                                </div>
                                <div 
                                    onClick={() => {
                                        setMaterialType('link');
                                        setData(data => ({ ...data, material_type: 'link', file: null }));
                                    }}
                                    className={`cursor-pointer border rounded-lg p-3 flex items-center justify-center gap-2 transition-all ${materialType === 'link' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-gray-300 text-gray-600'}`}
                                >
                                    <i className="fas fa-link text-lg"></i>
                                    <span className="font-medium text-sm">Link / Video</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            {materialType === 'file' ? (
                                <div>
                                    <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                                        Pilih File Dokumen
                                        <span className="block text-xs font-normal text-gray-500 mt-0.5">Format: PDF, DOC, PPT, Image (Max 100MB)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            id="file"
                                            className="block w-full text-sm text-gray-500
                                                file:mr-4 file:py-2.5 file:px-4
                                                file:rounded-md file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-indigo-600 file:text-white
                                                hover:file:bg-indigo-700
                                                cursor-pointer"
                                            onChange={(e) => setData('file', e.target.files[0])}
                                            required={materialType === 'file'}
                                        />
                                    </div>
                                    {errors.file && <p className="text-sm text-red-600 mt-1">{errors.file}</p>}
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="link_url" className="block text-sm font-medium text-gray-700 mb-2">
                                        URL Link / YouTube Video
                                    </label>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <i className="fas fa-globe text-gray-400"></i>
                                        </div>
                                        <input
                                            id="link_url"
                                            type="url"
                                            className="block w-full pl-10 border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded-md sm:text-sm"
                                            placeholder="https://..."
                                            value={data.link_url}
                                            onChange={(e) => setData('link_url', e.target.value)}
                                            required={materialType === 'link'}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                                        <i className="fas fa-info-circle mt-0.5"></i>
                                        <span>Masukkan link YouTube untuk menampilkan video player, atau link Google Drive/website untuk materi eksternal.</span>
                                    </p>
                                    {errors.link_url && <p className="text-sm text-red-600 mt-1">{errors.link_url}</p>}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={processing}
                                className="px-4 py-2 bg-indigo-600 border border-transparent rounded-lg font-medium text-sm text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                {processing ? 'Menyimpan...' : 'Simpan Materi'}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </div>
    );
}
