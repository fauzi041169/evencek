import React from 'react';
import { Link } from '@inertiajs/react';

export default function ParticipantsSection({ participants, activity }) {
    // Safety check for activity
    // Relaxed check: use id (which is the uid string per database schema) if uid is null
    if (!activity || (!activity.uid && !activity.id)) {
        console.error('ParticipantsSection: activity prop is missing or invalid', activity);
        return null;
    }
    const activityUid = activity.uid || activity.id;

    // Show only first 5 or 10 participants
    const displayParticipants = participants.slice(0, 10);

    return (
        <div className="p-6 bg-white">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Peserta Terdaftar ({participants.length})</h3>
                <Link
                    href={route('activity.participants.index', { activityId: activityUid })}
                    className="text-sm text-primary hover:text-indigo-900 font-medium"
                >
                    Lihat Semua &rarr;
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {displayParticipants.map((p) => (
                            <tr key={p.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {p.user ? p.user.name : p.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {p.user ? p.user.email : p.email}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {p.status === 'paid' ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Lunas
                                        </span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                            Pending
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {participants.length === 0 && (
                            <tr>
                                <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500">
                                    Belum ada peserta terdaftar.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

