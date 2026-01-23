import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function List({ 
    latestActivities, 
    categories, 
    title, 
    titlepage,
    manualLimit,
    currentManualPaidCount,
    manualLimitExceeded,
    category: currentCategory,
    filters 
}) {
    const { auth } = usePage().props;
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');
    const [selectedCategory, setSelectedCategory] = useState(filters?.category || currentCategory?.id || '');

    // Role helpers
    const user = auth?.user;
    const isSuperAdmin = user?.role === 'superadmin';
    const isAdmin = user?.role === 'admin' || isSuperAdmin;
    const isCreator = user?.role === 'creator' || isAdmin;

    // Handle search with debounce
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm !== (filters?.search || '')) {
                router.get(
                    route('activity.list'),
                    { search: searchTerm, category: selectedCategory },
                    { preserveState: true, replace: true }
                );
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleCategoryChange = (e) => {
        const categoryId = e.target.value;
        setSelectedCategory(categoryId);
        router.get(
            route('activity.list'),
            { search: searchTerm, category: categoryId },
            { preserveState: true, replace: true }
        );
    };

    // Helper to get data array whether it's paginated or collection
    const activityList = latestActivities.data || latestActivities;
    const paginationLinks = latestActivities.links;

    return (
        <MainLayout>
            <Head title={title || "Daftar Aktivitas"} />

            <div className="py-12">
                <div className="w-full sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                            
                            {/* Header & Filters Section */}
                            <div className="flex flex-row items-center gap-4 mb-6 overflow-x-auto pb-2">
                                <h2 className="text-2xl font-bold text-gray-800 whitespace-nowrap shrink-0">
                                    {titlepage || "Daftar Aktivitas"}
                                    {currentCategory && <span className="text-secondary"> - {currentCategory.name}</span>}
                                </h2>

                                <div className="min-w-[200px] shrink-0">
                                    <input
                                        type="text"
                                        placeholder="Cari aktivitas..."
                                        className="w-full border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 rounded-md shadow-sm"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="min-w-[200px] shrink-0">
                                    <select
                                        className="w-full border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 rounded-md shadow-sm"
                                        value={selectedCategory}
                                        onChange={handleCategoryChange}
                                    >
                                        <option value="">Semua Kategori</option>
                                        {categories.map((cat) => (
                                            <option key={cat.id} value={cat.id}>
                                                {cat.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex-1"></div>

                                {user && (isCreator || isAdmin) && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        {manualLimit !== null && (
                                            <div className="text-sm text-gray-600 mr-2">
                                                <span className={`font-bold ${manualLimitExceeded ? 'text-red-600' : 'text-green-600'}`}>
                                                    {currentManualPaidCount} / {manualLimit}
                                                </span>
                                                {' '}Manual Paid Activities
                                            </div>
                                        )}
                                        <Link
                                            href={route('activity.create')}
                                            className={`px-4 py-2 bg-secondary text-white rounded-lg hover:bg-blue-700 transition duration-150 ease-in-out flex items-center ${manualLimitExceeded ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            onClick={(e) => manualLimitExceeded && e.preventDefault()}
                                        >
                                            <i className="fas fa-plus mr-2"></i> Tambah Aktivitas
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Activity List */}
                            <div className="bg-white rounded-b-lg sm:rounded-b-xl shadow-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 table-activity">
                                        <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                            <tr>
                                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">No</th>
                                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nama Aktivitas</th>
                                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Kategori</th>
                                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Tanggal</th>
                                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Waktu</th>
                                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Metode Pembayaran</th>
                                                <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                                {user && (
                                                    <>
                                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Pendaftaran</th>
                                                        {(isCreator || isAdmin) && (
                                                            <th className="px-6 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Aksi</th>
                                                        )}
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {activityList.length > 0 ? (
                                                activityList.map((activity, index) => {
                                                    const startIndex = latestActivities.from || 1;
                                                    const isAuto = activity.payment_method_type === 'automatic'; // Adjust logic if needed
                                                    const isOwner = user && (activity.user_id === user.id || (activity.owners && activity.owners.some(o => o.id === user.id)));
                                                    const canManage = isAdmin || isOwner;
                                                    const canDelete = isAdmin || (user?.role === 'creator' && isOwner);
                                                    
                                                    // Status Pendaftaran Logic (Simulation based on blade)
                                                    const registrationStatuses = {
                                                        0: { label: 'Belum Dibuka', class: 'bg-gray-100 text-gray-800' },
                                                        1: { label: 'Dibuka', class: 'bg-green-100 text-green-800' },
                                                        2: { label: 'Ditutup', class: 'bg-red-100 text-red-800' }
                                                    };
                                                    const currentRegStatus = activity.pendaftaran || 0;
                                                    const statusInfo = registrationStatuses[currentRegStatus] || registrationStatuses[0];

                                                    const handleStatusChange = (newStatus) => {
                                                        router.post(route('activity.change-status', activity.id), {
                                                            status: newStatus
                                                        }, {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                        });
                                                    };

                                                    const handleRegistrationToggle = () => {
                                                        // Cycle: 0 (Belum Dibuka) -> 1 (Dibuka) -> 2 (Ditutup) -> 0
                                                        let nextStatus = 0;
                                                        if (currentRegStatus === 0) nextStatus = 1;
                                                        else if (currentRegStatus === 1) nextStatus = 2;
                                                        else nextStatus = 0;

                                                        router.post(route('activity.toggle-registration', activity.id), {
                                                            registration_status: nextStatus
                                                        }, {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                        });
                                                    };

                                                    const handlePinToggle = () => {
                                                        router.post(route('activity.toggleHeroPin', activity.id), {}, {
                                                            preserveScroll: true,
                                                            preserveState: true,
                                                        });
                                                    };

                                                    const handleDelete = () => {
                                                        if (confirm('Apakah Anda yakin ingin menghapus aktivitas ini?')) {
                                                            router.delete(route('activity.destroy', activity.id), {
                                                                preserveScroll: true,
                                                                preserveState: true,
                                                            });
                                                        }
                                                    };

                                                    return (
                                                        <tr key={activity.id} className="hover:bg-blue-50 transition-colors duration-150">
                                                            <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {startIndex + index}
                                                            </td>
                                                            <td className="px-6 py-2">
                                                                <div className="text-sm font-semibold text-gray-900 max-w-md truncate" title={activity.name}>
                                                                    {activity.name}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-2 whitespace-nowrap">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary">
                                                                    {activity.category?.name || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                                                                <div className="flex items-center">
                                                                    <i className="fas fa-calendar-alt mr-1.5 text-gray-400 text-xs"></i>
                                                                    {activity.date}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                                                                <div className="flex items-center">
                                                                    <i className="fas fa-clock mr-1.5 text-gray-400 text-xs"></i>
                                                                    {activity.start_time ? (
                                                                        <>
                                                                            {activity.start_time.substring(0, 5)}
                                                                            {activity.end_time ? ` - ${activity.end_time.substring(0, 5)}` : ''}
                                                                        </>
                                                                    ) : '-'}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-2 whitespace-nowrap">
                                                                {isAuto ? (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-indigo-700">
                                                                        Payment Gateway
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                                                        Transfer Bank
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-2 whitespace-nowrap">
                                                                {canManage ? (
                                                                    <select 
                                                                        value={activity.status || 'private'}
                                                                        onChange={(e) => handleStatusChange(e.target.value)}
                                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer border-none focus:ring-0 ${activity.status === 'public' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                                                        style={{ paddingRight: '2rem' }}
                                                                    >
                                                                        <option value="public">Public</option>
                                                                        <option value="private">Private</option>
                                                                    </select>
                                                                ) : (
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${activity.status === 'public' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                        {activity.status === 'public' ? 'Public' : 'Private'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            {auth.user && (
                                                                <>
                                                                    <td className="px-6 py-2 whitespace-nowrap">
                                                                        {canManage ? (
                                                                            <button 
                                                                                type="button"
                                                                                onClick={handleRegistrationToggle}
                                                                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold transition-all hover:opacity-80 cursor-pointer ${statusInfo.class}`}
                                                                                title="Klik untuk mengubah status pendaftaran"
                                                                            >
                                                                                <i className="fas fa-door-open mr-1 text-xs"></i>
                                                                                {statusInfo.label}
                                                                            </button>
                                                                        ) : (
                                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.class}`}>
                                                                                {statusInfo.label}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    {(isCreator || isAdmin) && (
                                                                        <td className="px-6 py-2 whitespace-nowrap text-center text-sm font-medium">
                                                                            {canManage && (
                                                                                <div className="flex items-center justify-center gap-1.5">
                                                                                    {canManage && (
                                                                                        <a href={`/activity/${activity.id}/preparation`} target="_blank" rel="noopener noreferrer"
                                                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 hover:bg-purple-200 text-primary transition-all duration-200 hover:scale-110"
                                                                                            title="Manajemen Acara">
                                                                                            <i className="fas fa-tasks text-xs"></i>
                                                                                        </a>
                                                                                    )}

                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={handlePinToggle}
                                                                                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${activity.hero_pinned ? 'bg-amber-200 text-amber-700' : 'bg-gray-100 text-gray-600'} hover:scale-110 transition-all duration-200`}
                                                                                        title={activity.hero_pinned ? 'Unpin dari Hero' : 'Pin ke Hero'}
                                                                                    >
                                                                                        <i className="fas fa-thumbtack text-xs"></i>
                                                                                    </button>

                                                                                    {canManage && (
                                                                                        <Link
                                                                                            href={route('activity.edit', activity.id)}
                                                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-600 transition-all duration-200 hover:scale-110"
                                                                                            title="Edit"
                                                                                        >
                                                                                            <i className="fas fa-edit text-xs"></i>
                                                                                        </Link>
                                                                                    )}

                                                                                    {canDelete && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={handleDelete}
                                                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-all duration-200 hover:scale-110"
                                                                                            title="Hapus"
                                                                                        >
                                                                                            <i className="fas fa-trash text-xs"></i>
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </td>
                                                                    )}
                                                                </>
                                                            )}
                                                        </tr>
                                                    );

                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="10" className="px-6 py-12 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <div className="bg-gray-100 rounded-full p-6 mb-4">
                                                                <i className="fas fa-calendar-alt text-4xl text-gray-400"></i>
                                                            </div>
                                                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada aktivitas</h3>
                                                            <p className="text-gray-600 mb-4">Belum ada aktivitas yang ditambahkan</p>
                                                            {user && (isCreator || isAdmin) && (
                                                                <Link 
                                                                    href={route('activity.create')} 
                                                                    className="inline-flex items-center px-4 py-2 bg-secondary hover:bg-blue-700 text-white rounded-lg transition-all"
                                                                >
                                                                    <i className="fas fa-plus mr-2"></i>
                                                                    Tambah Aktivitas Pertama
                                                                </Link>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination */}
                            {paginationLinks && paginationLinks.length > 3 && (
                                <div className="mt-8 flex justify-center">
                                    <div className="flex flex-wrap gap-1">
                                        {paginationLinks.map((link, key) => (
                                            link.url ? (
                                                <Link
                                                    key={key}
                                                    href={link.url}
                                                    className={`px-3 py-1 border rounded ${link.active ? 'bg-secondary text-white border-secondary' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ) : (
                                                <span
                                                    key={key}
                                                    className="px-3 py-1 border rounded bg-gray-100 text-gray-400"
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            )
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

