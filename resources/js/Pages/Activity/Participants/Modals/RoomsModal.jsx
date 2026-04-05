import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useForm, router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import { Building, X, Plus, Upload, Download, Trash2, CheckCircle, Ban, UserPlus, Users } from 'lucide-react';

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

    // Safety check for participants
    const safeParticipants = Array.isArray(participants) ? participants : [];

    const filtered = safeParticipants.filter(p =>
        (p.name && p.name.toLowerCase().includes(search.toLowerCase())) ||
        (p.email && p.email.toLowerCase().includes(search.toLowerCase())) ||
        (p.province_label && p.province_label.toLowerCase().includes(search.toLowerCase()))
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
                                    title={`${p.name} (${p.email || '-'})${p.province_label ? ` - ${p.province_label}` : ''}`}
                                >
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-[10px] text-gray-400">
                                        {[p.email, p.province_label].filter(Boolean).join(' • ')}
                                    </div>
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

export default function RoomsModal({ isOpen, onClose, activity, rooms = [], hotels = [], unassignedParticipants = [], roomOccupants = [] }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        hotel_name: '',
        room_number: '',
        capacity: 0,
        notes: ''
    });

    const [selectedRooms, setSelectedRooms] = useState([]);
    const [activeTab, setActiveTab] = useState('manual');
    const [roomSearch, setRoomSearch] = useState('');
    const [roomFilter, setRoomFilter] = useState('all');
    const [provinceFilter, setProvinceFilter] = useState('all');

    // Import form
    const importForm = useForm({
        file: null
    });

    useEffect(() => {
        if (isOpen) {
            // Modal opened
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Safety check for activity
    if (!activity) {
        console.error('RoomsModal: activity prop is missing');
        return null;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('activity.participants.rooms.store', { activityId: activity.uid || activity.id }), {
            onSuccess: () => {
                reset();
            }
        });
    };

    const handleImport = (e) => {
        e.preventDefault();
        importForm.post(route('activity.participants.rooms.import', { activityId: activity.uid || activity.id }), {
            onSuccess: () => {
                importForm.reset();
            }
        });
    };

    const toggleSelectAll = (e) => {
        const visibleIds = filteredRooms.map(r => r.id);
        if (e.target.checked) {
            setSelectedRooms(prev => Array.from(new Set([...prev, ...visibleIds])));
        } else {
            setSelectedRooms(prev => prev.filter(id => !visibleIds.includes(id)));
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

        Swal.fire({
            title: 'Konfirmasi',
            text: confirmMsg,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Lanjutkan!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                if (action === 'delete') {
                    router.delete(route(routeName, { activityId: activity.uid || activity.id }), {
                        data: { room_ids: selectedRooms },
                        onSuccess: () => {
                            setSelectedRooms([]);
                            Swal.fire('Berhasil', 'Kamar terpilih telah dihapus.', 'success');
                        }
                    });
                } else {
                    router.post(route(routeName, { activityId: activity.uid || activity.id }), {
                        room_ids: selectedRooms
                    }, {
                        onSuccess: () => {
                            setSelectedRooms([]);
                            Swal.fire('Berhasil', 'Status kamar berhasil diperbarui.', 'success');
                        }
                    });
                }
            }
        });
    };

    // Simplified room assignment handler (just for demo, in real app might need more complex UI)
    const handleAssignParticipant = (roomId, userId) => {
        if (!userId) return;
        router.post(route('activity.participants.assign-room', { activityId: activity.uid || activity.id }), {
            room_id: roomId,
            user_id: userId
        }, {
            preserveScroll: true,
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Peserta berhasil dimasukkan ke kamar!',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        });
    };

    const handleRemoveParticipant = (roomId, userId) => {
        Swal.fire({
            title: 'Keluarkan Peserta?',
            text: "Peserta akan dikeluarkan dari kamar ini.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Keluarkan!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('activity.participants.assign-room', { activityId: activity.uid || activity.id }), {
                    room_id: '', // Unassign
                    user_id: userId
                }, {
                    preserveScroll: true
                });
            }
        });
    };

    const handleDeleteRoom = (room) => {
        Swal.fire({
            title: 'Hapus Kamar?',
            text: `Kamar "${room.room_number || room.id}" beserta penugasan pesertanya akan dihapus.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('activity.participants.rooms.destroy', { activityId: activity.uid || activity.id, roomId: room.id }), {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedRooms(prev => prev.filter(id => id !== room.id));
                        Swal.fire('Berhasil', 'Kamar telah dihapus.', 'success');
                    }
                });
            }
        });
    };

    const handleDeleteAll = () => {
        Swal.fire({
            title: 'Hapus SEMUA Data Kamar?',
            text: "Hapus SEMUA data kamar beserta penugasan pesertanya dalam aktivitas ini? Tindakan ini tidak dapat dibatalkan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus Semua!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('activity.participants.rooms.destroy-all', { activityId: activity.uid || activity.id }), {
                    onSuccess: () => {
                        setSelectedRooms([]);
                        Swal.fire('Berhasil', 'Semua data kamar berhasil dihapus.', 'success');
                    }
                });
            }
        });
    };

    const roomSearchTerm = (roomSearch || '').trim().toLowerCase();
    const roomSearchTokens = roomSearchTerm
        ? roomSearchTerm.split(/[\s/_,.-]+/).map(t => t.trim()).filter(Boolean)
        : [];

    const roomOccupantsValues = roomOccupants && typeof roomOccupants === 'object'
        ? Object.values(roomOccupants).flat()
        : [];

    const provinceOptionsLocal = (() => {
        const map = new Map();
        const add = (key, label) => {
            if (!key) return;
            const safeLabel = (label || '').toString().trim();
            if (safeLabel === '') return;
            if (!map.has(key)) map.set(key, safeLabel);
        };

        const all = [
            ...(Array.isArray(unassignedParticipants) ? unassignedParticipants : []),
            ...(Array.isArray(roomOccupantsValues) ? roomOccupantsValues : []),
        ];

        for (const p of all) {
            const key = p?.province_key || 'none';
            const label = p?.province_label || (key === 'none' ? 'Tanpa Provinsi' : '');
            add(key, label);
        }

        const arr = Array.from(map.entries()).map(([key, label]) => ({ key, label }));
        arr.sort((a, b) => (a.label || '').localeCompare(b.label || '', 'id', { sensitivity: 'base' }));
        return arr;
    })();

    const unassignedParticipantsFiltered = provinceFilter === 'all'
        ? unassignedParticipants
        : (Array.isArray(unassignedParticipants)
            ? unassignedParticipants.filter(p => (p?.province_key || 'none') === provinceFilter)
            : []);

    const filteredRooms = rooms.filter((room) => {
        const occupants = roomOccupants[room.id] || [];
        const isFull = room.capacity > 0 && occupants.length >= room.capacity;
        const isEmpty = occupants.length === 0;
        const isAvailable = !isFull;

        if (roomFilter === 'empty' && !isEmpty) return false;
        if (roomFilter === 'available' && !isAvailable) return false;
        if (provinceFilter !== 'all') {
            const match = occupants.some(o => (o?.province_key || 'none') === provinceFilter);
            if (!match) return false;
        }

        const hotelName = (room.hotel_name || '').toString().toLowerCase();
        const roomNumber = (room.room_number || '').toString().toLowerCase();
        const notes = (room.notes || '').toString().toLowerCase();
        const statusLabel = room.is_active ? 'aktif' : 'tidak aktif';
        const occupantsText = occupants.map(o => (o?.name || '').toString().toLowerCase()).join(' ');
        const provincesText = occupants.map(o => (o?.province_label || '').toString().toLowerCase()).join(' ');
        const capacityText = room.capacity > 0 ? String(room.capacity) : 'tak terbatas';
        const occupancyText = String(occupants.length);
        const fullText = isFull ? 'penuh' : 'tersedia';

        if (roomSearchTokens.length === 0) return true;

        const searchable = [
            hotelName,
            roomNumber,
            notes,
            statusLabel,
            occupantsText,
            provincesText,
            capacityText,
            occupancyText,
            fullText,
        ].join(' ');

        return roomSearchTokens.every(token => searchable.includes(token));
    });

    const visibleRoomIds = filteredRooms.map(r => r.id);
    const allVisibleSelected = visibleRoomIds.length > 0 && visibleRoomIds.every(id => selectedRooms.includes(id));

    return createPortal(
        <div className="relative z-[100]" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Background backdrop */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

            {/* Modal panel wrapper */}
            <div className="fixed inset-0 z-10 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                    <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-6xl">
                        <div className="bg-indigo-600 px-4 py-3 sm:px-6 flex justify-between items-center">
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

                            {/* Tabs */}
                            <div className="flex justify-between items-center border-b border-gray-200 mb-4">
                                <div className="flex">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('manual')}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'manual'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Plus className="w-4 h-4" />
                                            Tambah Manual
                                        </div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('import')}
                                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'import'
                                            ? 'border-indigo-600 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Upload className="w-4 h-4" />
                                            Import Excel
                                        </div>
                                    </button>
                                </div>
                                {rooms.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteAll}
                                        className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 hover:bg-red-50 rounded-t-lg transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Hapus Semua Data
                                    </button>
                                )}
                            </div>

                            {/* Add Room Form */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                                {activeTab === 'manual' ? (
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
                                ) : (
                                    <form onSubmit={handleImport} className="flex flex-col sm:flex-row items-center gap-3 animate-in fade-in">
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
                                                href={route('activity.participants.rooms.template', { activityId: activity.uid || activity.id })}
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
                                )}
                            </div>

                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <div className="flex-1 min-w-0">
                                    <input
                                        type="text"
                                        value={roomSearch}
                                        onChange={(e) => setRoomSearch(e.target.value)}
                                        className="rounded border border-gray-300 px-3 py-2 w-full text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Cari: hotel / nomor / peserta (contoh: GOLDEN 1)"
                                    />
                                </div>
                                <div className="w-[220px] shrink-0">
                                    <select
                                        value={roomFilter}
                                        onChange={(e) => setRoomFilter(e.target.value)}
                                        className="rounded border border-gray-300 px-3 py-2 w-full text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                    >
                                        <option value="all">Semua Kamar</option>
                                        <option value="empty">Kamar Kosong</option>
                                        <option value="available">Masih Bisa Terisi</option>
                                    </select>
                                </div>
                                <div className="w-[220px] shrink-0">
                                    <select
                                        value={provinceFilter}
                                        onChange={(e) => setProvinceFilter(e.target.value)}
                                        className="rounded border border-gray-300 px-3 py-2 w-full text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                                    >
                                        <option value="all">Semua Provinsi</option>
                                        {provinceOptionsLocal.map(p => (
                                            <option key={p.key} value={p.key}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="text-xs text-gray-500 shrink-0 whitespace-nowrap">
                                    Menampilkan {filteredRooms.length} dari {rooms.length}
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
                            <div className="rounded-lg border border-gray-200">
                                <table className="min-w-full text-sm divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left w-10">
                                                <input
                                                    type="checkbox"
                                                    onChange={toggleSelectAll}
                                                    checked={allVisibleSelected}
                                                    className="rounded border-gray-300 text-primary focus:ring-indigo-500"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Hotel</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Nomor</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Kapasitas</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Terisi</th>
                                            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
                                            <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider w-20">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredRooms.length > 0 ? (
                                            filteredRooms.map((room) => {
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
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="truncate font-medium text-secondary max-w-[150px]" title={`${occ.name}${occ.province_label ? ` - ${occ.province_label}` : ''}`}>{occ.name}</div>
                                                                            {occ.province_label && (
                                                                                <div className="text-[10px] text-gray-500 truncate max-w-[150px]" title={occ.province_label}>
                                                                                    {occ.province_label}
                                                                                </div>
                                                                            )}
                                                                        </div>
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
                                                                        participants={unassignedParticipantsFiltered}
                                                                        onSelect={(userId) => handleAssignParticipant(room.id, userId)}
                                                                    />
                                                                )}

                                                                <div className="text-[10px] text-gray-400 text-right mt-0.5">
                                                                    {occupants.length} / {room.capacity > 0 ? room.capacity : '∞'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-gray-500">{room.notes}</td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-right">
                                                            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-semibold ${room.is_active ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                {room.is_active ? 'Aktif' : 'Tidak Aktif'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 whitespace-nowrap text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteRoom(room)}
                                                                className="inline-flex items-center justify-center p-1.5 rounded text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                title="Hapus kamar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="px-4 py-8 text-center text-gray-500 italic">
                                                    {rooms.length > 0 ? 'Tidak ada kamar yang sesuai pencarian.' : 'Belum ada kamar.'}
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
        </div>,
        document.body
    );
}
