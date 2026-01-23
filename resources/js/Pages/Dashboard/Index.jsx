import React, { useState, useEffect } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardIndex(props) {
    const {
        stats,
        activityData,
        activityTrend,
        userVisitTrend,
        trendDual,
        newsPerformance,
        demographics,
        globalDistribution,
        categoryData,
        statusData,
        recentActivities,
        participationData,
        profileStats,
        usersWithProfile,
        usersWithoutProfile,
        activities,
        selectedActivity,
        provinces,
        selectedProvince,
        paymentStatusData,
        attendanceTypeData,
        subscriptionStats,
        subscriptionByPlan,
        activityRatingData,
        topActiveUsers,
        topRatedActivities,
        topDailyActiveUsers,
        topCreators,
        showTopActiveUsers = true,
        showTopRatedActivities = true,
        showTopCreators = true,
        showSubscriptionCards = true,
        creatorActiveTrend
    } = props;

    // Charts Configuration
    const trendUserOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: false }
        },
        maintainAspectRatio: false
    };

    const trendUserData = {
        labels: userVisitTrend?.labels || [],
        datasets: [
            {
                label: 'Kunjungan User',
                data: userVisitTrend?.data || [],
                borderColor: 'rgb(53, 162, 235)',
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
                tension: 0.3,
                fill: true
            }
        ]
    };

    const totalUserOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' }
        }
    };

    const totalUserData = {
        labels: ['Dengan Profil', 'Tanpa Profil'],
        datasets: [
            {
                data: [usersWithProfile || 0, usersWithoutProfile || 0],
                backgroundColor: ['#10B981', '#E5E7EB'],
                borderWidth: 0,
            },
        ],
    };

    const activityTrendOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top' }
        }
    };

    const activityTrendData = {
        labels: trendDual?.labels || [],
        datasets: [
            {
                label: 'Input (Aktivitas)',
                data: trendDual?.input || [],
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
            },
            {
                label: 'Output (Berita)',
                data: trendDual?.output || [],
                backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
        ],
    };

    const subscriptionStatusData = {
        labels: ['Aktif', 'Pending', 'Batal', 'Kadaluarsa'],
        datasets: [
            {
                data: [
                    subscriptionStats?.active || 0,
                    subscriptionStats?.pending || 0,
                    subscriptionStats?.cancelled || 0,
                    subscriptionStats?.expired || 0
                ],
                backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
                borderWidth: 0
            }
        ]
    };

    const subscriptionTypeData = {
        labels: subscriptionByPlan?.labels || [],
        datasets: [
            {
                data: subscriptionByPlan?.data || [],
                backgroundColor: ['#3B82F6', '#8B5CF6', '#EC4899', '#6366F1'],
                borderWidth: 0
            }
        ]
    };
    
    const userProvinceOptions = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
    };

    const userProvinceData = {
        labels: profileStats?.region?.labels || [],
        datasets: [
            {
                label: 'User per Wilayah',
                data: profileStats?.region?.data || [],
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            }
        ]
    };

    const creatorActiveTrendData = {
        labels: creatorActiveTrend?.labels || [],
        datasets: [
            {
                label: 'User Aktif',
                data: creatorActiveTrend?.data || [],
                borderColor: '#10B981',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                tension: 0.3,
                fill: true
            }
        ]
    };

    return (
        <MainLayout>
            <Head title="Dashboard" />

            <div className="py-6">
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    
                    {/* Row 1: User Visit Trend + Total User */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                        <div className="lg:col-span-9">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-full">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-bold text-gray-800">TREN KUNJUNGAN USER</h3>
                                </div>
                                <div className="h-64">
                                    <Line options={trendUserOptions} data={trendUserData} />
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
                                <h3 className="font-bold text-gray-800 text-center mb-4">TOTAL USER</h3>
                                <div className="h-48 flex-grow">
                                    <Doughnut options={totalUserOptions} data={totalUserData} />
                                </div>
                                <div className="mt-4 text-center">
                                    <span className="text-2xl font-bold text-gray-900">{stats?.totalUsers || 0}</span>
                                    <span className="text-sm text-gray-500 block">Total Pengguna</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Row 2: Activity Trend + Subscription Stats / Creator Trend */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
                        <div className="lg:col-span-9">
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-full">
                                <h3 className="font-bold text-gray-800 mb-4">TREN KEGIATAN</h3>
                                <div className="h-64">
                                    <Bar options={activityTrendOptions} data={activityTrendData} />
                                </div>
                            </div>
                        </div>
                        <div className="lg:col-span-3">
                            <div className="h-full">
                                {showSubscriptionCards ? (
                                    <div className="grid grid-cols-1 gap-6 h-full">
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 h-full">
                                            <h3 className="font-bold text-gray-800 text-center mb-2 text-sm">STATUS LANGGANAN</h3>
                                            <div className="h-32">
                                                <Doughnut options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} data={subscriptionStatusData} />
                                            </div>
                                            <div className="flex justify-center gap-2 mt-2 flex-wrap text-xs">
                                                <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-green-500 mr-1"></span>Aktif</div>
                                                <div className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></span>Pending</div>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 h-full">
                                            <h3 className="font-bold text-gray-800 text-center mb-2 text-sm">JENIS LANGGANAN</h3>
                                            <div className="h-32">
                                                <Doughnut options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }} data={subscriptionTypeData} />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 h-full">
                                        <h3 className="font-bold text-gray-800 text-center mb-4">TREN USER AKTIF</h3>
                                        <div className="h-64">
                                            <Line options={{ maintainAspectRatio: false }} data={creatorActiveTrendData} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Row 3: User by Province */}
                    <div className="mb-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                             <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800">USER BERDASARKAN PROVINSI</h3>
                            </div>
                            <div className="h-80">
                                <Bar options={userProvinceOptions} data={userProvinceData} />
                            </div>
                        </div>
                    </div>

                    {/* Row 4: Lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Top Active Users */}
                        {showTopActiveUsers && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-0 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-800">10 USER TERAKTIF</h3>
                            </div>
                            <div className="p-0">
                                <ul className="divide-y divide-gray-100">
                                    {(topActiveUsers || []).map((u, i) => (
                                        <li key={i} className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition">
                                            <div className="flex items-center gap-3">
                                                <img 
                                                    src={u.photo ? `/assets/images/profilefoto/${u.photo}` : '/assets/images/profilefoto/default-profile.png'} 
                                                    alt={u.name}
                                                    className="w-8 h-8 rounded-full object-cover"
                                                    onError={(e) => {e.target.src = '/assets/images/profilefoto/default-profile.png'}}
                                                />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{i+1}. {u.name}</div>
                                                    <span className="inline-block px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 text-[10px] font-bold">AKTIF</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-gray-900">{u.total}</div>
                                                <div className={`text-xs ${u.delta > 0 ? 'text-green-500' : (u.delta < 0 ? 'text-red-500' : 'text-gray-400')}`}>
                                                    {u.delta > 0 ? '▲' : (u.delta < 0 ? '▼' : '▬')} {Math.abs(u.delta)}
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                    {(!topActiveUsers || topActiveUsers.length === 0) && <li className="px-6 py-4 text-gray-500 text-center">Belum ada data</li>}
                                </ul>
                            </div>
                        </div>
                        )}

                        {/* Top Rated Activities */}
                        {showTopRatedActivities && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <h3 className="font-bold text-gray-800 mb-4">5 AKTIVITAS RATING TERTINGGI</h3>
                            <ul className="space-y-3 mb-6">
                                {(topRatedActivities || []).map((a, i) => (
                                    <li key={i} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-700 truncate w-3/4">{i+1}. {a.name}</span>
                                        <span className="font-bold bg-yellow-100 text-yellow-700 px-2 py-1 rounded">{Number(a.rating).toFixed(1)}</span>
                                    </li>
                                ))}
                                {(!topRatedActivities || topRatedActivities.length === 0) && <li className="text-gray-500 text-center">Belum ada data</li>}
                            </ul>

                            <div className="pt-4 border-t border-gray-100">
                                <h4 className="font-bold text-gray-800 text-sm mb-3">10 USER TERAKTIF HARI INI</h4>
                                <ul className="space-y-2">
                                    {(topDailyActiveUsers || []).map((u, i) => (
                                        <li key={i} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-gray-700 truncate max-w-[120px]">{u.name}</span>
                                            </div>
                                            <span className="font-semibold text-gray-900">{u.total}</span>
                                        </li>
                                    ))}
                                     {(!topDailyActiveUsers || topDailyActiveUsers.length === 0) && <li className="text-gray-500 text-center text-xs">Belum ada data hari ini</li>}
                                </ul>
                            </div>
                        </div>
                        )}

                        {/* Top Creators */}
                        {showTopCreators && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-0 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h3 className="font-bold text-gray-800">10 CREATOR TERBAIK</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3">Author</th>
                                            <th className="px-4 py-3 text-right">Akt.</th>
                                            <th className="px-4 py-3 text-right">Peserta</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(topCreators || []).map((c, i) => (
                                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    <div className="flex items-center gap-2">
                                                        <img 
                                                            src={c.photo ? `/assets/images/profilefoto/${c.photo}` : '/assets/images/profilefoto/default-profile.png'} 
                                                            alt={c.name}
                                                            className="w-7 h-7 rounded-full object-cover"
                                                            onError={(e) => {e.target.src = '/assets/images/profilefoto/default-profile.png'}}
                                                        />
                                                        <div className="truncate max-w-[80px] sm:max-w-none">{c.name}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">{c.activities_active || c.activities_all || 0}</td>
                                                <td className="px-4 py-3 text-right">{c.participants_active || c.participants_total || 0}</td>
                                            </tr>
                                        ))}
                                        {(!topCreators || topCreators.length === 0) && (
                                            <tr><td colSpan="3" className="px-4 py-3 text-center text-gray-500">Belum ada data</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        )}
                    </div>

                </div>
            </div>
        </MainLayout>
    );
}
