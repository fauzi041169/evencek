import React, { useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function Index({ pengurus = [] }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState('');

    const filteredPengurus = useMemo(() => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) {
            return pengurus;
        }
        return pengurus.filter((item) => {
            const name = `${item.nama || ''} ${item.gelar || ''}`.toLowerCase();
            const email = (item.email || '').toLowerCase();
            const jabatan = (item.jabatan || '').toLowerCase();
            const divisi = (item.kode || '').toLowerCase();
            return (
                name.includes(keyword) ||
                email.includes(keyword) ||
                jabatan.includes(keyword) ||
                divisi.includes(keyword)
            );
        });
    }, [pengurus, search]);

    const handleDelete = (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus data ini?')) {
            return;
        }
        router.delete(route('pengurus.destroy', id));
    };

    return (
        <MainLayout>
            <Head title="List Pengurus" />
            <div className="min-h-screen bg-white py-4 px-4">
                <div className="w-full">
                    <div className="mb-4">
                        <div className="bg-gradient-custom rounded-t-xl shadow-lg px-5 py-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white flex items-center">
                                    <i className="fas fa-user-tie mr-2"></i>
                                    List Pengurus
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <input
                                            type="text"
                                            className="pl-9 pr-3 py-1.5 rounded-lg border-0 focus:ring-2 focus:ring-white/50 text-gray-900 placeholder-gray-500"
                                            placeholder="Cari pengurus..."
                                            autoComplete="off"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300"></i>
                                    </div>
                                    <Link
                                        href={route('pengurus.create')}
                                        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg transition-all flex items-center"
                                    >
                                        <i className="fas fa-plus mr-2 text-sm"></i>
                                        Tambah Pengurus
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Flash messages are handled globally */}


                    <div className="bg-white rounded-b-xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 table-activity">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                    <tr>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">No</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Nama</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Jabatan</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Divisi/Unit</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Periode</th>
                                        <th className="px-6 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredPengurus.length > 0 ? (
                                        filteredPengurus.map((item, index) => (
                                            <tr key={item.id} className="hover:bg-blue-50 transition-colors duration-150">
                                                <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {index + 1}
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap">
                                                    <div className="text-sm font-semibold text-gray-900">
                                                        {item.nama} {item.gelar}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                                                    {item.email || '-'}
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                                                    {item.jabatan}
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-secondary/10 text-secondary">
                                                        {item.kode}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-600">
                                                    {item.periode}
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap">
                                                    {item.is_active ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                                            Aktif
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                                            Tidak Aktif
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-2 whitespace-nowrap text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <Link
                                                            href={route('pengurus.edit', item.id)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-yellow-100 hover:bg-yellow-200 text-yellow-600 transition-all duration-200 hover:scale-110"
                                                            title="Edit"
                                                        >
                                                            <i className="fas fa-edit text-xs"></i>
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(item.id)}
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-all duration-200 hover:scale-110"
                                                            title="Hapus"
                                                        >
                                                            <i className="fas fa-trash text-xs"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8" className="px-6 py-12 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="bg-gray-100 rounded-full p-6 mb-4">
                                                        <i className="fas fa-user-tie text-4xl text-gray-400"></i>
                                                    </div>
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Tidak ada data</h3>
                                                    <p className="text-gray-600">Mulai dengan menambahkan pengurus baru</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

