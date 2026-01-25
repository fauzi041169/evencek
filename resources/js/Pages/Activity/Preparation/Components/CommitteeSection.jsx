import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function CommitteeSection({ activity, committeeStructure, refPositions, divisions, participants = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [data, setData] = useState({
        position: '',
        user_id: ''
    });
    const [processing, setProcessing] = useState(false);

    const openModal = (member = null) => {
        if (member) {
            setEditingMember(member);
            setData({
                position: member.position,
                user_id: member.user_id
            });
        } else {
            setEditingMember(null);
            setData({
                position: '',
                user_id: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.position || !data.user_id) return;

        setProcessing(true);

        if (editingMember) {
            router.put(route('activity.preparation.update-committee', {
                activityId: activity.uid || activity.id,
                committeeId: editingMember.id
            }), data, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    setEditingMember(null);
                    setData({ position: '', user_id: '' });
                    setProcessing(false);
                    Swal.fire({
                        title: 'Berhasil',
                        text: 'Data panitia berhasil diperbarui.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                },
                onError: (errors) => {
                    setProcessing(false);
                    const errorMessage = errors.user_id || errors.position || 'Gagal memperbarui panitia. Silakan periksa kembali data Anda.';
                    Swal.fire('Error', errorMessage, 'error');
                }
            });
        } else {
            router.post(route('activity.preparation.store-committee', activity.uid || activity.id), data, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    setData({ position: '', user_id: '' });
                    setProcessing(false);
                    Swal.fire({
                        title: 'Berhasil',
                        text: 'Panitia berhasil ditambahkan.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                },
                onError: (errors) => {
                    setProcessing(false);
                    const errorMessage = errors.user_id || errors.position || 'Gagal menambahkan panitia. Silakan periksa kembali data Anda.';
                    Swal.fire('Error', errorMessage, 'error');
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: "Panitia akan dihapus dari susunan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('activity.preparation.destroy-committee', { activityId: activity.uid || activity.id, committeeId: id }), {
                    onSuccess: () => {
                        Swal.fire('Terhapus!', 'Panitia berhasil dihapus.', 'success');
                    }
                });
            }
        });
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-8 transition-all hover:shadow-md duration-300">
            <div className="p-8 font-primary">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Susunan Panitia</h3>
                        <p className="text-sm text-gray-500 font-medium italic mt-1">Struktur organisasi dan penanggung jawab kegiatan</p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => openModal()}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                        >
                            <i className="fas fa-plus mr-2"></i>
                            Tambah Panitia
                        </button>
                        <a
                            href={route('activity.print-cards', { id: activity.uid || activity.id, type: 'committee' })}
                            target="_blank"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all active:scale-95"
                        >
                            <i className="fas fa-id-card mr-2 text-primary"></i>
                            Cetak ID Card
                        </a>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                    {committeeStructure.map((member) => (
                        <div key={member.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow transition-all group relative overflow-hidden">
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={() => openModal(member)}
                                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/90 text-gray-400 hover:text-blue-500 hover:bg-blue-50 shadow-sm border border-gray-100 transition-all"
                                    title="Edit"
                                >
                                    <i className="fas fa-edit text-[10px]"></i>
                                </button>
                                <button
                                    onClick={() => handleDelete(member.id)}
                                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/90 text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm border border-gray-100 transition-all"
                                    title="Hapus"
                                >
                                    <i className="fas fa-trash-alt text-[10px]"></i>
                                </button>
                            </div>

                            <div className="flex items-center gap-3 mb-3">
                                <div className="relative shrink-0">
                                    <img
                                        className="h-12 w-12 rounded-xl object-cover ring-2 ring-gray-50 shadow-sm"
                                        src={member.user?.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                                        alt={member.name}
                                        onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-900 truncate">{member.name}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/10 text-secondary border border-secondary/20 truncate max-w-[120px]">
                                            {member.position}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 mt-1 border-t border-gray-50 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    {divisions.find(d => d.id === member.activity_division_id)?.name || '-'}
                                </span>
                                <a href={`https://wa.me/${member.phone}`} target="_blank" className="text-xs font-medium text-gray-500 hover:text-green-500 transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-green-50">
                                    <i className="fab fa-whatsapp text-sm"></i>
                                    <span>{member.phone || '-'}</span>
                                </a>
                            </div>
                        </div>
                    ))}
                    {committeeStructure.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 bg-gray-50 rounded-2xl border border-gray-100 border-dashed">
                            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 text-gray-200 shadow-sm">
                                <i className="fas fa-users text-3xl"></i>
                            </div>
                            <p className="text-sm text-gray-400 font-bold">Belum ada susunan panitia</p>
                            <p className="text-xs text-gray-400 mt-1">Klik tombol di atas untuk mulai menyusun kepanitiaan Anda</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Tambah Panitia - Professional Rewrite */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsModalOpen(false)}
                    ></div>

                    <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <form onSubmit={handleSubmit}>
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-bold text-gray-900">{editingMember ? 'Edit Panitia' : 'Tambah Panitia'}</h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="relative group">
                                        <label htmlFor="position" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Jabatan / Posisi</label>
                                        <div className="relative">
                                            <i className="fas fa-id-card absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors"></i>
                                            <select
                                                id="position"
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary shadow-inner font-medium appearance-none"
                                                value={data.position}
                                                onChange={(e) => setData({ ...data, position: e.target.value })}
                                                required
                                            >
                                                <option value="">-- Pilih Jabatan --</option>
                                                {refPositions && refPositions.map((pos, idx) => (
                                                    <option key={idx} value={pos.name || pos}>
                                                        {pos.name || pos}
                                                    </option>
                                                ))}
                                            </select>
                                            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"></i>
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <label htmlFor="user_id" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Pilih Personel (Peserta Terdaftar)</label>
                                        <div className="relative">
                                            <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors"></i>
                                            <select
                                                id="user_id"
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary shadow-inner font-medium appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                                                value={data.user_id}
                                                onChange={(e) => setData({ ...data, user_id: e.target.value })}
                                                required
                                                disabled={!!editingMember}
                                            >
                                                <option value="">-- Pilih Peserta --</option>
                                                {participants.map((p) => (
                                                    <option key={p.id} value={p.user_id}>
                                                        {p.user?.name || p.name} {p.user?.email ? `(${p.user.email})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {!editingMember && (
                                                <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"></i>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 flex gap-3">
                                        <i className="fas fa-info-circle text-yellow-500 mt-1"></i>
                                        <p className="text-xs text-yellow-700 font-medium">Hanya peserta yang sudah terdaftar yang dapat dipilih menjadi panitia. Jika personel belum ada di daftar, silakan tambahkan sebagai peserta terlebih dahulu.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-gray-50 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-white active:scale-95 transition-all shadow-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !data.position || !data.user_id}
                                    className="flex-[2] py-4 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
                                >
                                    {processing ? (
                                        <span className="flex items-center justify-center">
                                            <i className="fas fa-circle-notch fa-spin mr-2"></i> Procesing...
                                        </span>
                                    ) : (
                                        editingMember ? 'Simpan Perubahan' : 'Simpan Panitia'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
