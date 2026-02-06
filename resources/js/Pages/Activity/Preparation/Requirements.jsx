import { Head, Link, useForm, router } from '@inertiajs/react';
import { useState } from 'react';
import Swal from 'sweetalert2';
import MainLayout from '@/Layouts/MainLayout';

export default function Requirements({ activity, division, requirements: initialRequirements }) {
    const [requirements, setRequirements] = useState(initialRequirements || []);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingRequirement, setEditingRequirement] = useState(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        quantity: 1,
        unit: '',
        status: 'pending',
        notes: '',
    });

    const stats = {
        pending: requirements.filter(r => r.status === 'pending').length,
        ready: requirements.filter(r => r.status === 'ready').length,
        completed: requirements.filter(r => r.status === 'completed').length,
    };

    const statusBadge = (status) => {
        const badges = {
            pending: 'badge-warning',
            ready: 'badge-info',
            completed: 'badge-success',
        };
        return badges[status] || 'badge-secondary';
    };

    const statusText = (status) => {
        const texts = {
            pending: 'Menunggu',
            ready: 'Siap',
            completed: 'Selesai',
        };
        return texts[status] || status;
    };

    const handleAddSubmit = (e) => {
        e.preventDefault();
        post(route('activity.preparation.store-requirement', [activity.id, division.id]), {
            preserveScroll: true,
            onSuccess: () => {
                setShowAddModal(false);
                reset();
                router.reload({ only: ['requirements'] });
            },
        });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        put(route('activity.preparation.update-requirement', [activity.id, division.id, editingRequirement.id]), {
            preserveScroll: true,
            onSuccess: () => {
                setShowEditModal(false);
                setEditingRequirement(null);
                reset();
                router.reload({ only: ['requirements'] });
            },
        });
    };

    const openEditModal = (requirement) => {
        setEditingRequirement(requirement);
        setData({
            name: requirement.name,
            quantity: requirement.quantity,
            unit: requirement.unit || '',
            status: requirement.status,
            notes: requirement.notes || '',
        });
        setShowEditModal(true);
    };

    const handleDelete = (requirement) => {
        Swal.fire({
            title: 'Konfirmasi Hapus',
            text: 'Yakin ingin menghapus kebutuhan ini?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('activity.preparation.destroy-requirement', [activity.id, division.id, requirement.id]), {
                    preserveScroll: true,
                });
            }
        });
    };

    return (
        <MainLayout>
            <Head title={`Kebutuhan Divisi - ${division.name}`} />

            <div className="min-h-screen bg-gray-50 py-1 sm:py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-3 sm:mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Link
                                    href={route('activity.preparation.index', activity.id)}
                                    className="text-secondary hover:text-secondary mb-2 inline-block"
                                >
                                    <i className="fas fa-arrow-left mr-2"></i>Kembali ke Manajemen Persiapan
                                </Link>
                                <h1 className="text-3xl font-bold text-gray-900">Kebutuhan Divisi</h1>
                                <p className="text-gray-600 mt-1">{division.name} - {activity.name}</p>
                            </div>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    reset();
                                    setShowAddModal(true);
                                }}
                            >
                                <i className="fas fa-plus mr-2"></i>Tambah Kebutuhan
                            </button>
                        </div>
                    </div>

                    {/* Divisi Info Card */}
                    <div className="bg-white rounded-lg shadow-md p-3 sm:p-6 mb-3 sm:mb-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-3">Informasi Divisi</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Nama Divisi</p>
                                <p className="text-lg font-semibold">{division.name}</p>
                            </div>
                            {division.description && (
                                <div>
                                    <p className="text-sm text-gray-600">Deskripsi</p>
                                    <p className="text-gray-900">{division.description}</p>
                                </div>
                            )}
                            {division.leader_name && (
                                <div>
                                    <p className="text-sm text-gray-600">Ketua Divisi</p>
                                    <p className="text-gray-900">{division.leader_name}</p>
                                    {division.leader_phone && (
                                        <p className="text-sm text-gray-600">{division.leader_phone}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Requirements List */}
                    <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-900">Daftar Kebutuhan</h2>
                            <div className="text-sm text-gray-600">
                                Total: <span className="font-semibold">{requirements.length}</span>
                            </div>
                        </div>

                        {requirements.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="table table-striped">
                                        <thead>
                                            <tr>
                                                <th className="text-center">No</th>
                                                <th>Nama Kebutuhan</th>
                                                <th>Jumlah</th>
                                                <th>Satuan</th>
                                                <th>Status</th>
                                                <th>Catatan</th>
                                                <th>Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {requirements.map((requirement, index) => (
                                                <tr key={requirement.id}>
                                                    <td className="text-center">{index + 1}</td>
                                                    <td className="font-medium">{requirement.name}</td>
                                                    <td>{requirement.quantity}</td>
                                                    <td>{requirement.unit || '-'}</td>
                                                    <td>
                                                        <span className={`badge ${statusBadge(requirement.status)}`}>
                                                            {statusText(requirement.status)}
                                                        </span>
                                                    </td>
                                                    <td>{requirement.notes ? requirement.notes.substring(0, 50) + (requirement.notes.length > 50 ? '...' : '') : '-'}</td>
                                                    <td>
                                                        <button
                                                            className="btn btn-sm btn-warning mr-1"
                                                            onClick={() => openEditModal(requirement)}
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => handleDelete(requirement)}
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Statistics */}
                                <div className="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-yellow-50 rounded-lg p-3 sm:p-4">
                                        <div className="flex items-center">
                                            <i className="fas fa-clock text-yellow-600 text-2xl mr-3"></i>
                                            <div>
                                                <p className="text-sm text-gray-600">Menunggu</p>
                                                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <div className="flex items-center">
                                            <i className="fas fa-check-circle text-secondary text-2xl mr-3"></i>
                                            <div>
                                                <p className="text-sm text-gray-600">Siap</p>
                                                <p className="text-2xl font-bold text-secondary">{stats.ready}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-4">
                                        <div className="flex items-center">
                                            <i className="fas fa-check-double text-green-600 text-2xl mr-3"></i>
                                            <div>
                                                <p className="text-sm text-gray-600">Selesai</p>
                                                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-4 sm:py-6">
                                <i className="fas fa-clipboard-list text-4xl text-gray-400 mb-4"></i>
                                <p className="text-gray-600">Belum ada kebutuhan. Klik tombol "Tambah Kebutuhan" untuk menambahkan.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Requirement Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowAddModal(false)}></div>
                        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
                            <div className="p-4 border-b">
                                <h5 className="text-lg font-semibold">Tambah Kebutuhan</h5>
                                <button
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <form onSubmit={handleAddSubmit}>
                                <div className="p-3 sm:p-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nama Kebutuhan *</label>
                                        <input
                                            type="text"
                                            className="form-control mt-1"
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            placeholder="Contoh: Meja, Kursi, Sound System"
                                            required
                                        />
                                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Jumlah *</label>
                                            <input
                                                type="number"
                                                className="form-control mt-1"
                                                value={data.quantity}
                                                onChange={e => setData('quantity', e.target.value)}
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Satuan</label>
                                            <input
                                                type="text"
                                                className="form-control mt-1"
                                                value={data.unit}
                                                onChange={e => setData('unit', e.target.value)}
                                                placeholder="Contoh: buah, unit, set"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Status</label>
                                        <select
                                            className="form-control mt-1"
                                            value={data.status}
                                            onChange={e => setData('status', e.target.value)}
                                        >
                                            <option value="pending">Menunggu</option>
                                            <option value="ready">Siap</option>
                                            <option value="completed">Selesai</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Catatan</label>
                                        <textarea
                                            className="form-control mt-1"
                                            rows="3"
                                            value={data.notes}
                                            onChange={e => setData('notes', e.target.value)}
                                            placeholder="Catatan tambahan tentang kebutuhan ini"
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="p-4 border-t flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowAddModal(false)}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={processing}
                                    >
                                        {processing ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Requirement Modal */}
            {showEditModal && editingRequirement && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowEditModal(false)}></div>
                        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
                            <div className="p-4 border-b">
                                <h5 className="text-lg font-semibold">Edit Kebutuhan</h5>
                                <button
                                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <form onSubmit={handleEditSubmit}>
                                <div className="p-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Nama Kebutuhan *</label>
                                        <input
                                            type="text"
                                            className="form-control mt-1"
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            required
                                        />
                                        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Jumlah *</label>
                                            <input
                                                type="number"
                                                className="form-control mt-1"
                                                value={data.quantity}
                                                onChange={e => setData('quantity', e.target.value)}
                                                min="1"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Satuan</label>
                                            <input
                                                type="text"
                                                className="form-control mt-1"
                                                value={data.unit}
                                                onChange={e => setData('unit', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Status</label>
                                        <select
                                            className="form-control mt-1"
                                            value={data.status}
                                            onChange={e => setData('status', e.target.value)}
                                        >
                                            <option value="pending">Menunggu</option>
                                            <option value="ready">Siap</option>
                                            <option value="completed">Selesai</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Catatan</label>
                                        <textarea
                                            className="form-control mt-1"
                                            rows="3"
                                            value={data.notes}
                                            onChange={e => setData('notes', e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="p-4 border-t flex justify-end space-x-2">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowEditModal(false)}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={processing}
                                    >
                                        {processing ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}

