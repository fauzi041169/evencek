import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AcaraLayout from '@/Layouts/AcaraLayout';
import Swal from 'sweetalert2';

export default function Index({ activity, batches }) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingBatch, setEditingBatch] = useState(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        code: '',
        start_date: '',
        end_date: '',
        quota: '',
        description: '',
        is_active: false,
    });

    const totalParticipants = batches.reduce((sum, batch) => sum + (batch.users_count || 0), 0);
    const activeBatches = batches.filter(b => b.is_active).length;

    const submitCreate = (e) => {
        e.preventDefault();
        post(route('activity.batches.store', activity.id), {
            onSuccess: () => {
                setShowCreateModal(false);
                reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Batch baru berhasil dibuat!',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        });
    };

    const submitUpdate = (e) => {
        e.preventDefault();
        put(route('activity.batches.update', { activity: activity.id, batch: editingBatch.id }), {
            onSuccess: () => {
                setEditingBatch(null);
                reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Data batch berhasil diperbarui!',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        });
    };

    const handleActivate = (batchId) => {
        Swal.fire({
            title: 'Aktifkan Batch?',
            text: "Batch yang lain akan dinonaktifkan secara otomatis.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Aktifkan!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('activity.batches.activate', { activity: activity.id, batch: batchId }), {}, {
                    onSuccess: () => {
                        Swal.fire({
                            icon: 'success',
                            title: 'Berhasil',
                            text: 'Batch berhasil diaktifkan!',
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000
                        });
                    }
                });
            }
        });
    };

    const handleDelete = (batch) => {
        Swal.fire({
            title: 'Hapus Batch?',
            text: `Yakin ingin menghapus batch "${batch.name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('activity.batches.destroy', { activity: activity.id, batch: batch.id }));
            }
        });
    };

    const openEditModal = (batch) => {
        setData({
            name: batch.name || '',
            code: batch.code || '',
            start_date: batch.start_date ? batch.start_date.split('T')[0] : '',
            end_date: batch.end_date ? batch.end_date.split('T')[0] : '',
            quota: batch.quota || '',
            description: batch.description || '',
            is_active: batch.is_active || false,
        });
        setEditingBatch(batch);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <AcaraLayout activity={activity}>
            <Head title={`Manajemen Batch - ${activity.name}`} />
            
            <div className="min-h-screen bg-gray-50/50 pb-20">
                {/* Header Section */}
                <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <nav className="flex mb-3" aria-label="Breadcrumb">
                                    <ol className="flex items-center space-x-2 text-sm">
                                        <li><i className="fas fa-home text-gray-400"></i></li>
                                        <li><span className="text-gray-300">/</span></li>
                                        <li className="text-gray-500">Kegiatan</li>
                                        <li><span className="text-gray-300">/</span></li>
                                        <li className="font-bold text-secondary">Manajemen Batch</li>
                                    </ol>
                                </nav>
                                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                                    Manajemen Sesi & Batch
                                </h1>
                                <p className="mt-2 text-sm text-gray-500">
                                    Mengelola gelombang pendaftaran untuk kegiatan:
                                    <span className="ml-2 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-secondary/10 text-secondary border border-secondary/20">
                                        <i className="fas fa-calendar-alt mr-1.5"></i>{activity.name}
                                    </span>
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-secondary hover:bg-secondary/80 transition-all transform hover:scale-105"
                            >
                                <i className="fas fa-plus-circle mr-2 text-lg"></i>
                                Buat Batch Baru
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Total Batch</p>
                                <p className="text-3xl font-extrabold text-gray-900 mt-1">{batches.length}</p>
                                <p className="text-xs text-gray-500 mt-1">Sesi tersedia</p>
                            </div>
                            <div className="w-14 h-14 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary text-2xl">
                                <i className="fas fa-layer-group"></i>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Status Aktif</p>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <p className="text-3xl font-extrabold text-gray-900">{activeBatches}</p>
                                    <span className="text-sm font-medium text-success bg-success/10 px-2 py-0.5 rounded-lg">Running</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Sesi sedang berjalan</p>
                            </div>
                            <div className="w-14 h-14 bg-success/10 rounded-2xl flex items-center justify-center text-success text-2xl">
                                <i className="fas fa-bolt"></i>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase">Total Peserta</p>
                                <p className="text-3xl font-extrabold text-gray-900 mt-1">{totalParticipants}</p>
                                <p className="text-xs text-gray-500 mt-1">Terdaftar di semua sesi</p>
                            </div>
                            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary text-2xl">
                                <i className="fas fa-users"></i>
                            </div>
                        </div>
                    </div>

                    {/* Batch List */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-lg font-bold text-gray-900">Daftar Batch</h2>
                            <span className="text-sm text-gray-500">
                                Menampilkan <span className="font-bold text-gray-900">{batches.length}</span> batch
                            </span>
                        </div>

                        {batches.length === 0 ? (
                            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-sm">
                                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-50 mb-6">
                                    <i className="fas fa-clipboard-list text-gray-300 text-4xl"></i>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Belum ada batch</h3>
                                <p className="mt-2 text-gray-500 max-w-sm mx-auto">Silakan buat batch pertama untuk mulai menerima pendaftaran.</p>
                                <button 
                                    onClick={() => setShowCreateModal(true)}
                                    className="mt-6 inline-flex items-center px-6 py-2.5 rounded-xl text-sm font-bold text-secondary bg-secondary/10 hover:bg-secondary/20 transition-colors"
                                >
                                    <i className="fas fa-plus mr-2"></i> Buat Batch Sekarang
                                </button>
                            </div>
                        ) : (
                            batches.map((batch) => (
                                <div key={batch.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all relative group">
                                    {batch.is_active && (
                                        <div className="absolute top-0 left-0 w-1.5 h-full bg-secondary"></div>
                                    )}
                                    
                                    <div className="p-6 sm:p-8">
                                        {/* Card Header */}
                                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                                            <div className="flex items-start gap-5">
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 transition-colors ${
                                                    batch.is_active 
                                                        ? 'bg-secondary text-white shadow-lg shadow-secondary/30' 
                                                        : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    <i className="fas fa-calendar-day"></i>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-secondary transition-colors">
                                                            {batch.name}
                                                        </h3>
                                                        {batch.is_active ? (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary/10 text-secondary border border-secondary/20">
                                                                <span className="w-2 h-2 bg-secondary rounded-full mr-2 animate-pulse"></span> AKTIF
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                                                                NON-AKTIF
                                                            </span>
                                                        )}
                                                        {batch.code && (
                                                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-gray-50 text-gray-600 border border-gray-200 font-mono">
                                                                #{batch.code}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 text-sm text-gray-500">
                                                        <i className="far fa-clock mr-1.5 text-gray-400"></i> 
                                                        Dibuat {new Date(batch.created_at).toLocaleDateString('id-ID')}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 lg:self-start">
                                                {!batch.is_active && (
                                                    <button 
                                                        onClick={() => handleActivate(batch.id)}
                                                        className="inline-flex items-center px-4 py-2 border border-secondary/20 text-sm font-bold rounded-xl text-secondary bg-secondary/10 hover:bg-secondary/20 transition-all"
                                                    >
                                                        <i className="fas fa-power-off mr-2"></i> Aktifkan
                                                    </button>
                                                )}
                                                <div className="flex items-center bg-gray-50 rounded-xl p-1 border border-gray-200">
                                                    <button 
                                                        onClick={() => openEditModal(batch)}
                                                        className="p-2 text-gray-500 hover:text-secondary hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                                        title="Edit Batch"
                                                    >
                                                        <i className="fas fa-pen"></i>
                                                    </button>
                                                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                                                    {(batch.users_count || 0) === 0 ? (
                                                        <button 
                                                            onClick={() => handleDelete(batch)}
                                                            className="p-2 text-gray-500 hover:text-danger hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                                            title="Hapus Batch"
                                                        >
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            disabled 
                                                            className="p-2 text-gray-300 cursor-not-allowed" 
                                                            title="Batch memiliki peserta, tidak dapat dihapus"
                                                        >
                                                            <i className="fas fa-trash-alt"></i>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Body */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-gray-100">
                                            <div className="relative pl-4 border-l-2 border-transparent hover:border-primary transition-colors">
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Periode Pelaksanaan</p>
                                                <div className="flex items-start text-gray-800 font-medium">
                                                    <i className="far fa-calendar-alt text-primary mt-1 mr-3"></i>
                                                    <div>
                                                        {batch.start_date || batch.end_date ? (
                                                            <>
                                                                <div>{formatDate(batch.start_date)}</div>
                                                                <div className="text-xs text-gray-400 my-0.5">s/d</div>
                                                                <div>{formatDate(batch.end_date)}</div>
                                                            </>
                                                        ) : (
                                                            <span className="text-gray-400 italic">Belum diatur</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="relative pl-4 border-l-2 border-transparent hover:border-secondary transition-colors">
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Partisipasi</p>
                                                <div className="flex flex-col">
                                                    <div className="flex items-center text-gray-800 font-medium mb-2">
                                                        <i className="fas fa-users text-secondary mr-3"></i>
                                                        <span className="text-lg">{batch.users_count || 0}</span>
                                                        {batch.quota > 0 && (
                                                            <>
                                                                <span className="text-gray-400 mx-1">/</span>
                                                                <span className="text-gray-500">{batch.quota}</span>
                                                            </>
                                                        )}
                                                        <span className="text-sm text-gray-500 ml-1.5">Peserta</span>
                                                    </div>
                                                    {batch.quota > 0 && (
                                                        <>
                                                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                                                <div 
                                                                    className="bg-primary h-2 rounded-full transition-all duration-500" 
                                                                    style={{ width: `${Math.min(100, ((batch.users_count || 0) / batch.quota) * 100)}%` }}
                                                                ></div>
                                                            </div>
                                                            <div className="text-xs text-right mt-1 text-primary font-semibold">
                                                                {Math.round(((batch.users_count || 0) / batch.quota) * 100)}% Terisi
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="relative pl-4 border-l-2 border-transparent hover:border-gray-300 transition-colors">
                                                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Keterangan</p>
                                                <p className="text-sm text-gray-600 leading-relaxed">
                                                    {batch.description || <span className="text-gray-400 italic">Tidak ada keterangan tambahan.</span>}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-gray-500/75 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">
                                <i className="fas fa-plus-circle text-secondary mr-2"></i> Buat Batch Baru
                            </h3>
                            <button onClick={() => { setShowCreateModal(false); reset(); }} className="text-gray-400 hover:text-gray-500">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <form onSubmit={submitCreate} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Batch *</label>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} 
                                           className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                                           placeholder="Contoh: Gelombang 1" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Kode (Opsional)</label>
                                    <input type="text" value={data.code} onChange={e => setData('code', e.target.value)} 
                                           className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                                           placeholder="Contoh: B1" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Mulai</label>
                                    <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)} 
                                           className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Selesai</label>
                                    <input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} 
                                           className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Kuota Peserta</label>
                                    <input type="number" value={data.quota} onChange={e => setData('quota', e.target.value)} 
                                           className="w-full max-w-xs rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" 
                                           placeholder="0" min="0" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Deskripsi</label>
                                    <textarea value={data.description} onChange={e => setData('description', e.target.value)} 
                                              className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" rows="2"></textarea>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="flex items-center gap-3 bg-blue-50 rounded-xl p-4 border border-blue-100 cursor-pointer">
                                        <input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} 
                                               className="h-5 w-5 text-secondary rounded focus:ring-blue-500" />
                                        <div>
                                            <span className="font-medium text-gray-800">Langsung Aktifkan?</span>
                                            <p className="text-sm text-gray-500">Jika dicentang, batch lain akan dinonaktifkan otomatis.</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => { setShowCreateModal(false); reset(); }} 
                                        className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">
                                    Batal
                                </button>
                                <button type="submit" disabled={processing}
                                        className="px-6 py-2.5 bg-secondary text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                                    <i className="fas fa-plus-circle mr-2"></i> Buat Batch
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingBatch && (
                <div className="fixed inset-0 bg-gray-500/75 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
                        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-900">
                                <i className="fas fa-edit text-blue-500 mr-2"></i> Edit Batch
                            </h3>
                            <button onClick={() => { setEditingBatch(null); reset(); }} className="text-gray-400 hover:text-gray-500">
                                <i className="fas fa-times text-xl"></i>
                            </button>
                        </div>
                        <form onSubmit={submitUpdate} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Batch *</label>
                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} 
                                           className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Kode</label>
                                    <input type="text" value={data.code} onChange={e => setData('code', e.target.value)} 
                                           className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Mulai</label>
                                    <input type="date" value={data.start_date} onChange={e => setData('start_date', e.target.value)} 
                                           className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Tanggal Selesai</label>
                                    <input type="date" value={data.end_date} onChange={e => setData('end_date', e.target.value)} 
                                           className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Kuota</label>
                                    <input type="number" value={data.quota} onChange={e => setData('quota', e.target.value)} 
                                           className="w-full max-w-xs rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" min="0" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Deskripsi</label>
                                    <textarea value={data.description} onChange={e => setData('description', e.target.value)} 
                                              className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500" rows="2"></textarea>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => { setEditingBatch(null); reset(); }} 
                                        className="px-6 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">
                                    Batal
                                </button>
                                <button type="submit" disabled={processing}
                                        className="px-6 py-2.5 bg-secondary text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                                    <i className="fas fa-save mr-2"></i> Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AcaraLayout>
    );
}

