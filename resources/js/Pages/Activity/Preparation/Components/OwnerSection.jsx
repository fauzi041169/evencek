import React, { useState } from 'react';
import { usePage } from '@inertiajs/react';

export default function OwnerSection({ owners, activity, isEmbedded = false }) {
    const { auth } = usePage().props;

    const canAddOwner = auth.user && (
        auth.user.role === 'superadmin' ||
        auth.user.is_super_admin ||
        auth.user.roles?.some(r => r.name === 'SuperAdmin' || r.name === 'Admin')
    );

    const content = (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 border-l-4 border-primary pl-3">Penanggung Jawab</h3>
                {canAddOwner && (
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-add-owner-modal'))}
                        className="bg-primary/10 text-primary p-2 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                    >
                        <i className="fas fa-plus"></i>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {owners.map((owner) => (
                    <div key={owner.id} className="flex items-center p-3 bg-gray-50 rounded-2xl border border-gray-100 group hover:shadow-md transition-all">
                        <img
                            className="h-10 w-10 rounded-xl object-cover shrink-0"
                            src={owner.profile_photo_url}
                            alt={owner.name}
                            onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(owner.name)}`; }}
                        />
                        <div className="ml-3 min-w-0 flex-1">
                            <div className="text-sm font-bold truncate">{owner.name}</div>
                            <div className="text-xs text-gray-500 truncate">{owner.email}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    if (isEmbedded) return content;

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {content}
        </div>
    );
}
