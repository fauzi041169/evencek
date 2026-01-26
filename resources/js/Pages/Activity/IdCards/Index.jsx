import React, { useState, useMemo } from 'react';
import { Head, Link } from '@inertiajs/react';
import Swal from 'sweetalert2';
import AcaraLayout from '@/Layouts/AcaraLayout';

export default function IdCards({ auth, activity, participants, committees = [], designTypes = ['participant'] }) {
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectedType, setSelectedType] = useState(designTypes.includes('participant') ? 'participant' : (designTypes[0] || 'participant'));

    // Filters state
    const [filters, setFilters] = useState({
        name: '',
        province: '',
        regency: '',
        district: '',
        role: ''
    });

    // Determine current data source
    const currentData = useMemo(() => {
        return selectedType === 'committee' ? committees : participants;
    }, [selectedType, committees, participants]);

    // Reset selection when type changes
    useMemo(() => {
        setSelectedIds(new Set());
    }, [selectedType]);

    // Filter data based on filters
    const filteredData = useMemo(() => {
        return currentData.filter(p => {
            const name = (p.user?.name || '').toLowerCase();
            const email = (p.user?.email || '').toLowerCase();
            const filterName = filters.name.toLowerCase();

            const nameMatch = !filterName || name.includes(filterName) || email.includes(filterName);
            const provinceMatch = !filters.province || (p.user?.profile?.province?.name || '').toLowerCase().includes(filters.province.toLowerCase());
            const regencyMatch = !filters.regency || (p.user?.profile?.regency?.name || '').toLowerCase().includes(filters.regency.toLowerCase());
            const districtMatch = !filters.district || (p.user?.profile?.district?.name || '').toLowerCase().includes(filters.district.toLowerCase());
            const roleMatch = selectedType !== 'committee' || !filters.role || (p.role || '').toLowerCase().includes(filters.role.toLowerCase());

            return nameMatch && provinceMatch && regencyMatch && districtMatch && roleMatch;
        });
    }, [currentData, filters, selectedType]);

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
            Swal.fire({
                title: 'Peringatan',
                text: 'Pilih minimal satu peserta untuk dicetak kartunya.',
                icon: 'warning',
                confirmButtonColor: '#3085d6',
            });
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
                <div className="flex flex-col md:flex-row justify-end items-center gap-4 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
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
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                                    Nama
                                    <input
                                        type="text"
                                        className="mt-1 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Filter Nama..."
                                        value={filters.name}
                                        onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                                    />
                                </th>
                                {selectedType === 'committee' && (
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Jabatan
                                        <input
                                            type="text"
                                            className="mt-1 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                            placeholder="Filter Jabatan..."
                                            value={filters.role}
                                            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                                        />
                                    </th>
                                )}
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Provinsi
                                    <input
                                        type="text"
                                        className="mt-1 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Filter Provinsi..."
                                        value={filters.province}
                                        onChange={(e) => setFilters({ ...filters, province: e.target.value })}
                                    />
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Kabupaten/Kota
                                    <input
                                        type="text"
                                        className="mt-1 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Filter Kab/Kota..."
                                        value={filters.regency}
                                        onChange={(e) => setFilters({ ...filters, regency: e.target.value })}
                                    />
                                </th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Kecamatan
                                    <input
                                        type="text"
                                        className="mt-1 block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Filter Kecamatan..."
                                        value={filters.district}
                                        onChange={(e) => setFilters({ ...filters, district: e.target.value })}
                                    />
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
                                        {selectedType === 'committee' && (
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                                {p.role || '-'}
                                            </td>
                                        )}
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {p.user?.profile?.province?.name || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {p.user?.profile?.regency?.name || '-'}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {p.user?.profile?.district?.name || '-'}
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
                                    <td colSpan={selectedType === 'committee' ? 8 : 7} className="px-6 py-10 text-center text-gray-500">
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

