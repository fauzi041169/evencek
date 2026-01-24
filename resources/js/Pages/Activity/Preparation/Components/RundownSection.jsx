import React from 'react';

export default function RundownSection({ activity, rundowns }) {
    return (
        <div className="space-y-6 p-6 bg-white">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kegiatan</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PIC/Pengisi</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rundowns.map((item) => (
                            <tr key={item.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {item.start_time ? item.start_time.substring(0, 5) : ''} - {item.end_time ? item.end_time.substring(0, 5) : ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {item.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.pic || '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {item.location || '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                                    {item.description || '-'}
                                </td>
                            </tr>
                        ))}
                        {rundowns.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                                    Belum ada rundown acara.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
