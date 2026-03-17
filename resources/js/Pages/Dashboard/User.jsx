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

    const DEFAULT_ACTIVITY_IMAGE = '/assets/images/hero/defoult.webp';
    const getActivityImage = (activity) => {
        if (!activity?.image) return DEFAULT_ACTIVITY_IMAGE;
        if (activity.image.startsWith('http') || activity.image.startsWith('/')) return activity.image;
        return `/storage/${activity.image.replace(/^storage\//, '')}`;
    };

    return (
        <MainLayout>
            <Head title="Aktivitas Saya" />

            <div className="bg-gray-50 min-h-screen py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-gray-900 text-2xl font-semibold mb-4">Aktivitas Saya</h2>

                    {/* Upgrade to Creator Banner (Premium Design) */}
                    {canUpgrade && (
                        <div className="relative overflow-hidden rounded-2xl shadow-lg mb-8 animate-fadeInUp">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-700"></div>
                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 40%)' }}></div>

                            {/* Decorative circles */}
                            <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
                            <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-pink-500 opacity-20 blur-3xl"></div>

                            <div className="relative p-4 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 z-10">
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-2xl font-bold text-white mb-2">
                                        Mulai Buat Eventmu Sendiri!
                                    </h3>
                                    <p className="text-indigo-100 text-lg max-w-xl">
                                        Upgrade akun kamu menjadi <span className="font-bold text-white">Creator</span> sekarang.
                                        Kelola peserta, sertifikat, dan absensi dengan mudah dan profesional.
                                    </p>
                                </div>
                                <div className="flex-shrink-0">
                                    <form onSubmit={handleUpgrade}>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="group relative inline-flex items-center justify-center px-8 py-3 bg-white text-indigo-700 font-bold rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-75 disabled:cursor-not-allowed"
                                        >
                                            {processing ? (
                                                <>
                                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    Memproses...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="mr-2">Upgrade Gratis Sekarang</span>
                                                    <i className="fas fa-rocket group-hover:translate-x-1 transition-transform"></i>
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>
                            </div>
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
                                                        e.target.src = DEFAULT_ACTIVITY_IMAGE;
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
                                                            href={`${route('activity.detail', activity.id)}${batch ? `?batch_id=${batch.id}` : ''}`}
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
