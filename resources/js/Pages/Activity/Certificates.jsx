import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Pencil, Search, Printer } from 'lucide-react';
import AcaraLayout from '@/Layouts/AcaraLayout';

export default function Certificates({ auth, activity, participants }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());

    // Filter participants based on search term
    const filteredParticipants = useMemo(() => {
        if (!searchTerm) return participants;
        const lowerTerm = searchTerm.toLowerCase();
        return participants.filter(p =>
            (p.user?.name || '').toLowerCase().includes(lowerTerm) ||
            (p.user?.email || '').toLowerCase().includes(lowerTerm)
        );
    }, [participants, searchTerm]);

    // Handle Checkbox
    const toggleSelection = (userId) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedIds(newSelection);
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            const allIds = filteredParticipants.map(p => p.user?.id).filter(id => id);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const isAllSelected = filteredParticipants.length > 0 && Array.from(selectedIds).length >= filteredParticipants.length;

    // Handle Print
    const handlePrint = () => {
        if (selectedIds.size === 0) {
            Swal.fire({
                title: 'Pilih Peserta',
                text: 'Pilih minimal satu peserta untuk dicetak sertifikatnya.',
                icon: 'warning',
                confirmButtonColor: '#3085d6'
            });
            return;
        }
        const idsArray = Array.from(selectedIds);
        const url = `/activity/${activity.uid || activity.id}/print-certificates-html?users=${idsArray.join(',')}`;
        window.open(url, '_blank');
    };

    return (
        <AcaraLayout
            title={`Cetak Sertifikat - ${activity.name}`}
            activity={activity}
        >
            <div className="bg-gray-50 min-h-screen p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Cetak Sertifikat</h1>
                        <p className="text-gray-500 text-sm mt-1">Pilih peserta yang ingin dicetak sertifikatnya.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href={`/activity/${activity.uid || activity.id}/custom-certificate`}
                            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
                        >
                            <Pencil className="w-4 h-4 mr-2" /> Desain Sertifikat
                        </Link>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="w-full md:w-1/3 relative">
                        <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Cari nama peserta..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Terpilih: <strong>{selectedIds.size}</strong></span>
                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={selectedIds.size === 0}
                            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            <Printer className="w-4 h-4 mr-2" /> Cetak Sertifikat
                        </button>
                    </div>
                </div>

                            {/* Table */}
                            <div className="overflow-x-auto rounded-lg border border-gray-200">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3 text-center w-12">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-indigo-500"
                                                    onChange={toggleSelectAll}
                                                    checked={isAllSelected}
                                                />
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No</th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama Peserta</th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provinsi</th>
                                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Dicetak</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredParticipants.length > 0 ? (
                                            filteredParticipants.map((p, i) => (
                                                <tr key={p.id} className="hover:bg-gray-50 transition">
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-indigo-500"
                                                            checked={selectedIds.has(p.user?.id)}
                                                            onChange={() => toggleSelection(p.user?.id)}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{i + 1}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{p.user?.name || '-'}</div>
                                                        <div className="text-xs text-gray-500">{p.user?.email || ''}</div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{p.user?.profile?.province?.name || '-'}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                                        {p.print_count > 0 ? (
                                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                                {p.print_count}x
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">-</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-10 text-center text-gray-500">
                                                    Tidak ada peserta ditemukan.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 text-xs text-gray-400 text-center">
                                Menampilkan {filteredParticipants.length} dari {participants.length} peserta total.
                            </div>

            </div>
        </AcaraLayout>
    );
}

