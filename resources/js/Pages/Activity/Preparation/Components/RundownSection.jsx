import React, { useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';
import Modal from '@/Components/Modal';

export default function RundownSection({ activity, rundowns }) {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({
        start_time: '',
        end_time: '',
        title: '',
        speaker: '',
        location: '',
        description: ''
    });

    const activityId = activity.uid || activity.id;
    const { props } = usePage();
    const flash = props?.flash || {};

    const triggerFile = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setIsImportModalOpen(true);
    };

    const startImport = () => {
        if (!selectedFile) return;
        const formData = new FormData();
        formData.append('file', selectedFile);
        setUploading(true);
        router.post(route('activity.preparation.import-rundowns', activityId), formData, {
            onSuccess: () => {
                setUploading(false);
                setIsImportModalOpen(false);
                setSelectedFile(null);
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Rundown berhasil diimpor dari Excel',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            },
            onError: () => {
                setUploading(false);
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Terjadi kesalahan saat mengimpor rundown',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            },
            preserveScroll: true
        });
    };

    const cancelImport = () => {
        setIsImportModalOpen(false);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const beginEdit = (item) => {
        setEditingId(item.id);
        setEditForm({
            start_time: item.start_time || '',
            end_time: item.end_time || '',
            title: item.title || item.name || '',
            speaker: item.speaker || item.pic || '',
            location: item.location || '',
            description: item.description || ''
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = (id) => {
        const payload = {
            start_time: editForm.start_time,
            end_time: editForm.end_time,
            title: editForm.title,
            description: editForm.description,
            speaker: editForm.speaker,
            location: editForm.location,
            _method: 'PUT'
        };
        router.post(route('activity.preparation.update-rundown', [activityId, id]), payload, {
            onSuccess: () => {
                setEditingId(null);
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Rundown diperbarui',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            },
            onError: () => {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Terjadi kesalahan saat menyimpan perubahan',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            },
            preserveScroll: true
        });
    };

    return (
        <div className="space-y-6 p-8 bg-white font-primary">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <i className="fas fa-calendar-day"></i>
                    <span>Rundown Acara</span>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={route('activity.preparation.download-rundown-template', activityId)}
                        className="px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
                    >
                        Unduh Template Excel
                    </a>
                    <button
                        onClick={triggerFile}
                        className="px-3 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 text-sm font-bold"
                        disabled={uploading}
                    >
                        {uploading ? 'Mengunggah…' : 'Impor dari Excel'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleFileChange}
                        aria-label="Impor Rundown via Excel"
                    />
                </div>
            </div>
            {flash?.success && (
                <div className="px-4 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm">
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div className="px-4 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-sm">
                    {flash.error}
                </div>
            )}
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Waktu</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kegiatan</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">PIC/Pengisi</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lokasi</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Keterangan</th>
                            <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-50">
                        {rundowns.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {editingId === item.id ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="time"
                                                value={editForm.start_time}
                                                onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                                                className="border rounded-md px-2 py-1 text-sm"
                                            />
                                            <span>-</span>
                                            <input
                                                type="time"
                                                value={editForm.end_time}
                                                onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                                                className="border rounded-md px-2 py-1 text-sm"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            {item.start_time ? item.start_time.substring(0, 5) : ''} - {item.end_time ? item.end_time.substring(0, 5) : ''}
                                        </>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                    {editingId === item.id ? (
                                        <input
                                            type="text"
                                            value={editForm.title}
                                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                            className="border rounded-md px-2 py-1 text-sm w-64"
                                        />
                                    ) : (
                                        item.title || item.name
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {editingId === item.id ? (
                                        <input
                                            type="text"
                                            value={editForm.speaker}
                                            onChange={(e) => setEditForm({ ...editForm, speaker: e.target.value })}
                                            className="border rounded-md px-2 py-1 text-sm w-48"
                                        />
                                    ) : (
                                        item.speaker || item.pic || '-'
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {editingId === item.id ? (
                                        <input
                                            type="text"
                                            value={editForm.location}
                                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                            className="border rounded-md px-2 py-1 text-sm w-48"
                                        />
                                    ) : (
                                        item.location || '-'
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                                    {editingId === item.id ? (
                                        <input
                                            type="text"
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                            className="border rounded-md px-2 py-1 text-sm w-full"
                                        />
                                    ) : (
                                        <span className="truncate block">{item.description || '-'}</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                    {editingId === item.id ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => saveEdit(item.id)}
                                                className="px-3 py-1 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary/90"
                                            >
                                                Simpan
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="px-3 py-1 rounded-md border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => beginEdit(item)}
                                            className="px-3 py-1 rounded-md border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50"
                                        >
                                            Edit
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {rundowns.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                                    Belum ada rundown acara.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <Modal show={isImportModalOpen} onClose={cancelImport} maxWidth="md">
                <div className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900">Konfirmasi Impor Rundown</h3>
                    {selectedFile && (
                        <div className="text-sm text-slate-600">
                            <div>File: <span className="font-medium">{selectedFile.name}</span></div>
                            <div>Ukuran: <span className="font-medium">{(selectedFile.size / 1024).toFixed(1)} KB</span></div>
                            <div className="mt-2 text-slate-500">Pastikan kolom: start_time, title (wajib). Opsional: end_time, description, speaker, location, order.</div>
                        </div>
                    )}
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={cancelImport}
                            className="px-3 py-2 rounded-md border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={startImport}
                            className="px-3 py-2 rounded-md bg-primary text-white text-sm font-bold hover:bg-primary/90"
                            disabled={uploading}
                        >
                            {uploading ? 'Mengunggah…' : 'Mulai Impor'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
