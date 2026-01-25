import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function CommitteeTypesSection({ committeeTypes, activity, isEmbedded = false }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [form, setForm] = useState({ name: '', description: '' });

    const openModal = (type = null) => {
        setEditingType(type);
        setForm({ name: type?.name || '', description: type?.description || '' });
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const activityId = activity.uid || activity.id;
        const opts = {
            onSuccess: () => { setIsModalOpen(false); Swal.fire('Berhasil', '', 'success'); },
            onError: () => Swal.fire('Error', '', 'error')
        };

        if (editingType) {
            router.put(route('activity.preparation.committee-types.update', { activityId, typeId: editingType.id }), form, opts);
        } else {
            router.post(route('activity.preparation.committee-types.store', activityId), form, opts);
        }
    };

    const handleDelete = (type) => {
        Swal.fire({
            title: 'Hapus Jenis Kepanitiaan?',
            text: `Yakin ingin menghapus "${type.name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                const activityId = activity.uid || activity.id;
                router.delete(route('activity.preparation.committee-types.destroy', { activityId, typeId: type.id }), {
                    onSuccess: () => Swal.fire('Terhapus!', 'Jenis kepanitiaan berhasil dihapus.', 'success'),
                    onError: () => Swal.fire('Error', 'Gagal menghapus jenis kepanitiaan.', 'error')
                });
            }
        });
    };

    const content = (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 border-l-4 border-secondary pl-3">Jenis Kepanitiaan</h3>
                <button
                    onClick={() => openModal()}
                    className="bg-secondary/10 text-secondary p-2 rounded-xl hover:bg-secondary hover:text-white transition-all shadow-sm"
                >
                    <i className="fas fa-plus"></i>
                </button>
            </div>

            <div className="space-y-2">
                {committeeTypes.map((type) => (
                    <div key={type.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                            <span className="text-sm font-bold block">{type.name}</span>
                            {type.description && (
                                <span className="text-xs text-gray-500">{type.description}</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openModal(type)} className="text-blue-500 hover:text-blue-700">
                                <i className="fas fa-edit"></i>
                            </button>
                            <button onClick={() => handleDelete(type)} className="text-red-500 hover:text-red-700">
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">{editingType ? 'Edit' : 'Tambah'} Jenis Kepanitiaan</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Jenis</label>
                                <input
                                    className="w-full px-4 py-2 border rounded-xl"
                                    placeholder="Contoh: Panitia Inti"
                                    value={form.name}
                                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (Opsional)</label>
                                <textarea
                                    className="w-full px-4 py-2 border rounded-xl"
                                    placeholder="Deskripsi singkat tentang jenis kepanitiaan"
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    rows="3"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-500">Batal</button>
                                <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl shadow-md">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );

    if (isEmbedded) return content;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden font-primary">
            {content}
        </div>
    );
}
