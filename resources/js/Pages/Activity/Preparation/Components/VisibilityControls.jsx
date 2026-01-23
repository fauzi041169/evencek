import React, { useState } from 'react';
import { router } from '@inertiajs/react';

export default function VisibilityControls({ activity }) {
    // Helper to toggle a specific field
    const toggleField = (field, currentValue) => {
        router.post(route('activity.preparation.update-settings', activity.id), {
            [field]: !currentValue,
            _method: 'PUT'
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // Optional: show toast
            }
        });
    };

    // Mapping for Detail Page controls
    const detailControls = [
        { 
            id: 'detail_description_visible', 
            label: 'Deskripsi', 
            icon: 'fa-eye', 
            iconOff: 'fa-eye-slash', 
            value: activity.detail_description_visible ?? true 
        },
        { 
            id: 'detail_gallery_visible', 
            label: 'Galeri', 
            icon: 'fa-eye', 
            iconOff: 'fa-eye-slash', 
            value: activity.detail_gallery_visible ?? true 
        },
        { 
            id: 'detail_comments_visible', 
            label: 'Rating & Komentar', 
            icon: 'fa-comments', 
            iconOff: 'fa-comment-slash', 
            value: activity.detail_comments_visible ?? true 
        },
        { 
            id: 'detail_participants_visible', 
            label: 'Peserta', 
            icon: 'fa-users', 
            iconOff: 'fa-users-slash', 
            value: activity.detail_participants_visible ?? true 
        },
    ];

    // Mapping for Show Page controls
    const showControls = [
        { 
            id: 'show_gallery', 
            label: 'Galeri', 
            icon: 'fa-eye', 
            iconOff: 'fa-eye-slash', 
            value: activity.show_gallery 
        },
        { 
            id: 'id_card_visible', 
            label: 'ID Card', 
            icon: 'fa-id-card', 
            iconOff: 'fa-id-card-slash', 
            value: activity.id_card_visible ?? true 
        },
        { 
            id: 'certificate_visible', 
            label: 'Sertifikat', 
            icon: 'fa-certificate', 
            iconOff: 'fa-eye-slash', 
            value: activity.certificate_visible ?? false 
        },
        { 
            id: 'description_visible', 
            label: 'Deskripsi', 
            icon: 'fa-eye', 
            iconOff: 'fa-eye-slash', 
            value: activity.description_visible ?? true 
        },
        { 
            id: 'enable_comments', 
            label: 'Rating & Komentar', 
            icon: 'fa-comments', 
            iconOff: 'fa-comment-slash', 
            value: activity.enable_comments 
        },
        { 
            id: 'rundown_visible', 
            label: 'Rangkaian (Rundown)', 
            icon: 'fa-eye', 
            iconOff: 'fa-eye-slash', 
            value: activity.rundown_visible ?? true 
        },
        { 
            id: 'participants_visible', 
            label: 'Peserta', 
            icon: 'fa-users', 
            iconOff: 'fa-users-slash', 
            value: activity.participants_visible ?? true 
        },
        { 
            id: 'materials_visible', 
            label: 'Materi Acara', 
            icon: 'fa-eye', 
            iconOff: 'fa-eye-slash', 
            value: activity.materials_visible ?? true 
        },
        { 
            id: 'speakers_visible', 
            label: 'Narasumber', 
            icon: 'fa-user-tie', 
            iconOff: 'fa-user-slash', 
            value: activity.speakers_visible ?? true 
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 md:mb-8">
            {/* Halaman Detail Control */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
                <div className="-mx-4 -mt-4 px-4 py-3 bg-indigo-50 border-b border-indigo-200 rounded-t-2xl">
                    <h4 className="font-semibold text-indigo-700">Halaman Detail</h4>
                </div>
                <ul className="list-none text-gray-700 space-y-3 mt-4">
                    {detailControls.map((control) => (
                        <li key={control.id} className="flex items-center gap-3">
                            <button
                                onClick={() => toggleField(control.id, control.value)}
                                className={`inline-flex items-center justify-center p-2 w-9 h-9 rounded-lg transition hover:scale-105 ${
                                    control.value 
                                        ? 'bg-red-700 text-white' 
                                        : 'bg-white border border-red-200 text-red-700'
                                }`}
                                title={`Tampilkan/Sembunyikan ${control.label}`}
                            >
                                <i className={`fas ${control.value ? control.icon : control.iconOff}`}></i>
                            </button>
                            <span className="font-medium">{control.label}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Halaman Show Control */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-4">
                <div className="-mx-4 -mt-4 px-4 py-3 bg-red-50 border-b border-red-200 rounded-t-2xl">
                    <h4 className="font-semibold text-red-700">Halaman Show</h4>
                </div>
                <ul className="list-none text-gray-700 space-y-3 mt-4">
                    {showControls.map((control) => (
                        <li key={control.id} className="flex items-center gap-3">
                            <button
                                onClick={() => toggleField(control.id, control.value)}
                                className={`inline-flex items-center justify-center p-2 w-9 h-9 rounded-lg transition hover:scale-105 ${
                                    control.value 
                                        ? 'bg-red-700 text-white' 
                                        : 'bg-white border border-red-200 text-red-700'
                                }`}
                                title={`Tampilkan/Sembunyikan ${control.label}`}
                            >
                                <i className={`fas ${control.value ? control.icon : control.iconOff}`}></i>
                            </button>
                            <span className="font-medium">{control.label}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
