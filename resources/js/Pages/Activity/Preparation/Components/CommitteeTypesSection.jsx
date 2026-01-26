import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Network, Plus, Edit, Trash2 } from 'lucide-react';

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
            onSuccess: () => { 
                setIsModalOpen(false); 
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: editingType ? 'Jenis kepanitiaan diperbarui' : 'Jenis kepanitiaan ditambahkan',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            },
            onError: () => Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Terjadi kesalahan saat menyimpan data',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            })
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
                    onSuccess: () => Swal.fire({
                        icon: 'success',
                        title: 'Terhapus!',
                        text: 'Jenis kepanitiaan berhasil dihapus.',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    }),
                    onError: () => Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: 'Gagal menghapus jenis kepanitiaan.',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    })
                });
            }
        });
    };

    const content = (
        <div className="p-8">
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
                        <Network className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">Jenis Kepanitiaan</h3>
                        <p className="text-xs text-slate-500 font-medium pt-1">Struktur Panitia</p>
                    </div>
                </div>
                <button
                    onClick={() => openModal()}
                    className="group flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm border border-amber-100/50 hover:shadow-amber-200 hover:shadow-lg"
                    title="Tambah Jenis Kepanitiaan"
                >
                    <Plus className="w-5 h-5 transform group-hover:rotate-90 transition-transform duration-300" />
                </button>
            </div>

            <div className="space-y-3">
                {committeeTypes.map((type) => (
                    <div key={type.id} className="flex justify-between items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-amber-100 transition-all duration-300 group">
                        <div className="flex-1 min-w-0 pr-4">
                            <span className="text-sm font-bold text-slate-900 block truncate group-hover:text-amber-700 transition-colors">{type.name}</span>
                            {type.description && (
                                <span className="text-xs text-slate-500 truncate block mt-0.5">{type.description}</span>
                            )}
                        </div>
                        <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <button onClick={() => openModal(type)} className="text-slate-400 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 p-2 rounded-lg transition-colors">
                                <Edit className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(type)} className="text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 p-2 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
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
