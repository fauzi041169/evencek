import React, { useState, useEffect } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';

export default function UserManagementIndex({
    users,
    roleStats = {},
    availableRoles = [],
    plans = [],
    auth
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [perPage, setPerPage] = useState(20);
    const [resetPasswordModal, setResetPasswordModal] = useState({ open: false, userId: null, userName: '' });
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState({ new: false, confirm: false });

    // Import Modal State
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [importFile, setImportFile] = useState(null);
    const [importProcessing, setImportProcessing] = useState(false);

    const currentUser = auth?.user;
    const isSuperAdmin = currentUser?.role === 'superadmin';
    const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

    const handleImport = (e) => {
        e.preventDefault();
        if (!importFile) return Swal.fire({
            icon: 'warning',
            title: 'Perhatian',
            text: 'Pilih file terlebih dahulu'
        });

        setImportProcessing(true);
        router.post(route('user-management.import'), {
            file: importFile
        }, {
            forceFormData: true,
            onSuccess: () => {
                setImportModalOpen(false);
                setImportFile(null);
                setImportProcessing(false);
            },
            onError: (errors) => {
                setImportProcessing(false);
                console.error(errors);
            },
            onFinish: () => setImportProcessing(false)
        });
    };

    const handleSearch = (e) => {
        e?.preventDefault();
        router.get(route('user-management.index'), {
            search: searchTerm,
            role: roleFilter,
            per_page: perPage,
        }, { preserveState: true });
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            const response = await fetch(`/user-management/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });
            const data = await response.json();
            if (data.success) {
                router.reload({ only: ['users'] });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: data.message || 'Gagal mengubah role'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Terjadi kesalahan saat mengubah role'
            });
        }
    };

    const handleSubscriptionChange = async (userId, planSlug) => {
        try {
            const response = await fetch(`/user-management/${userId}/subscription`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    action: planSlug === 'none' ? 'unset' : 'set_plan',
                    plan_slug: planSlug === 'none' ? null : planSlug
                })
            });
            const data = await response.json();
            if (data.success) {
                router.reload({ only: ['users'] });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: data.message || 'Gagal memperbarui langganan'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Terjadi kesalahan saat memperbarui langganan'
            });
        }
    };

    const handleResetPassword = async () => {
        if (newPassword !== confirmPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Password tidak cocok'
            });
            return;
        }
        if (newPassword.length < 8) {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Password minimal 8 karakter'
            });
            return;
        }

        try {
            const response = await fetch(`/user-management/${resetPasswordModal.userId}/reset-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ password: newPassword, password_confirmation: confirmPassword })
            });
            const data = await response.json();
            if (data.success) {
                setResetPasswordModal({ open: false, userId: null, userName: '' });
                setNewPassword('');
                setConfirmPassword('');
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Password berhasil direset'
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: data.message || 'Gagal mereset password'
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Terjadi kesalahan saat mereset password'
            });
        }
    };

    const handleDelete = (userId, userName) => {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: `Anda akan menghapus user ${userName}. PERHATIAN: Semua data terkait user ini akan dihapus PERMANEN.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('user-management.destroy', userId));
            }
        });
    };

    const getRoleColor = (role) => {
        const colors = {
            superadmin: 'bg-red-100 text-red-800',
            admin: 'bg-green-100 text-green-800',
            creator: 'bg-primary/10 text-primary',
            user: 'bg-secondary/10 text-secondary',
            guest: 'bg-yellow-100 text-yellow-800',
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    const usersList = users?.data || users || [];
    const pagination = users?.meta || users;

    return (
        <AdminLayout title="Manajemen User">
            <Head title="Manajemen User" />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-2 sm:py-6 px-4">
                <div className="w-full">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl shadow-lg px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center">
                                    <i className="fas fa-users-cog mr-3"></i>
                                    Manajemen User
                                </h2>
                                <p className="text-white/80 mt-1">Kelola user dan role dalam sistem</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setImportModalOpen(true)}
                                    className="bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl backdrop-blur-sm transition-all flex items-center gap-2 border border-white/30 shadow-sm font-semibold hover:shadow-md"
                                >
                                    <i className="fas fa-file-excel"></i> Update User (Excel)
                                </button>
                                <button
                                    onClick={async () => {
                                        const confirm = await Swal.fire({
                                            title: 'Isi Jenis Kelamin Otomatis',
                                            text: 'Sistem akan menganalisa nama dan mengisi jenis kelamin yang kosong. Lanjutkan?',
                                            icon: 'question',
                                            showCancelButton: true,
                                            confirmButtonText: 'Ya, Jalankan',
                                            cancelButtonText: 'Batal'
                                        });
                                        if (!confirm.isConfirmed) return;
                                        try {
                                            const res = await fetch(route('user-management.fill-gender'), {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    'X-CSRF-TOKEN': document.querySelector('meta[name=\"csrf-token\"]')?.content,
                                                    'Accept': 'application/json'
                                                },
                                                body: JSON.stringify({ limit: 1000 })
                                            });
                                            const data = await res.json();
                                            if (data.success) {
                                                Swal.fire({ icon: 'success', title: 'Berhasil', text: data.message });
                                                router.reload({ only: ['users'] });
                                            } else {
                                                Swal.fire({ icon: 'error', title: 'Gagal', text: data.message || 'Gagal menjalankan pengisian' });
                                            }
                                        } catch (e) {
                                            Swal.fire({ icon: 'error', title: 'Error', text: 'Terjadi kesalahan saat menjalankan pengisian' });
                                        }
                                    }}
                                    className="bg-white/20 hover:bg-white/30 text-white px-5 py-2.5 rounded-xl backdrop-blur-sm transition-all flex items-center gap-2 border border-white/30 shadow-sm font-semibold hover:shadow-md"
                                >
                                    <i className="fas fa-robot"></i> Isi Jenis Kelamin Otomatis
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Role Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        {['superadmin', 'admin', 'creator', 'user', 'guest'].map(role => (
                            <div key={role} className="bg-white rounded-lg shadow-md p-4 text-center">
                                <h5 className={`text-2xl font-bold mb-1 ${role === 'superadmin' ? 'text-red-600' :
                                    role === 'admin' ? 'text-green-600' :
                                        role === 'creator' ? 'text-primary' :
                                            role === 'user' ? 'text-secondary' : 'text-yellow-600'
                                    }`}>
                                    {(roleStats[role] || 0).toLocaleString()}
                                </h5>
                                <small className="text-gray-600 font-medium capitalize">{role}</small>
                            </div>
                        ))}
                    </div>

                    {/* Filter and Search */}
                    <div className="bg-white rounded-xl shadow-md mb-6 p-3 sm:p-6">
                        <form onSubmit={handleSearch} className="flex flex-row gap-4 items-end overflow-x-auto">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                >
                                    <option value="">Semua Role</option>
                                    {availableRoles.map(role => (
                                        <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Cari User</label>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Cari berdasarkan nama atau email..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                />
                            </div>
                            <div className="flex items-end gap-3 flex-shrink-0">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Per Halaman</label>
                                    <select
                                        value={perPage}
                                        onChange={(e) => setPerPage(e.target.value)}
                                        className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                    >
                                        <option value="10">10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-secondary hover:bg-secondary/90 text-white rounded-lg transition-all"
                                >
                                    <i className="fas fa-search mr-2"></i>Cari
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                            <h5 className="text-lg font-semibold text-gray-900 flex items-center">
                                <i className="fas fa-list mr-2"></i>
                                Daftar User ({pagination?.total || usersList.length} total)
                            </h5>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">No</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Nama</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Langganan</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Bergabung</th>
                                        <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {usersList.length > 0 ? usersList.map((user, index) => {
                                        const activeSubscription = user.active_subscription;
                                        const activeSlug = activeSubscription?.plan?.slug || '';

                                        return (
                                            <tr key={user.id} className="hover:bg-primary/5 transition-colors">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {(pagination?.from || 1) + index}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <img
                                                            src={user.profile_photo_url || '/assets/images/profilefoto/default-profile.png'}
                                                            alt="Profile"
                                                            className="h-10 w-10 rounded-full object-cover mr-3"
                                                            onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                                        />
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900">{user.name}</div>
                                                            {user.id === currentUser?.id && (
                                                                <span className="text-xs text-secondary font-medium">Anda</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                                                <td className="px-6 py-4">
                                                    {isAdmin && user.id !== currentUser?.id ? (
                                                        <select
                                                            value={user.role}
                                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                            className={`px-2 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer ${getRoleColor(user.role)}`}
                                                        >
                                                            {availableRoles.map(role => (
                                                                <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                                                            {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {isSuperAdmin && user.id !== currentUser?.id ? (
                                                        <select
                                                            value={activeSlug || 'none'}
                                                            onChange={(e) => handleSubscriptionChange(user.id, e.target.value)}
                                                            className="px-2 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer bg-gray-100 text-gray-800"
                                                        >
                                                            <option value="none">Tidak Berlangganan</option>
                                                            {plans.map(plan => (
                                                                <option key={plan.slug} value={plan.slug}>{plan.name}</option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                                            {activeSubscription?.plan?.name || 'Tidak Berlangganan'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Link
                                                            href={route('profile.show', user.id)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary transition-all hover:scale-110"
                                                            title="Lihat Profil"
                                                        >
                                                            <i className="fas fa-eye text-xs"></i>
                                                        </Link>
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => setResetPasswordModal({ open: true, userId: user.id, userName: user.name })}
                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-600 transition-all hover:scale-110"
                                                                title="Reset Password"
                                                            >
                                                                <i className="fas fa-key text-xs"></i>
                                                            </button>
                                                        )}
                                                        {isSuperAdmin && user.id !== currentUser?.id && (
                                                            <button
                                                                onClick={() => handleDelete(user.id, user.name)}
                                                                className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-all hover:scale-110"
                                                                title="Hapus User"
                                                            >
                                                                <i className="fas fa-trash-alt text-xs"></i>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-2 sm:py-8 text-center text-gray-500">
                                                <div className="flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                                        <i className="fas fa-users-slash text-2xl text-gray-400"></i>
                                                    </div>
                                                    <h3 className="text-lg font-medium text-gray-900 mb-1">Tidak ada pengguna</h3>
                                                    <p className="text-gray-500 text-sm">Belum ada data pengguna yang sesuai dengan pencarian</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination?.last_page > 1 && (
                            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                        Menampilkan {pagination.from} - {pagination.to} dari {pagination.total}
                                    </div>
                                    <div className="flex gap-2">
                                        {pagination.current_page > 1 && (
                                            <button
                                                onClick={() => router.get(route('user-management.index'), { page: pagination.current_page - 1, search: searchTerm, role: roleFilter, per_page: perPage })}
                                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-100"
                                            >
                                                â† Sebelumnya
                                            </button>
                                        )}
                                        {pagination.current_page < pagination.last_page && (
                                            <button
                                                onClick={() => router.get(route('user-management.index'), { page: pagination.current_page + 1, search: searchTerm, role: roleFilter, per_page: perPage })}
                                                className="px-3 py-1 border border-gray-300 rounded-lg text-sm hover:bg-gray-100"
                                            >
                                                Selanjutnya â†’
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Import User Modal */}
            {importModalOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => !importProcessing && setImportModalOpen(false)}></div>
                        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all">
                            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-gray-900">Update Data User (Excel)</h3>
                                <button onClick={() => !importProcessing && setImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>
                            <form onSubmit={handleImport} className="p-6">
                                <div className="mb-6">
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                                        <h4 className="font-semibold text-blue-800 mb-2 text-sm">Langkah 1: Download Template</h4>
                                        <p className="text-sm text-blue-600 mb-3">Gunakan template ini untuk mengisi data user yang akan diupdate/diimport.</p>
                                        <a
                                            href={route('user-management.download-template')}
                                            target="_blank"
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-700 rounded-lg text-sm font-semibold border border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors shadow-sm"
                                        >
                                            <i className="fas fa-download"></i> Download Template Excel
                                        </a>
                                    </div>

                                    <div className="border border-gray-200 rounded-xl p-4">
                                        <h4 className="font-semibold text-gray-800 mb-2 text-sm">Langkah 2: Upload File</h4>
                                        <p className="text-sm text-gray-500 mb-3">Upload file Excel yang sudah diisi.</p>
                                        <input
                                            type="file"
                                            accept=".xlsx, .xls, .csv"
                                            onChange={(e) => setImportFile(e.target.files[0])}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => setImportModalOpen(false)}
                                        disabled={importProcessing}
                                        className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!importFile || importProcessing}
                                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {importProcessing ? (
                                            <>
                                                <i className="fas fa-circle-notch fa-spin"></i> Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-upload"></i> Upload & Update
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetPasswordModal.open && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setResetPasswordModal({ open: false, userId: null, userName: '' })}></div>
                        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">Reset Password User</h3>
                            </div>
                            <div className="p-6">
                                <p className="text-sm text-gray-600 mb-4">
                                    Masukkan password baru untuk user <strong>{resetPasswordModal.userName}</strong>
                                </p>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.new ? 'text' : 'password'}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                minLength="8"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                            >
                                                <i className={`fas ${showPassword.new ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Minimal 8 karakter</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
                                        <div className="relative">
                                            <input
                                                type={showPassword.confirm ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                minLength="8"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                                            >
                                                <i className={`fas ${showPassword.confirm ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                                <button
                                    onClick={() => setResetPasswordModal({ open: false, userId: null, userName: '' })}
                                    className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleResetPassword}
                                    className="px-4 py-2 bg-secondary hover:bg-blue-700 text-white rounded-lg"
                                >
                                    Simpan Password
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
