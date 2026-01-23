import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function DashboardUser({ auth, stats = {}, joinedActivityUsers = [] }) {
    const user = auth?.user;
    const role = (user?.role || 'guest').toLowerCase();
    const canUpgrade = !['creator', 'admin', 'superadmin'].includes(role);

    const { post, processing } = useForm();

    const handleUpgrade = (e) => {
        e.preventDefault();
        post(route('profile.upgrade-to-creator'));
    };

    const getStatusBadgeClass = (status) => {
        const STATUS_ACTIVE = 1;
        const STATUS_VERIFICATION = 0;
        const STATUS_REJECTED = 2;

        switch (status) {
            case STATUS_ACTIVE:
                return 'bg-emerald-100 text-emerald-700';
            case STATUS_VERIFICATION:
                return 'bg-amber-100 text-amber-700';
            case STATUS_REJECTED:
                return 'bg-rose-100 text-rose-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusText = (status) => {
        const STATUS_ACTIVE = 1;
        const STATUS_VERIFICATION = 0;
        const STATUS_REJECTED = 2;

        switch (status) {
            case STATUS_ACTIVE:
                return 'Aktif';
            case STATUS_VERIFICATION:
                return 'Menunggu Verifikasi';
            case STATUS_REJECTED:
                return 'Ditolak';
            default:
                return 'Unknown';
        }
    };

    const getActivityImage = (activity) => {
        if (activity?.image) {
            const cleanPath = activity.image.replace('activities/', '');
            return `/storage/activities/${cleanPath}`;
        }
        return '/assets/images/begron/defoult.png';
    };

    return (
        <MainLayout>
            <Head title="Aktivitas Saya" />

            <div className="bg-gray-50 min-h-screen py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-gray-900 text-2xl font-semibold mb-4">Aktivitas Saya</h2>

                    {/* Upgrade to Creator Banner */}
                    {canUpgrade && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-start">
                                <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-amber-100 text-amber-700 mr-3 flex-shrink-0">
                                    <i className="fas fa-star"></i>
                                </span>
                                <div>
                                    <div className="text-sm font-semibold text-amber-800">Upgrade ke Creator</div>
                                    <div className="text-sm text-amber-900">Buka akses untuk membuat dan mengelola aktivitas Anda sendiri.</div>
                                </div>
                            </div>
                            <form onSubmit={handleUpgrade}>
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-md shadow hover:bg-emerald-700 transition disabled:opacity-50"
                                >
                                    <i className="fas fa-arrow-up mr-2"></i>
                                    {processing ? 'Memproses...' : 'Upgrade ke Creator'}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <div className="bg-sky-50 rounded-lg p-4 shadow-sm border border-sky-200 animate-fadeInUp" style={{ animationDelay: '0s' }}>
                            <div className="text-xs font-medium text-sky-700 mb-1">Total Ikut Kegiatan</div>
                            <div className="text-2xl font-bold text-sky-900">{stats.totalActivitiesJoined || 0}</div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-4 shadow-sm border border-emerald-200 animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
                            <div className="text-xs font-medium text-emerald-700 mb-1">Status Aktif</div>
                            <div className="text-2xl font-bold text-emerald-900">{stats.active || 0}</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-4 shadow-sm border border-amber-200 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
                            <div className="text-xs font-medium text-amber-700 mb-1">Menunggu Verifikasi</div>
                            <div className="text-2xl font-bold text-amber-900">{stats.verification || 0}</div>
                        </div>
                        <div className="bg-rose-50 rounded-lg p-4 shadow-sm border border-rose-200 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
                            <div className="text-xs font-medium text-rose-700 mb-1">Ditolak</div>
                            <div className="text-2xl font-bold text-rose-900">{stats.rejected || 0}</div>
                        </div>
                    </div>

                    {/* Joined Activities */}
                    <div className="mt-2">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Kegiatan yang Diikuti</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {joinedActivityUsers.length > 0 ? (
                                joinedActivityUsers.map((au, index) => {
                                    const activity = au.activity;
                                    const batch = au.batch;
                                    const statusText = getStatusText(au.status);
                                    const badgeClass = getStatusBadgeClass(au.status);

                                    return (
                                        <div
                                            key={au.id || index}
                                            className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden animate-fadeInUp"
                                            style={{ animationDelay: `${0.1 + index * 0.05}s` }}
                                        >
                                            <div className="relative h-32 overflow-hidden bg-gradient-to-br from-teal-400 to-blue-500">
                                                <img
                                                    src={getActivityImage(activity)}
                                                    alt={activity?.name || 'Kegiatan'}
                                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = '/assets/images/begron/defoult.png';
                                                    }}
                                                />
                                            </div>
                                            <div className="p-4 flex flex-col gap-2">
                                                <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                                                    {activity?.name || '-'}
                                                    {batch?.name && activity?.batches_count > 1 && activity?.activity_type === 'batch' && (
                                                        <span> - {batch.name}</span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-600">{activity?.category?.name || '-'}</div>
                                                <div className="text-xs text-gray-600">
                                                    {batch?.start_date
                                                        ? new Date(batch.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                        : activity?.date
                                                            ? new Date(activity.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                            : '-'}
                                                </div>
                                                <div>
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${badgeClass}`}>
                                                        {statusText}
                                                    </span>
                                                </div>
                                                <div className="mt-2">
                                                    {activity && (
                                                        <Link
                                                            href={`${route('activity.show', activity.id)}${batch ? `?batch_id=${batch.id}` : ''}`}
                                                            className="inline-flex items-center px-3 py-1.5 bg-secondary hover:bg-blue-700 text-white text-xs rounded transition"
                                                        >
                                                            Detail
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="col-span-full px-4 py-6 text-center text-gray-600">
                                    Belum ada kegiatan diikuti
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeInUp {
                    animation: fadeInUp 0.6s ease-out forwards;
                    opacity: 0;
                }
            `}</style>
        </MainLayout>
    );
}

