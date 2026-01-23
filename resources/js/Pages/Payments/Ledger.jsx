import React from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function Ledger({ entries = [], summary = {} }) {
    return (
        <MainLayout>
            <Head title="Neraca Keuangan" />
            <div className="min-h-screen bg-white py-8 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-green-600 text-white rounded-lg shadow-md p-6">
                            <div className="text-sm uppercase text-green-100">Total Pendapatan</div>
                            <div className="text-2xl font-bold">Rp {Number(summary.income || 0).toLocaleString('id-ID')}</div>
                        </div>
                        <div className="bg-red-600 text-white rounded-lg shadow-md p-6">
                            <div className="text-sm uppercase text-red-100">Total Pengeluaran</div>
                            <div className="text-2xl font-bold">Rp {Number(summary.expense || 0).toLocaleString('id-ID')}</div>
                        </div>
                        <div className="bg-teal-600 text-white rounded-lg shadow-md p-6">
                            <div className="text-sm uppercase text-teal-100">Saldo</div>
                            <div className="text-2xl font-bold">Rp {Number(summary.balance || 0).toLocaleString('id-ID')}</div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Tanggal</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Judul</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Deskripsi</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Kategori</th>
                                        <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700 uppercase">Nominal</th>
                                        <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {entries.length > 0 ? (
                                        entries.map((entry, index) => (
                                            <tr key={index}>
                                                <td className="px-4 py-2 text-sm text-gray-600">
                                                    {entry.date || '-'}
                                                </td>
                                                <td className="px-4 py-2 text-sm font-semibold text-gray-900">{entry.title}</td>
                                                <td className="px-4 py-2 text-sm text-gray-700">{entry.description}</td>
                                                <td className="px-4 py-2 text-sm">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${entry.category === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {entry.category === 'income' ? 'Pendapatan' : 'Pengeluaran'}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-2 text-sm text-right font-semibold ${entry.category === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                                                    Rp {Number(entry.amount || 0).toLocaleString('id-ID')}
                                                </td>
                                                <td className="px-4 py-2 text-sm text-gray-700">{entry.status || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                                                Belum ada transaksi untuk ditampilkan
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
