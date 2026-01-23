import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function CategoriesIndex({ categories = [], flash, auth }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ open: false, category: null });

    const createForm = useForm({
        name: '',
        description: '',
    });

    const user = auth?.user;
    const canManage = user && (user.role === 'admin' || user.role === 'superadmin');

    const filteredCategories = categories.filter(cat => 
        cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cat.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = (e) => {
        e.preventDefault();
        createForm.post(route('kategori.store'), {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
            }
        });
    };

    const handleDelete = () => {
        if (!deleteModal.category) return;
        router.delete(route('kategori.destroy', deleteModal.category.id), {
            onSuccess: () => setDeleteModal({ open: false, category: null })
        });
    };

    return (
        <AdminLayout title="List Kategori">
            <Head title="Kategori" />

            <div className="min-h-screen bg-white py-4 px-4">
                <div className="w-full">
                    {/* Header */}
                    <div className="mb-4">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl shadow-lg px-5 py-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white flex items-center">
                                    <i className="fas fa-tags mr-2"></i>
                                    List Kategori
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 pr-3 py-1.5 rounded-lg border-0 focus:ring-2 focus:ring-white/50 text-gray-900 placeholder-gray-500"
                                            placeholder="Cari kategori..."
                                        />
                                        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300"></i>
                                    </div>
                                    {canManage && (
                                        <button
                                            onClick={() => setShowCreateModal(true)}
                                            className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-all flex items-center"
                                        >
                                            <i className="fas fa-plus mr-2 text-sm"></i>
                                            Tambah Kategori
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Flash messages are handled globally */}


                    {/* Table Card */}
                    <div className="bg-white rounded-b-xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">No</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nama Kategori</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Deskripsi</th>
                                        {canManage && (
                                            <th className="px-6 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Aksi</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredCategories.length > 0 ? filteredCategories.map((category, index) => (
                                        <tr key={category.id} className="hover:bg-blue-50 transition-colors duration-150">
                                            <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{index + 1}</td>
                                            <td className="px-6 py-2 whitespace-nowrap">
                                                <div className="text-sm font-semibold text-gray-900">{category.name}</div>
                                            </td>
                                            <td className="px-6 py-2">
                                                <div className="text-sm text-gray-600 max-w-md truncate" title={category.description}>
                                                    {category.description || '-'}
                                                </div>
                                            </td>
                                            {canManage && (
                                                <td className="px-6 py-2 whitespace-nowrap text-center">
                                                    <button
                                                        onClick={() => setDeleteModal({ open: true, category })}
                                                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-all duration-200 hover:scale-110"
                                                        title="Hapus"
                                                    >
                                                        <i className="fas fa-trash text-xs"></i>
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={canManage ? 4 : 3} className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="bg-gray-100 rounded-full p-6 mb-4">
                                                        <i className="fas fa-tags text-4xl text-gray-400"></i>
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada kategori</h3>
                                                    <p className="text-gray-600">Mulai dengan menambahkan kategori baru</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowCreateModal(false)}></div>
                        <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-white font-bold text-xl">Tambah Kategori</h5>
                                    <button onClick={() => setShowCreateModal(false)} className="text-white hover:text-gray-200">
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={handleCreate}>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Nama Kategori <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={createForm.data.name}
                                            onChange={(e) => createForm.setData('name', e.target.value)}
                                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${createForm.errors.name ? 'border-red-500' : 'border-gray-300'}`}
                                            required
                                        />
                                        {createForm.errors.name && <p className="mt-1 text-sm text-red-600">{createForm.errors.name}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi</label>
                                        <textarea
                                            value={createForm.data.description}
                                            onChange={(e) => createForm.setData('description', e.target.value)}
                                            rows="3"
                                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${createForm.errors.description ? 'border-red-500' : 'border-gray-300'}`}
                                        />
                                        {createForm.errors.description && <p className="mt-1 text-sm text-red-600">{createForm.errors.description}</p>}
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-5 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createForm.processing}
                                        className="px-5 py-2.5 bg-secondary hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                                    >
                                        {createForm.processing ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {deleteModal.open && deleteModal.category && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setDeleteModal({ open: false, category: null })}></div>
                        <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
                            <div className="bg-gradient-to-r from-red-500 to-pink-600 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <h5 className="text-white font-bold text-xl">Konfirmasi Hapus</h5>
                                    <button onClick={() => setDeleteModal({ open: false, category: null })} className="text-white hover:text-gray-200">
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-gray-700">
                                    Apakah Anda yakin ingin menghapus kategori <strong className="text-gray-900">{deleteModal.category.name}</strong>?
                                </p>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
                                <button
                                    onClick={() => setDeleteModal({ open: false, category: null })}
                                    className="px-5 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}

