import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import AcaraLayout from '@/Layouts/AcaraLayout';

export default function IdCards({ auth, activity, participants, committees = [], designTypes = ['participant'] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectedType, setSelectedType] = useState(designTypes.includes('participant') ? 'participant' : (designTypes[0] || 'participant'));

    // Determine current data source
    const currentData = useMemo(() => {
        return selectedType === 'committee' ? committees : participants;
    }, [selectedType, committees, participants]);

    // Reset selection when type changes
    useMemo(() => {
        setSelectedIds(new Set());
    }, [selectedType]);

    // Filter data based on search term
    const filteredData = useMemo(() => {
        if (!searchTerm) return currentData;
        const lowerTerm = searchTerm.toLowerCase();
        return currentData.filter(p =>
            (p.user?.name || '').toLowerCase().includes(lowerTerm) ||
            (p.user?.email || '').toLowerCase().includes(lowerTerm)
        );
    }, [currentData, searchTerm]);

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
            const allIds = filteredData.map(p => p.user?.id).filter(id => id);
            setSelectedIds(new Set(allIds));
        } else {
            setSelectedIds(new Set());
        }
    };

    const isAllSelected = filteredData.length > 0 && Array.from(selectedIds).length >= filteredData.length;

    // Handle Print
    const handlePrint = () => {
        if (selectedIds.size === 0) {
            alert('Pilih minimal satu peserta untuk dicetak kartunya.');
            return;
        }
        const idsArray = Array.from(selectedIds);
        const url = `/activity/${activity.uid || activity.id}/print-cards-html/${selectedType}?users=${idsArray.join(',')}`;
        window.open(url, '_blank');
    };

    return (
        <AcaraLayout activity={activity} title={`Kartu Peserta - ${activity.name}`}>
            <Head title={`Kartu Peserta - ${activity.name}`} />

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Cetak Kartu Peserta</h1>
                        <p className="text-gray-500 text-sm mt-1">Pilih peserta yang ingin dicetak kartunya.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link
                            href={`/activity/${activity.uid || activity.id}/idcards/design`}
                            className="inline-flex items-center px-4 py-2 bg-primary hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
                        >
                            <i className="fas fa-pencil-alt mr-2"></i> Desain Kartu
                        </Link>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="w-full md:w-1/3 relative">
                        <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                        <input
                            type="text"
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Cari nama peserta..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Design Type Selector */}
                        {designTypes.length > 1 && (
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="text-sm border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 py-2 pl-3 pr-8"
                                title="Pilih Desain Kartu"
                            >
                                {designTypes.map(type => (
                                    <option key={type} value={type}>Desain: {type}</option>
                                ))}
                            </select>
                        )}
                        <span className="text-sm text-gray-600">Terpilih: <strong>{selectedIds.size}</strong></span>
                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={selectedIds.size === 0}
                            className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <i className="fas fa-print mr-2"></i> Cetak Kartu
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
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {selectedType === 'committee' ? 'Jabatan' : 'Provinsi'}
                                </th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Dicetak</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData.length > 0 ? (
                                filteredData.map((p, i) => (
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
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {selectedType === 'committee' ? (p.role || '-') : (p.user?.profile?.province?.name || '-')}
                                        </td>
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
                                        Tidak ada data ditemukan.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-4 text-xs text-gray-400 text-center">
                    Menampilkan {filteredData.length} dari {currentData.length} data total.
                </div>

            </div>
        </AcaraLayout>
    );
}

