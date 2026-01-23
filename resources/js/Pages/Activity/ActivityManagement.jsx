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
             
             <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <div className="bg-white overflow-hidden shadow-sm sm:rounded-lg">
                        <div className="p-6 bg-white border-b border-gray-200">
                             <h2 className="text-2xl font-bold text-gray-800 mb-6">{titlepage || "Manajemen Aktivitas"}</h2>
                             
                             {/* Activity Selector */}
                             <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-bold mb-2">
                                    Pilih Aktivitas
                                </label>
                                <select
                                    className="shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    value={selectedActivity?.id || ''}
                                    onChange={handleActivityChange}
                                >
                                    <option value="">-- Pilih Aktivitas --</option>
                                    {activities.map((activity) => (
                                        <option key={activity.id} value={activity.id}>
                                            {activity.name}
                                        </option>
                                    ))}
                                </select>
                             </div>

                             {selectedActivity && (
                                 <div>
                                     <h3 className="text-xl font-semibold mb-4">Detail: {selectedActivity.name}</h3>
                                     
                                     {/* Search Participants */}
                                     <div className="mb-4">
                                        <input
                                            type="text"
                                            placeholder="Cari Peserta..."
                                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                     </div>

                                     {/* Participants Table */}
                                     <div className="mb-8">
                                         <h4 className="text-lg font-medium mb-2">Peserta ({participants.length})</h4>
                                         <div className="overflow-x-auto">
                                             <table className="min-w-full divide-y divide-gray-200 border">
                                                 <thead className="bg-gray-50">
                                                     <tr>
                                                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                                                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                                     </tr>
                                                 </thead>
                                                 <tbody className="bg-white divide-y divide-gray-200">
                                                     {participants.length > 0 ? (
                                                         participants.map((participant) => (
                                                             <tr key={participant.id}>
                                                                 <td className="px-6 py-4 whitespace-nowrap">{participant.name}</td>
                                                                 <td className="px-6 py-4 whitespace-nowrap">{participant.email}</td>
                                                                 <td className="px-6 py-4 whitespace-nowrap">
                                                                     {/* Add actions if needed */}
                                                                 </td>
                                                             </tr>
                                                         ))
                                                     ) : (
                                                         <tr>
                                                             <td colSpan="3" className="px-6 py-4 text-center text-gray-500">Tidak ada peserta ditemukan.</td>
                                                         </tr>
                                                     )}
                                                 </tbody>
                                             </table>
                                         </div>
                                     </div>

                                     {/* Attendances List */}
                                     <div>
                                         <h4 className="text-lg font-medium mb-2">Sesi Absensi</h4>
                                         {attendances.length > 0 ? (
                                             <div className="overflow-x-auto">
                                                 <table className="min-w-full divide-y divide-gray-200 border">
                                                     <thead className="bg-gray-50">
                                                         <tr>
                                                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Judul</th>
                                                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Absen</th>
                                                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                                                         </tr>
                                                     </thead>
                                                     <tbody className="bg-white divide-y divide-gray-200">
                                                         {attendances.map((attendance) => (
                                                             <tr key={attendance.id}>
                                                                 <td className="px-6 py-4 whitespace-nowrap">{attendance.title}</td>
                                                                 <td className="px-6 py-4 whitespace-nowrap">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {attendance.jenis_absen.split(',').map((type, i) => (
                                                                            <span key={i} className="px-2 py-0.5 bg-secondary/10 text-blue-700 text-xs rounded">
                                                                                {type}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                 <td className="px-6 py-4 whitespace-nowrap">
                                                                     <Link 
                                                                         href={route('activity.scan', [selectedActivity.id, attendance.id])}
                                                                         className="text-primary hover:text-indigo-900"
                                                                     >
                                                                         Scan
                                                                     </Link>
                                                                 </td>
                                                             </tr>
                                                         ))}
                                                     </tbody>
                                                 </table>
                                             </div>
                                         ) : (
                                              <p className="text-gray-500">Belum ada sesi absensi.</p>
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

