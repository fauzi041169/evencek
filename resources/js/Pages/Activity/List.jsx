import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

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
    const [perPage, setPerPage] = useState(filters?.per_page || '10');

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
                    { search: searchTerm, category: selectedCategory, per_page: perPage },
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
            { search: searchTerm, category: categoryId, per_page: perPage },
            { preserveState: true, replace: true }
        );
    };

    const handlePerPageChange = (e) => {
        const value = e.target.value;
        setPerPage(value);
        router.get(
            route('activity.list'),
            { search: searchTerm, category: selectedCategory, per_page: value },
            { preserveState: true, replace: true }
        );
    };

    // Helper to get data array whether it's paginated or collection
    const activityList = latestActivities.data || latestActivities;
    const paginationLinks = latestActivities.links;

    // Helper for date formatting
    const formatDateRange = (start, end) => {
        if (!start) return '';
        const startDate = new Date(start);
        const endDate = end ? new Date(end) : null;

        if (endDate && endDate > startDate) {
            if (startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear()) {
                return `${format(startDate, 'd')} - ${format(endDate, 'd MMMM yyyy', { locale: id })}`;
            }
            return `${format(startDate, 'd MMMM')} - ${format(endDate, 'd MMMM yyyy', { locale: id })}`;
        }
        return format(startDate, 'd MMMM yyyy', { locale: id });
    };

    return (
        <MainLayout noPadding={true}>
            <Head title={title || "Daftar Aktivitas"} />

            <div className="py-2 sm:py-6">
                <div className="w-full">
                    <div className="bg-white overflow-hidden shadow-sm">

                        <div className="p-0 sm:p-6 bg-white border-b border-gray-200">

                            {/* Header & Filters Section */}
                            <div className="flex flex-row items-center gap-2 px-2 py-2 sm:px-0 sm:py-0 mb-0 sm:mb-6 overflow-x-auto">
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
                                <div className="min-w-[100px] shrink-0">
                                    <select
                                        className="w-full border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 rounded-md shadow-sm"
                                        value={perPage}
                                        onChange={handlePerPageChange}
                                    >
                                        <option value="10">10 Baris</option>
                                        <option value="25">25 Baris</option>
                                        <option value="50">50 Baris</option>
                                        <option value="100">100 Baris</option>
                                        <option value="250">250 Baris</option>
                                        <option value="500">500 Baris</option>
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
                            <div className="bg-white rounded-none sm:rounded-b-xl shadow-xl overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead>
                                            <tr className="bg-indigo-600 text-white">
                                                <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider first:rounded-tl-lg">No</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Nama Aktivitas</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Kategori</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Tanggal</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Waktu</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Metode Pembayaran</th>
                                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Status</th>
                                                {user && (
                                                    <>
                                                        <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Pendaftaran</th>
                                                        {(isCreator || isAdmin) && (
                                                            <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider last:rounded-tr-lg">Aksi</th>
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
                                                    const isPublic = activity.status?.toLowerCase() === 'public';

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
                                                        Swal.fire({
                                                            title: 'Hapus Aktivitas?',
                                                            text: "Apakah Anda yakin ingin menghapus aktivitas ini?",
                                                            icon: 'warning',
                                                            showCancelButton: true,
                                                            confirmButtonColor: '#d33',
                                                            cancelButtonColor: '#3085d6',
                                                            confirmButtonText: 'Ya, Hapus!',
                                                            cancelButtonText: 'Batal'
                                                        }).then((result) => {
                                                            if (result.isConfirmed) {
                                                                router.delete(route('activity.destroy', activity.id), {
                                                                    preserveScroll: true,
                                                                    preserveState: true,
                                                                });
                                                            }
                                                        });
                                                    };

                                                    return (
                                                        <tr key={activity.id} className="hover:bg-blue-50 transition-colors duration-150">
                                                            <td className="px-1 sm:px-6 py-1 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                                                                {startIndex + index}
                                                            </td>
                                                            <td className="px-1 sm:px-6 py-1">
                                                                <div className="flex flex-col">
                                                                    <div className="text-sm font-semibold text-gray-900 max-w-md truncate" title={activity.name}>
                                                                        {activity.name}
                                                                    </div>
                                                                    {activity.activity_type !== 'non_batch' && activity.active_batch && (
                                                                        <span className="text-xs text-indigo-600 font-medium">
                                                                            {activity.active_batch.name}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-1 sm:px-6 py-1 whitespace-nowrap">
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary">
                                                                    {activity.category?.name || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-1 sm:px-6 py-1 whitespace-nowrap text-sm text-gray-600">
                                                                <div className="flex items-center">
                                                                    <i className="fas fa-calendar-alt mr-1.5 text-gray-400 text-xs"></i>
                                                                    {formatDateRange(activity.date, activity.end_date)}
                                                                </div>
                                                            </td>
                                                            <td className="px-1 sm:px-6 py-1 whitespace-nowrap text-sm text-gray-600">
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
                                                            <td className="px-1 sm:px-6 py-1 whitespace-nowrap">
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
                                                            <td className="px-1 sm:px-6 py-1 whitespace-nowrap">
                                                                {canManage ? (
                                                                    <div className="relative w-28">
                                                                        <select
                                                                            value={activity.status?.toLowerCase() || 'private'}
                                                                            onChange={(e) => handleStatusChange(e.target.value)}
                                                                            className={`appearance-none w-full pl-3 pr-8 py-1 rounded-full text-xs font-semibold cursor-pointer border-none focus:ring-0 text-center ${isPublic ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                                                                        >
                                                                            <option value="public">Public</option>
                                                                            <option value="private">Private</option>
                                                                        </select>
                                                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                                                            <i className="fas fa-chevron-down text-[10px]"></i>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className={`inline-flex justify-center w-28 py-1 rounded-full text-xs font-semibold ${isPublic ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                        {isPublic ? 'Public' : 'Private'}
                                                                    </span>
                                                                )}
                                                            </td>
                                                            {auth.user && (
                                                                <>
                                                                    <td className="px-1 sm:px-6 py-1 whitespace-nowrap">
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
                                                                        <td className="px-1 sm:px-6 py-1 whitespace-nowrap text-center text-sm font-medium">
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
                                                    <td colSpan="10" className="px-2 sm:px-6 py-2 sm:py-6 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <img
                                                                src="/images/empty-state.svg"
                                                                alt="No Data"
                                                                className="w-32 h-32 mb-4 opacity-50"
                                                                onError={(e) => {
                                                                    e.target.onerror = null;
                                                                    e.target.style.display = 'none';
                                                                    e.target.nextSibling.style.display = 'block';
                                                                }}
                                                            />
                                                            <div className="hidden mb-4">
                                                                <i className="fas fa-calendar-times text-6xl text-gray-300"></i>
                                                            </div>
                                                            <p className="text-gray-500 text-lg font-medium">Belum ada kegiatan</p>
                                                            <p className="text-gray-400 text-sm">Silakan buat kegiatan baru</p>
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
                                <div className="mt-4 sm:mt-8 flex justify-center">
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

