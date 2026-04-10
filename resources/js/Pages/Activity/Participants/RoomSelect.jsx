import React, { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
import { ChevronDown, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';

export default function RoomSelect({
    activity,
    participant,
    rooms = [],
    roomOccupants = []
}) {
    const [search, setSearch] = useState('');
    
    const currentRoom = participant.room;

    // Filter rooms by search
    const filteredRooms = useMemo(() => {
        return rooms.filter(room => {
            const matchesSearch =
                (room.room_number && room.room_number.toLowerCase().includes(search.toLowerCase())) ||
                (room.hotel_name && room.hotel_name.toLowerCase().includes(search.toLowerCase()));

            const occupants = roomOccupants?.[room.id] || [];
            const isCurrent = currentRoom && currentRoom.id === room.id;
            const isFull = room.capacity > 0 && occupants.length >= room.capacity;

            return matchesSearch && (!isFull || isCurrent);
        });
    }, [rooms, search, roomOccupants, currentRoom]);

    const handleSelect = (room, close) => {
        if (currentRoom && currentRoom.id === room.id) {
            close();
            return;
        }

        Swal.fire({
            title: 'Konfirmasi Pindah Kamar',
            text: `Pindahkan peserta ke kamar ${room.room_number} (${room.hotel_name})?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#0054a3',
            cancelButtonColor: '#718096',
            confirmButtonText: 'Ya, Pindahkan',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('activity.participants.assign-room', { activityId: activity.uid || activity.id }), {
                    room_id: room.id,
                    user_id: participant.user_id
                }, {
                    preserveScroll: true,
                    onSuccess: () => close()
                });
            }
        });
    };

    const handleUnassign = (close) => {
        Swal.fire({
            title: 'Konfirmasi Hapus Kamar',
            text: 'Keluarkan peserta dari kamar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E02424',
            cancelButtonColor: '#718096',
            confirmButtonText: 'Ya, Keluarkan',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('activity.participants.assign-room', { activityId: activity.uid || activity.id }), {
                    room_id: '',
                    user_id: participant.user_id
                }, {
                    preserveScroll: true,
                    onSuccess: () => close()
                });
            }
        });
    }

    return (
        <Popover className="relative block">
            {({ open, close }) => (
                <>
                    <PopoverButton
                        className="flex items-center justify-between w-full min-w-[160px] max-w-[200px] text-left text-sm border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        onClick={() => {
                            if (!open) setSearch('');
                        }}
                    >
                        {currentRoom ? (
                            <div className="flex flex-col overflow-hidden">
                                <span className="font-medium text-slate-900 truncate">{currentRoom.room_number}</span>
                                <span className="text-xs text-slate-500 truncate">{currentRoom.hotel_name}</span>
                            </div>
                        ) : (
                            <span className="text-slate-400 italic">Pilih Kamar...</span>
                        )}
                        <ChevronDown className="w-4 h-4 text-slate-400 ml-2 flex-shrink-0" />
                    </PopoverButton>

                    <PopoverPanel
                        anchor="bottom start"
                        className="z-[60] w-80 bg-white shadow-xl rounded-lg border border-slate-100 mt-1 max-h-60 flex flex-col overflow-hidden origin-top-left focus:outline-none"
                    >
                        <div className="p-2 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <input
                                type="text"
                                autoFocus
                                placeholder="Cari kamar/hotel..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            />
                        </div>

                        <div className="overflow-y-auto overflow-x-hidden flex-1 p-1">
                            {currentRoom && (
                                <button
                                    onClick={() => handleUnassign(close)}
                                    className="w-full text-left px-2 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md mb-1 flex items-center gap-2"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Kosongkan Kamar</span>
                                </button>
                            )}

                            {filteredRooms.length > 0 ? (
                                filteredRooms.map(room => {
                                    const occupants = roomOccupants[room.id] || [];
                                    const panitiaCount = occupants.filter(o => {
                                        const r = (o?.role ?? '').toString().trim().toLowerCase();
                                        if (r === 'panitia' || r === 'committee') return true;
                                        if (o?.is_committee === true || o?.is_committee === 1) return true;
                                        return false;
                                    }).length;
                                    const pesertaCount = occupants.length - panitiaCount;
                                    const isCurrent = currentRoom && currentRoom.id === room.id;
                                    const isFull = room.capacity > 0 && occupants.length >= room.capacity;
                                    const isActive = room.is_active !== false && room.is_active !== 0;

                                    const canSelect = !isCurrent && isActive && !isFull;

                                    return (
                                        <button
                                            key={room.id}
                                            onClick={() => canSelect && handleSelect(room, close)}
                                            disabled={!canSelect}
                                            className={`w-full text-left px-2 py-2 text-sm rounded-md mb-0.5 transition-colors group ${
                                                isCurrent ? 'bg-indigo-50 cursor-default' :
                                                canSelect ? 'hover:bg-indigo-50 text-slate-700' : 'opacity-50 cursor-not-allowed bg-slate-50'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`font-medium truncate ${isCurrent ? 'text-indigo-700' : 'text-slate-700'}`}>
                                                            {room.room_number}
                                                        </div>
                                                        {!isActive && (
                                                            <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded">Nonaktif</span>
                                                        )}
                                                        {isFull && !isCurrent && (
                                                            <span className="text-[10px] bg-amber-100 text-amber-600 px-1 rounded">Penuh</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate">{room.hotel_name}</div>
                                                </div>
                                                <div className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${
                                                    isFull ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                                                }`} title={`Peserta: ${pesertaCount} • Panitia: ${panitiaCount}`}>
                                                    {occupants.length} / {room.capacity > 0 ? room.capacity : '∞'}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="px-2 py-4 text-sm text-slate-400 text-center">
                                    Tidak ada kamar tersedia
                                </div>
                            )}
                        </div>
                    </PopoverPanel>
                </>
            )}
        </Popover>
    );
}
