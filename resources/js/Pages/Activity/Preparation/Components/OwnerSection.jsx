import React from 'react';
import { usePage, router } from '@inertiajs/react';
import { Users, Plus, Trash2 } from 'lucide-react';

export default function OwnerSection({ owners, activity, isEmbedded = false }) {
    const { auth } = usePage().props;

    const isSuperAdminOrAdmin = auth.user && (
        auth.user.role === 'superadmin' ||
        auth.user.is_super_admin ||
        auth.user.roles?.some(r => r.name === 'SuperAdmin' || r.name === 'Admin')
    );

    // Hanya admin/superadmin (atau nanti jika ingin: owner utama) yang bisa tambah/hapus owner
    const canManageOwners = !!isSuperAdminOrAdmin;

    const handleRemoveOwner = (owner) => {
        if (!canManageOwners) return;
        if (!window.confirm(`Hapus penanggung jawab "${owner.name}" dari kegiatan ini?`)) {
            return;
        }

        const activityId = activity.uid || activity.id;
        router.delete(route('activity.preparation.destroy-owner', { activityId, userId: owner.id }), {
            preserveScroll: true,
        });
    };

    const content = (
        <div className="p-8">
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">Penanggung Jawab</h3>
                        <p className="text-xs text-slate-500 font-medium pt-1">Person in Charge (PIC)</p>
                    </div>
                </div>
                {canManageOwners && (
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-add-owner-modal'))}
                        className="group flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100/50 hover:shadow-blue-200 hover:shadow-lg"
                        title="Tambah Penanggung Jawab"
                    >
                        <Plus className="w-5 h-5 transform group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                )}
            </div>

            <div className={`space-y-3 ${isEmbedded ? '' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
                {owners.map((owner) => (
                    <div key={owner.id} className="relative group flex items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300">
                        <div className="relative">
                            <img
                                className="h-10 w-10 rounded-xl object-cover shrink-0 ring-2 ring-slate-50 group-hover:ring-blue-100 transition-all"
                                src={owner.profile_photo_url}
                                alt={owner.name}
                                onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(owner.name)}`; }}
                            />
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full"></div>
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                            <div className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">{owner.name}</div>
                            <div className="text-xs text-slate-400 truncate font-medium">{owner.email}</div>
                        </div>
                        {canManageOwners && (
                            <button
                                type="button"
                                onClick={() => handleRemoveOwner(owner)}
                                className="ml-3 inline-flex items-center justify-center w-8 h-8 rounded-full text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Hapus Penanggung Jawab"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
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
