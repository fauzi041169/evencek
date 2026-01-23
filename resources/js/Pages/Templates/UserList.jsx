import { Head, Link, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { useState } from 'react';

export default function UserList({ users }) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const { data, setData, post, delete: destroy, processing, reset, errors } = useForm({
        name: '',
        email: '',
        role: 'user',
        password: '',
        password_confirmation: ''
    });

    const handleAddUser = (e) => {
        e.preventDefault();
        post(route('users.store'), {
            onSuccess: () => {
                setShowAddModal(false);
                reset();
            }
        });
    };

    const confirmDelete = (user) => {
        setSelectedUser(user);
        setShowDeleteModal(true);
    };

    const handleDelete = () => {
        if (selectedUser) {
            destroy(route('users.destroy', selectedUser.id), {
                onSuccess: () => setShowDeleteModal(false)
            });
        }
    };

    const getRoleBadgeColor = (role) => {
        switch(role) {
            case 'admin': return 'bg-red-500';
            case 'user': return 'bg-green-500';
            case 'guest': return 'bg-gray-500';
            case 'superadmin': return 'bg-orange-500';
            default: return 'bg-gray-500';
        }
    };

    return (
        <MainLayout>
            <Head title="User List" />

            <div className="container mx-auto px-4 py-8">
                <div className="bg-gradient-to-r from-[#4e73df] to-[#224abe] text-white p-4 rounded-t-lg flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold m-0">User Management</h2>
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="bg-white text-[#4e73df] px-4 py-2 rounded shadow hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                        <i className="fas fa-plus"></i> Add New User
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="p-6">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users && users.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <img 
                                                    src={user.profile_photo_url} 
                                                    alt={user.name} 
                                                    className="w-10 h-10 rounded-full object-cover"
                                                    onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{user.name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`${getRoleBadgeColor(user.role)} text-white text-xs font-bold px-2 py-1 rounded capitalize`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.profile?.no_hp || 'N/A'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.profile ? (
                                                    <>
                                                        {user.profile.regency?.name || 'N/A'}, {user.profile.province?.name || 'N/A'}
                                                    </>
                                                ) : 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex gap-2">
                                                    <Link href={route('users.show', user.id)} className="bg-blue-400 text-white p-2 rounded hover:bg-blue-500">
                                                        <i className="fas fa-eye"></i>
                                                    </Link>
                                                    <Link href={route('users.edit', user.id)} className="bg-yellow-400 text-white p-2 rounded hover:bg-yellow-500">
                                                        <i className="fas fa-edit"></i>
                                                    </Link>
                                                    <button 
                                                        onClick={() => confirmDelete(user)} 
                                                        className="bg-red-500 text-white p-2 rounded hover:bg-red-600"
                                                    >
                                                        <i className="fas fa-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4 flex justify-between items-center">
                            <h5 className="text-white font-bold text-xl">Tambah Pengguna Baru</h5>
                            <button onClick={() => setShowAddModal(false)} className="text-white hover:text-gray-200">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div className="p-6 grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nama <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        required 
                                    />
                                    {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                                    <input 
                                        type="email" 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={data.email}
                                        onChange={e => setData('email', e.target.value)}
                                        required 
                                    />
                                    {errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
                                    <select 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={data.role}
                                        onChange={e => setData('role', e.target.value)}
                                        required
                                    >
                                        <option value="guest">Guest</option>
                                        <option value="user">User</option>
                                        <option value="admin">Admin</option>
                                        <option value="superadmin">Superadmin</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
                                    <input 
                                        type="password" 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={data.password}
                                        onChange={e => setData('password', e.target.value)}
                                        required 
                                    />
                                    {errors.password && <div className="text-red-500 text-sm mt-1">{errors.password}</div>}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Konfirmasi Password <span className="text-red-500">*</span></label>
                                    <input 
                                        type="password" 
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        value={data.password_confirmation}
                                        onChange={e => setData('password_confirmation', e.target.value)}
                                        required 
                                    />
                                </div>
                            </div>
                            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                                >
                                    Tutup
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={processing}
                                    className="px-4 py-2 bg-secondary text-white rounded hover:bg-blue-700"
                                >
                                    Tambah Pengguna
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-red-500 to-pink-600 px-6 py-4 flex justify-between items-center">
                            <h5 className="text-white font-bold text-xl">Konfirmasi Hapus</h5>
                            <button onClick={() => setShowDeleteModal(false)} className="text-white hover:text-gray-200">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-gray-700">Apakah Anda yakin ingin menghapus pengguna ini?</p>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                            <button 
                                type="button" 
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                                Batal
                            </button>
                            <button 
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                                Hapus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}

