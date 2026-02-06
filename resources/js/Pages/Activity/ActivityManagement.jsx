import React, { useState, useEffect } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function ActivityManagement({
    activities,
    selectedActivity,
    participants,
    attendances,
    title,
    titlepage,
    filters
}) {
    const [searchTerm, setSearchTerm] = useState(filters?.search || '');

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (selectedActivity && searchTerm !== (filters?.search || '')) {
                router.get(
                    route('activity.activitimanajemen', selectedActivity.id),
                    { search: searchTerm },
                    { preserveState: true, replace: true }
                );
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm, selectedActivity]);

    const handleActivityChange = (e) => {
        const activityId = e.target.value;
        if (activityId) {
            router.get(route('activity.activitimanajemen', activityId));
        } else {
            router.get(route('activity.activitimanajemen'));
        }
    };

    return (
        <MainLayout>
            <Head title={title || "Manajemen Aktivitas"} />

            <div className="py-12 bg-gray-50/50 min-h-screen">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
                        <div className="p-8 sm:p-10">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                                    {titlepage || "Manajemen Aktivitas"}
                                </h1>
                                <div className="flex-shrink-0">
                                    <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200">
                                        Admin Panel
                                    </span>
                                </div>
                            </div>

                            {/* Activity Selector */}
                            <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
                                <label className="block text-slate-700 text-sm font-bold mb-3">
                                    Pilih Aktivitas
                                </label>
                                <div className="relative">
                                    <select
                                        className="appearance-none w-full bg-white border border-slate-200 text-slate-700 py-3 px-4 pr-10 rounded-xl leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium cursor-pointer shadow-sm"
                                        value={selectedActivity?.id || ''}
                                        onChange={handleActivityChange}
                                    >
                                        <option value="">-- Silahkan Pilih Aktivitas --</option>
                                        {activities.map((activity) => (
                                            <option key={activity.id} value={activity.id}>
                                                {activity.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                        <i className="fas fa-chevron-down text-xs"></i>
                                    </div>
                                </div>
                            </div>

                            {selectedActivity && (
                                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                            <i className="fas fa-tasks text-xl"></i>
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800">{selectedActivity.name}</h2>
                                            <p className="text-sm text-slate-500">Detail Manajemen Aktivitas</p>
                                        </div>
                                    </div>

                                    {/* Participants Section */}
                                    <div>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                                <i className="fas fa-users text-indigo-500"></i>
                                                Daftar Peserta
                                                <span className="text-sm font-normal text-slate-400">({participants.length})</span>
                                            </h3>
                                            <div className="relative max-w-xs w-full">
                                                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                                                <input
                                                    type="text"
                                                    placeholder="Cari Peserta..."
                                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm outline-none"
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead>
                                                        <tr className="bg-indigo-600 text-white">
                                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs first:rounded-tl-2xl text-center">No</th>
                                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Nama</th>
                                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs">Email</th>
                                                            <th className="px-6 py-4 font-bold uppercase tracking-wider text-xs last:rounded-tr-2xl text-center">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {participants.length > 0 ? (
                                                            participants.map((participant, index) => (
                                                                <tr key={participant.id} className="hover:bg-indigo-50/50 transition-colors duration-150">
                                                                    <td className="px-6 py-4 text-center font-medium text-slate-500">{index + 1}</td>
                                                                    <td className="px-6 py-4 font-semibold text-slate-700">{participant.name}</td>
                                                                    <td className="px-6 py-4 text-slate-500">{participant.email}</td>
                                                                    <td className="px-6 py-4 text-center">
                                                                        <button className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                                                                            Lihat Profil
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        ) : (
                                                            <tr>
                                                                <td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic">
                                                                    <div className="flex flex-col items-center">
                                                                        <i className="fas fa-user-slash text-2xl mb-2 opacity-20"></i>
                                                                        Tidak ada peserta ditemukan.
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Attendances Section */}
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                            <i className="fas fa-clipboard-check text-indigo-500"></i>
                                            Sesi Absensi
                                        </h3>
                                        {attendances.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {attendances.map((attendance) => (
                                                    <div key={attendance.id} className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="font-bold text-slate-800 text-lg group-hover:text-indigo-600 transition-colors">{attendance.title}</div>
                                                            <Link
                                                                href={route('activity.scan', [selectedActivity.id, attendance.id])}
                                                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 text-sm font-bold"
                                                            >
                                                                <i className="fas fa-qrcode"></i>
                                                                Scan
                                                            </Link>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {attendance.jenis_absen.split(',').map((type, i) => (
                                                                <span key={i} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-tighter">
                                                                    {type}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-slate-50 rounded-2xl p-10 text-center border border-dashed border-slate-200">
                                                <i className="fas fa-calendar-times text-3xl text-slate-300 mb-3"></i>
                                                <p className="text-slate-500 font-medium">Belum ada sesi absensi untuk aktivitas ini.</p>
                                            </div>
                                        )}
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

