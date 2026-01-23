import React from 'react';

export default function OwnerSection({ owners, activity }) {
    return (
        <div className="bg-white overflow-hidden shadow-xl sm:rounded-lg mb-6">
            <div className="p-6 bg-white border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Penanggung Jawab Kegiatan</h3>
                <div className="flex flex-wrap gap-4">
                    {owners.map((owner) => (
                        <div key={owner.id} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3 border border-gray-100 shadow-sm">
                            <div className="flex-shrink-0">
                                <img 
                                    className="h-10 w-10 rounded-full object-cover" 
                                    src={owner.profile_photo_url} 
                                    alt={owner.name} 
                                />
                            </div>
                            <div>
                                <div className="text-sm font-medium text-gray-900">{owner.name}</div>
                                <div className="text-xs text-gray-500">{owner.email}</div>
                                {owner.id === activity.user_id && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary mt-1">
                                        Creator
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                    {owners.length === 0 && (
                        <p className="text-sm text-gray-500">Belum ada penanggung jawab.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

