import React from 'react';

export default function DescriptionSection({ activity }) {
    return (
        <div className="p-6 bg-white">
            <div className="prose max-w-none text-gray-600">
                {activity.description ? (
                    <div dangerouslySetInnerHTML={{ __html: activity.description }} />
                ) : (
                    <p className="italic text-gray-400">Tidak ada deskripsi.</p>
                )}
            </div>
        </div>
    );
}
