import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function ParticipationTypesSection({ participationTypes, activity, isEmbedded = false }) {
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
            router.put(route('activity.preparation.participation-types.update', { activityId, typeId: editingType.id }), form, opts);
        } else {
            router.post(route('activity.preparation.participation-types.store', activityId), form, opts);
        }
    };

    const content = (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 border-l-4 border-secondary pl-3">Jenis Kepesertaan</h3>
                <button
                    onClick={() => openModal()}
                    className="bg-secondary/10 text-secondary p-2 rounded-xl hover:bg-secondary hover:text-white transition-all shadow-sm"
                >
                    <i className="fas fa-plus"></i>
                </button>
            </div>

            <div className="space-y-2">
                {participationTypes.map((type) => (
                    <div key={type.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl group hover:bg-gray-100 transition-colors">
                        <span className="text-sm font-bold truncate pr-2 flex-1 min-w-0">{type.name}</span>
                        <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openModal(type)} className="text-blue-500 hover:text-blue-700 bg-white p-1.5 rounded-lg shadow-sm">
                                <i className="fas fa-edit"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">{editingType ? 'Edit' : 'Tambah'} Jenis</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                className="w-full px-4 py-2 border rounded-xl"
                                placeholder="Nama Jenis"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
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
