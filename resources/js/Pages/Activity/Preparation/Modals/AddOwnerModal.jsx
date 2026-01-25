import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { router } from '@inertiajs/react';

export default function AddOwnerModal({ activity }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = useRef(null);

    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('open-add-owner-modal', handleOpen);
        return () => window.removeEventListener('open-add-owner-modal', handleOpen);
    }, []);

    const handleSearch = (term) => {
        setSearchTerm(term);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (term.length < 3) { setSearchResults([]); return; }

        searchTimeout.current = setTimeout(async () => {
            setIsSearching(true);
            try {
                const activityId = activity.uid || activity.id;
                const response = await axios.get(route('activity.preparation.owners.search', { activityId }), { params: { q: term } });
                setSearchResults(response.data);
            } catch (error) { console.error(error); } finally { setIsSearching(false); }
        }, 300);
    };

    const handleAdd = async (user) => {
        try {
            const activityId = activity.uid || activity.id;
            await axios.post(route('activity.preparation.store-owner', { activityId }), { user_id: user.id });
            setIsOpen(false);
            Swal.fire('Berhasil', 'Penanggung jawab ditambahkan', 'success').then(() => router.reload());
        } catch (error) { Swal.fire('Error', 'Gagal', 'error'); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">Tambah Admin</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-900"><i className="fas fa-times"></i></button>
                    </div>

                    <div className="relative mb-6">
                        <input
                            type="text"
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary shadow-inner"
                            placeholder="Cari nama atau email..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            autoFocus
                        />
                        <i className="fas fa-search absolute left-5 top-5 text-gray-400"></i>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-2">
                        {searchResults.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleAdd(user)}
                                className="w-full flex items-center p-4 hover:bg-primary/5 rounded-2xl transition-all group"
                            >
                                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold mr-4 group-hover:bg-primary group-hover:text-white transition-colors">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-gray-900">{user.name}</div>
                                    <div className="text-xs text-gray-500">{user.email}</div>
                                </div>
                                <i className="fas fa-plus-circle ml-auto text-primary opacity-0 group-hover:opacity-100 transition-all"></i>
                            </button>
                        ))}
                        {isSearching && <div className="text-center p-4 text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i>Mencari...</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
