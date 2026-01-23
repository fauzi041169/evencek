import React from 'react';
import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function DashboardCreator({
    auth,
    stats = {},
    monthlyLabels = [],
    monthlyActivities = [],
    monthlyParticipants = [],
    upcomingActivities = [],
    topActivities = []
}) {
    return (
        <MainLayout>
            <Head title="Dashboard Creator" />

            <div className="bg-gray-900 min-h-screen py-6">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h2 className="text-gray-100 text-xl font-semibold mb-6">Dashboard Creator</h2>

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                            <div className="text-gray-400 text-sm font-medium mb-2">Total Aktivitas</div>
                            <div className="text-4xl font-bold text-white">{stats.totalActivities || 0}</div>
                            <div className="text-xs text-gray-400 mt-1">
                                Growth: <span className={stats.activityGrowth >= 0 ? 'text-green-400' : 'text-red-400'}>{stats.activityGrowth || 0}%</span>
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                            <div className="text-gray-400 text-sm font-medium mb-2">Peserta Aktif</div>
                            <div className="text-4xl font-bold text-white">{stats.activeParticipants || 0}</div>
                            <div className="text-xs text-gray-400 mt-1">
                                Total: {stats.totalParticipants || 0}
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                            <div className="text-gray-400 text-sm font-medium mb-2">Pembayaran Terverifikasi</div>
                            <div className="text-4xl font-bold text-white">{stats.approvedPayments || 0}</div>
                            <div className="text-xs text-gray-400 mt-1">
                                Nominal: Rp {(stats.totalPaymentAmount || 0).toLocaleString('id-ID')}
                            </div>
                        </div>
                    </div>

                    {/* Monthly Trends */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                            <div className="text-gray-300 font-semibold mb-4">Aktivitas per Bulan</div>
                            <ul className="space-y-2">
                                {monthlyLabels.map((label, i) => (
                                    <li key={i} className="flex justify-between py-1.5 border-b border-gray-700 last:border-0">
                                        <span className="text-gray-400 text-sm">{label}</span>
                                        <span className="font-semibold text-white">{monthlyActivities[i] || 0}</span>
                                    </li>
                                ))}
                                {monthlyLabels.length === 0 && (
                                    <li className="text-gray-500 text-center py-4">Belum ada data</li>
                                )}
                            </ul>
                        </div>
                        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                            <div className="text-gray-300 font-semibold mb-4">Peserta per Bulan</div>
                            <ul className="space-y-2">
                                {monthlyLabels.map((label, i) => (
                                    <li key={i} className="flex justify-between py-1.5 border-b border-gray-700 last:border-0">
                                        <span className="text-gray-400 text-sm">{label}</span>
                                        <span className="font-semibold text-white">{monthlyParticipants[i] || 0}</span>
                                    </li>
                                ))}
                                {monthlyLabels.length === 0 && (
                                    <li className="text-gray-500 text-center py-4">Belum ada data</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Upcoming Activities */}
                    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700 mb-6">
                        <div className="text-gray-300 font-semibold mb-4">Aktivitas Mendatang</div>
                        <ul className="divide-y divide-gray-700">
                            {upcomingActivities.length > 0 ? (
                                upcomingActivities.map((act, i) => (
                                    <li key={act.id || i} className="py-3 flex justify-between items-center">
                                        <div>
                                            <div className="text-white font-medium">{act.name}</div>
                                            <div className="text-xs text-gray-400">
                                                {act.category?.name || '-'} â€¢{' '}
                                                {act.date
                                                    ? new Date(act.date).toLocaleDateString('id-ID', {
                                                          day: 'numeric',
                                                          month: 'short',
                                                          year: 'numeric'
                                                      })
                                                    : '-'}
                                            </div>
                                        </div>
                                        <Link
                                            href={route('activity.show', act.id)}
                                            className="px-3 py-1.5 bg-secondary hover:bg-blue-700 text-white text-xs rounded-md transition"
                                        >
                                            Detail
                                        </Link>
                                    </li>
                                ))
                            ) : (
                                <li className="py-4 text-gray-500 text-center">Tidak ada aktivitas mendatang</li>
                            )}
                        </ul>
                    </div>

                    {/* Top Activities */}
                    <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                        <div className="text-gray-300 font-semibold mb-4">Top Aktivitas berdasar Peserta Aktif</div>
                        <ul className="divide-y divide-gray-700">
                            {topActivities.length > 0 ? (
                                topActivities.map((act, i) => (
                                    <li key={act.id || i} className="py-3 flex justify-between items-center">
                                        <div>
                                            <div className="text-white font-medium">{act.name}</div>
                                            <div className="text-xs text-gray-400">
                                                Kategori: {act.category?.name || '-'}
                                            </div>
                                        </div>
                                        <span className="text-xs text-gray-400">
                                            Peserta aktif:{' '}
                                            <span className="font-semibold text-white">{act.participants_count || 0}</span>
                                        </span>
                                    </li>
                                ))
                            ) : (
                                <li className="py-4 text-gray-500 text-center">Belum ada data</li>
                            )}
                        </ul>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

