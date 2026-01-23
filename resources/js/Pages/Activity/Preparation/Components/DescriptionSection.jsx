import React from 'react';

export default function DescriptionSection({ activity }) {
    return (
        <div className="bg-white overflow-hidden shadow-xl sm:rounded-lg">
            <div className="p-6 bg-white border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Deskripsi Kegiatan</h3>
                <div className="prose max-w-none text-gray-600">
                    {activity.description ? (
                        <div dangerouslySetInnerHTML={{ __html: activity.description }} />
                    ) : (
                        <p className="italic text-gray-400">Tidak ada deskripsi.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
