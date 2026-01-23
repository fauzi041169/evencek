import React, { useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Users, X, Trash2, Save, Plus, AlertCircle } from 'lucide-react';

export default function GroupsManageModal({ isOpen, onClose, activity, participantGroups }) {
    if (!isOpen) return null;

    const { data, setData, post, processing, errors, reset } = useForm({
        name: ''
    });

    const [editingGroup, setEditingGroup] = useState(null);
    const [editName, setEditName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('activity.participant-groups.store', activity.uid), {
            onSuccess: () => {
                reset();
            }
        });
    };

    const handleUpdate = (group) => {
        router.put(route('activity.participant-groups.update', { activity: activity.uid, group: group.id }), {
            name: editName
        }, {
            onSuccess: () => {
                setEditingGroup(null);
                setEditName('');
            }
        });
    };

    const handleDelete = (group) => {
        if (confirm('Apakah Anda yakin ingin menghapus kelompok ini? Peserta dalam kelompok ini akan dikeluarkan dari kelompok.')) {
            router.delete(route('activity.participant-groups.destroy', { activity: activity.uid, group: group.id }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl w-full">
                    <div className="bg-primary px-4 py-3 sm:px-6 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Kelola Kelompok Peserta
                        </h3>
                        <button onClick={onClose} className="text-indigo-100 hover:text-white focus:outline-none">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        {/* Add Group Form */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-end gap-3">
                                <div className="flex-grow w-full">
                                    <label className="block text-sm text-gray-700 font-medium mb-1">Nama Kelompok</label>
                                    <input 
                                        type="text" 
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        className="rounded border border-gray-300 px-3 py-2 w-full text-sm focus:ring-indigo-500 focus:border-indigo-500" 
                                        required 
                                        placeholder="Contoh: Kelompok A" 
                                    />
                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                </div>
                                <div className="w-full sm:w-auto">
                                    <button 
                                        type="submit" 
                                        disabled={processing}
                                        className="rounded-lg bg-orange-600 px-4 py-2 text-white text-sm font-semibold hover:bg-orange-700 w-full h-[38px] flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <Plus className="w-4 h-4" /> Tambah
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Groups List */}
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full text-sm divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Nama Kelompok</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Jumlah Peserta</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 max-h-[400px] overflow-y-auto block sm:table-row-group">
                                    {participantGroups.length > 0 ? (
                                        participantGroups.map((group) => (
                                            <tr key={group.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 whitespace-nowrap font-medium">
                                                    {editingGroup === group.id ? (
                                                        <div className="flex gap-2 items-center">
                                                            <input 
                                                                type="text" 
                                                                value={editName}
                                                                onChange={e => setEditName(e.target.value)}
                                                                className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 rounded px-2 py-1 w-full text-sm"
                                                            />
                                                            <button onClick={() => handleUpdate(group)} className="text-green-600 hover:text-green-800" title="Simpan">
                                                                <Save className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => setEditingGroup(null)} className="text-gray-400 hover:text-gray-600" title="Batal">
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span 
                                                            className="cursor-pointer hover:text-primary border-b border-dashed border-transparent hover:border-indigo-300"
                                                            onClick={() => {
                                                                setEditingGroup(group.id);
                                                                setEditName(group.name);
                                                            }}
                                                        >
                                                            {group.name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2 whitespace-nowrap">{group.participants_count}</td>
                                                <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                                                    <button 
                                                        onClick={() => handleDelete(group)} 
                                                        className="text-red-600 hover:text-red-900 ml-2 p-1 hover:bg-red-50 rounded" 
                                                        title="Hapus"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-8 text-center text-gray-500 italic flex flex-col items-center gap-2">
                                                <AlertCircle className="w-8 h-8 text-gray-300" />
                                                Belum ada kelompok.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

