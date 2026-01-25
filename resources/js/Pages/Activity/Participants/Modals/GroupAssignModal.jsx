import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Users, X, Loader2 } from 'lucide-react';

export default function GroupAssignModal({ isOpen, onClose, activity, participantGroups, selectedIds }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        user_ids: selectedIds,
        group_id: '',
        new_group_name: '' // For creating a new group on the fly if needed, though controller might not support it directly in assign
    });

    const [mode, setMode] = useState('existing'); // 'existing', 'new', 'remove'

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();

        let submitData = {
            user_ids: selectedIds,
            group_id: data.group_id
        };

        if (mode === 'remove') {
            submitData.group_id = 'remove_group';
        }

        // Note: The controller check for 'new_group' returns an error instructing to save first.
        // So we should probably stick to selecting existing groups or removing.
        // Creating a new group should be a separate action or we need to handle it differently.
        // For now, let's support assigning to existing or removing.

        post(route('activity.participant-groups.assign', activity.uid), {
            data: submitData,
            onSuccess: () => {
                reset();
                onClose();
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                                <Users className="w-5 h-5 text-primary" />
                                Atur Kelompok Peserta
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-gray-500">
                                {selectedIds.length} peserta terpilih akan diproses.
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Tindakan
                                    </label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="mode"
                                                value="existing"
                                                checked={mode === 'existing'}
                                                onChange={(e) => {
                                                    setMode(e.target.value);
                                                    setData('group_id', '');
                                                }}
                                                className="text-primary focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700">Pilih Kelompok</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="mode"
                                                value="remove"
                                                checked={mode === 'remove'}
                                                onChange={(e) => {
                                                    setMode(e.target.value);
                                                    setData('group_id', 'remove_group');
                                                }}
                                                className="text-primary focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700">Keluarkan dari Kelompok</span>
                                        </label>
                                    </div>
                                </div>

                                {mode === 'existing' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Pilih Kelompok
                                        </label>
                                        <select
                                            value={data.group_id}
                                            onChange={(e) => setData('group_id', e.target.value)}
                                            className="w-full border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                            required={mode === 'existing'}
                                        >
                                            <option value="">-- Pilih Kelompok --</option>
                                            {participantGroups.map(group => (
                                                <option key={group.id} value={group.id}>
                                                    {group.name} ({group.participants_count || 0} anggota)
                                                </option>
                                            ))}
                                        </select>
                                        {errors.group_id && (
                                            <p className="mt-1 text-sm text-red-600">{errors.group_id}</p>
                                        )}
                                    </div>
                                )}

                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                    <p className="text-xs text-yellow-800">
                                        <strong>Catatan:</strong> Peserta yang berada dalam satu bukti transfer atau impor massal tidak boleh dipisahkan ke dalam kelompok yang berbeda.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
                                    disabled={processing}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 text-sm font-medium flex items-center gap-2"
                                    disabled={processing}
                                >
                                    {processing && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

