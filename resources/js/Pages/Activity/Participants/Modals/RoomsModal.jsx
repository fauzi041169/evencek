import React, { useState, useEffect, useRef } from 'react';
import { useForm, router } from '@inertiajs/react';
import { Building, X, Plus, Upload, Download, Trash2, CheckCircle, Ban, UserPlus, Users } from 'lucide-react';

export default function RoomsModal({ isOpen, onClose, activity, rooms = [], hotels = [], unassignedParticipants = [], roomOccupants = [] }) {
    if (!isOpen) return null;

    const { data, setData, post, processing, errors, reset } = useForm({
        hotel_name: '',
        room_number: '',
        capacity: 0,
        notes: ''
    });

    const [selectedRooms, setSelectedRooms] = useState([]);
    
    // Import form
    const importForm = useForm({
        file: null
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('activity.participants.rooms.store', activity.uid), {
            onSuccess: () => {
                reset();
            }
        });
    };

    const handleImport = (e) => {
        e.preventDefault();
        importForm.post(route('activity.participants.rooms.import', activity.uid), {
            onSuccess: () => {
                importForm.reset();
            }
        });
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRooms(rooms.map(r => r.id));
        } else {
            setSelectedRooms([]);
        }
    };

    const toggleSelectRoom = (id) => {
        if (selectedRooms.includes(id)) {
            setSelectedRooms(selectedRooms.filter(rid => rid !== id));
        } else {
            setSelectedRooms([...selectedRooms, id]);
        }
    };

    const handleBulkAction = (action) => {
        if (selectedRooms.length === 0) return;

        let routeName = '';
        let confirmMsg = '';

        if (action === 'activate') {
            routeName = 'activity.participants.rooms.activate-batch';
            confirmMsg = `Aktifkan ${selectedRooms.length} kamar terpilih?`;
        } else if (action === 'deactivate') {
            routeName = 'activity.participants.rooms.deactivate-batch';
            confirmMsg = `Nonaktifkan ${selectedRooms.length} kamar terpilih?`;
        } else if (action === 'delete') {
            routeName = 'activity.participants.rooms.destroy-batch';
            confirmMsg = `Hapus ${selectedRooms.length} kamar terpilih?`;
        }

        if (confirm(confirmMsg)) {
            if (action === 'delete') {
                router.delete(route(routeName, activity.uid), {
                    data: { ids: selectedRooms },
                    onSuccess: () => setSelectedRooms([])
                });
            } else {
                router.post(route(routeName, activity.uid), {
                    ids: selectedRooms
                }, {
                    onSuccess: () => setSelectedRooms([])
                });
            }
        }
    };

    // Simplified room assignment handler (just for demo, in real app might need more complex UI)
    const handleAssignParticipant = (roomId, userId) => {
        if (!userId) return;
        router.post(route('activity.participants.assign-room', activity.uid), {
            room_id: roomId,
            user_id: userId
        }, {
            preserveScroll: true,
            onSuccess: () => {
                // Toast or feedback
            }
        });
    };

    const handleRemoveParticipant = (roomId, userId) => {
        if (!confirm('Keluarkan peserta dari kamar ini?')) return;
        router.post(route('activity.participants.assign-room', activity.uid), {
            room_id: '', // Unassign
            user_id: userId
        }, {
            preserveScroll: true
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl w-full">
                    <div className="bg-primary px-4 py-3 sm:px-6 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Building className="w-5 h-5" />
                            Kelola Kamar Hotel
                        </h3>
                        <button onClick={onClose} className="text-indigo-100 hover:text-white focus:outline-none">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        
                        {/* Add Room Form */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                            <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-3 items-end">
                                <div className="col-span-12 sm:col-span-3">
                                    <label className="block text-sm text-gray-700 font-medium mb-1">Hotel</label>
                                    <input 
                                        type="text" 
                                        list="hotel-suggestions"
                                        value={data.hotel_name}
                                        onChange={e => setData('hotel_name', e.target.value)}
                                        className="rounded border border-gray-300 px-3 py-2 w-full text-sm focus:ring-indigo-500 focus:border-indigo-500" 
                                        placeholder="Nama/Kode Hotel" 
                                    />
                                    <datalist id="hotel-suggestions">
                                        {hotels.map((h, i) => <option key={i} value={h} />)}
                                    </datalist>
                                    {errors.hotel_name && <p className="text-red-500 text-xs">{errors.hotel_name}</p>}
                                </div>
                                <div className="col-span-12 sm:col-span-2">
                                    <label className="block text-sm text-gray-700 font-medium mb-1">Nomor Kamar</label>
                                    <input 
                                        type="text" 
                                        value={data.room_number}
                                        onChange={e => setData('room_number', e.target.value)}
                                        className="rounded border border-gray-300 px-3 py-2 w-full text-sm focus:ring-indigo-500 focus:border-indigo-500" 
                                        required 
                                        placeholder="Contoh: 101" 
                                    />
                                    {errors.room_number && <p className="text-red-500 text-xs">{errors.room_number}</p>}
                                </div>
                                <div className="col-span-6 sm:col-span-2">
                                    <label className="block text-sm text-gray-700 font-medium mb-1">Kapasitas</label>
                                    <input 
                                        type="number" 
                                        min="0"
                                        max="1000"
                                        value={data.capacity}
                                        onChange={e => setData('capacity', e.target.value)}
                                        className="rounded border border-gray-300 px-3 py-2 w-full text-sm focus:ring-indigo-500 focus:border-indigo-500" 
                                    />
                                </div>
                                <div className="col-span-6 sm:col-span-3">
                                    <label className="block text-sm text-gray-700 font-medium mb-1">Catatan</label>
                                    <input 
                                        type="text" 
                                        value={data.notes}
                                        onChange={e => setData('notes', e.target.value)}
                                        className="rounded border border-gray-300 px-3 py-2 w-full text-sm focus:ring-indigo-500 focus:border-indigo-500" 
                                        placeholder="Keterangan" 
                                    />
                                </div>
                                <div className="col-span-12 sm:col-span-2">
                                    <button 
                                        type="submit" 
                                        disabled={processing}
                                        className="rounded-lg bg-sky-600 px-4 py-2 text-white text-sm font-semibold hover:bg-sky-700 w-full flex justify-center items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" /> Tambah
                                    </button>
                                </div>
                            </form>

                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <form onSubmit={handleImport} className="flex flex-col sm:flex-row items-center gap-3">
                                    <div className="w-full sm:w-auto flex-grow">
                                        <label className="block text-xs text-gray-500 mb-1">Import Excel (.xlsx, .csv)</label>
                                        <input 
                                            type="file" 
                                            accept=".xlsx,.xls,.csv"
                                            onChange={e => importForm.setData('file', e.target.files[0])}
                                            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-primary/10" 
                                            required
                                        />
                                        {importForm.errors.file && <p className="text-red-500 text-xs">{importForm.errors.file}</p>}
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto mt-auto">
                                        <a 
                                            href={route('activity.participants.rooms.template', activity.uid)} 
                                            title="Unduh Template" 
                                            className="inline-flex items-center justify-center rounded-lg bg-gray-800 text-white px-4 py-2 text-sm font-semibold h-[38px] hover:bg-gray-900"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                        <button 
                                            type="submit" 
                                            disabled={importForm.processing}
                                            className="rounded-lg bg-primary px-4 py-2 text-white text-sm font-semibold hover:bg-purple-700 h-[38px] flex items-center gap-2"
                                        >
                                            <Upload className="w-4 h-4" /> Impor
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        {/* Bulk Actions */}
                        {selectedRooms.length > 0 && (
                            <div className="px-4 py-2 border rounded-t-lg flex justify-between items-center mb-2 bg-red-50 border-red-200">
                                <span className="text-sm font-medium text-red-700">{selectedRooms.length} kamar terpilih</span>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleBulkAction('activate')} className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Aktifkan
                                    </button>
                                    <button onClick={() => handleBulkAction('deactivate')} className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center gap-1">
                                        <Ban className="w-3 h-3" /> Nonaktifkan
                                    </button>
                                    <button onClick={() => handleBulkAction('delete')} className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-1.5 px-3 rounded flex items-center gap-1">
                                        <Trash2 className="w-3 h-3" /> Hapus
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Rooms List */}
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <table className="min-w-full text-sm divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left w-10">
                                            <input 
                                                type="checkbox" 
                                                onChange={toggleSelectAll}
                                                checked={rooms.length > 0 && selectedRooms.length === rooms.length}
                                                className="rounded border-gray-300 text-primary focus:ring-indigo-500" 
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Hotel</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Nomor</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Kapasitas</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Terisi</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200 max-h-[400px] overflow-y-auto block sm:table-row-group">
                                    {rooms.length > 0 ? (
                                        rooms.map((room) => {
                                            const occupants = roomOccupants[room.id] || [];
                                            const isFull = room.capacity > 0 && occupants.length >= room.capacity;
                                            
                                            return (
                                                <tr key={room.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-2 whitespace-nowrap">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedRooms.includes(room.id)}
                                                            onChange={() => toggleSelectRoom(room.id)}
                                                            className="rounded border-gray-300 text-primary focus:ring-indigo-500" 
                                                        />
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap">{room.hotel_name || '-'}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap font-medium">{room.room_number}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap">{(room.capacity > 0 ? room.capacity : 'Tak terbatas')}</td>
                                                    <td className="px-4 py-2 whitespace-normal min-w-[200px]">
                                                        <div className="flex flex-col gap-1">
                                                            {occupants.map(occ => (
                                                                <div key={occ.id} className="flex justify-between items-center bg-blue-50 px-2 py-1 rounded text-xs border border-blue-100">
                                                                    <span className="truncate font-medium text-secondary max-w-[150px]" title={occ.name}>{occ.name}</span>
                                                                    <button 
                                                                        type="button" 
                                                                        onClick={() => handleRemoveParticipant(room.id, occ.id)}
                                                                        className="text-red-400 hover:text-red-600 ml-1 p-0.5 rounded hover:bg-red-50" 
                                                                        title="Keluarkan"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            
                                                            {!isFull && (
                                                                <SearchableParticipantSelect 
                                                                    participants={unassignedParticipants}
                                                                    onSelect={(userId) => handleAssignParticipant(room.id, userId)}
                                                                />
                                                            )}
                                                            
                                                            <div className="text-[10px] text-gray-400 text-right mt-0.5">
                                                                {occupants.length} / {room.capacity > 0 ? room.capacity : 'âˆž'}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-gray-500">{room.notes}</td>
                                                    <td className="px-4 py-2 whitespace-nowrap text-right">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${room.is_active ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                            {room.is_active ? 'Aktif' : 'Tidak Aktif'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-gray-500 italic">
                                                Belum ada kamar.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Internal component for searchable select
const SearchableParticipantSelect = ({ participants, onSelect, placeholder = "+ Pilih Peserta" }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filtered = participants.filter(p => 
        p.name.toLowerCase().includes(search.toLowerCase()) || 
        (p.email && p.email.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="relative mt-1" ref={wrapperRef}>
            {!isOpen ? (
                <button
                    type="button"
                    onClick={() => { setIsOpen(true); setSearch(''); }}
                    className="w-full text-left text-xs border border-gray-300 rounded-md shadow-sm px-2 py-1.5 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                    {placeholder}
                </button>
            ) : (
                <div className="absolute z-10 w-full bg-white shadow-lg rounded-md border border-gray-200 mt-0 min-w-[200px]">
                    <input
                        type="text"
                        autoFocus
                        placeholder="Cari..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full border-0 border-b border-gray-100 text-xs px-2 py-1.5 focus:ring-0"
                    />
                    <div className="max-h-48 overflow-y-auto">
                        {filtered.length > 0 ? (
                            filtered.map(p => (
                                <div
                                    key={p.id}
                                    onClick={() => {
                                        onSelect(p.id);
                                        setIsOpen(false);
                                    }}
                                    className="px-2 py-1.5 text-xs hover:bg-indigo-50 cursor-pointer truncate"
                                    title={`${p.name} (${p.email || '-'})`}
                                >
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-[10px] text-gray-400">{p.email}</div>
                                </div>
                            ))
                        ) : (
                            <div className="px-2 py-2 text-xs text-gray-400 text-center">Tidak ditemukan</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

