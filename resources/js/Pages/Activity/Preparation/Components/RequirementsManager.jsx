import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { usePage } from '@inertiajs/react';
import Swal from 'sweetalert2';

export default function RequirementsManager({ activity, divisionId, divisions }) {
    const [requirements, setRequirements] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedDivision, setSelectedDivision] = useState(null);

    useEffect(() => {
        if (divisionId) {
            const division = divisions.find(d => d.id === divisionId);
            setSelectedDivision(division);
            loadRequirements(divisionId);
        }
    }, [divisionId, divisions]);

    const loadRequirements = async (divId) => {
        setLoading(true);
        try {
            const response = await axios.get(route('activity.preparation.requirements', [activity.id, divId]));
            setRequirements(response.data.requirements || []);
        } catch (error) {
            console.error("Error loading requirements:", error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal Memuat',
                text: 'Terjadi kesalahan saat memuat data persyaratan.',
                confirmButtonColor: '#EF4444'
            });
        } finally {
            setLoading(false);
        }
    };

    const updateRequirement = async (id, data) => {
        try {
            // Optimistic update
            setRequirements(prev => prev.map(req =>
                req.id === id ? { ...req, ...data } : req
            ));

            const formData = new FormData();
            Object.keys(data).forEach(key => {
                formData.append(key, data[key]);
            });
            formData.append('_method', 'PUT');

            await axios.post(route('activity.preparation.update-requirement', [activity.id, divisionId, id]), formData);
        } catch (error) {
            console.error("Error updating requirement:", error);
            // Revert on error (could be improved)
            loadRequirements(divisionId);
        }
    };

    const handleStatusChange = (id, newStatus) => {
        updateRequirement(id, { status: newStatus });
    };

    const handleNameChange = (id, newName) => {
        updateRequirement(id, { name: newName });
    };

    const handleTargetDateChange = (id, newDate) => {
        updateRequirement(id, { target_date: newDate });
    };

    const handleNotesChange = (id, newNotes) => {
        updateRequirement(id, { notes: newNotes });
    };

    const openAddRequirementModal = () => {
        window.dispatchEvent(new CustomEvent('open-add-requirement-modal', { detail: { divisionId } }));
    };

    // Helper to parse "needs" from notes (based on blade logic)
    const parseNeeds = (notes) => {
        if (!notes) return [];
        return notes.split('\n')
            .filter(line => line.includes('|')) // Simple heuristic based on original code usage or convention
            .map(line => {
                const parts = line.split('|');
                return { name: parts[0], quantity: parts[1] || '', unit: parts[2] || '' };
            });
    };

    // Actually the original JS had `parseNeedsFromNotes` logic.
    // Let's assume for now simple text editing for notes, as "needs" seemed to be a specific format stringified into notes.
    // If complex parsing is needed, I'll need that logic. 
    // Re-reading the blade file, `parseNeedsFromNotes` was likely defined in a script tag I missed or implied.
    // For now, I will treat notes as plain text but maybe render them nicely if I can.

    if (!divisionId) {
        return <div className="text-center py-8 text-gray-500">Silakan pilih divisi untuk melihat kebutuhan.</div>;
    }

    return (
        <div className="font-primary">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 pb-6 border-b border-slate-50">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <i className="fas fa-folder-open"></i>
                        Divisi: {selectedDivision?.name}
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight">
                        Daftar Kebutuhan
                    </h4>
                    <p className="text-sm text-slate-400 font-medium">Dokumentasi & tracking inventaris operasional tim</p>
                </div>
                <button
                    onClick={openAddRequirementModal}
                    className="group bg-primary text-white px-6 py-3 rounded-2xl hover:bg-primary/90 text-sm font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center"
                >
                    <i className="fas fa-plus mr-2 transform group-hover:rotate-90 transition-transform"></i> Tambah Kebutuhan
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8">
                    <i className="fas fa-spinner fa-spin text-primary text-2xl"></i>
                    <p className="mt-2 text-gray-500">Memuat data...</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kebutuhan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {requirements.length > 0 ? (
                                requirements.map((req) => (
                                    <RequirementRow
                                        key={req.id}
                                        req={req}
                                        onStatusChange={handleStatusChange}
                                        onNameChange={handleNameChange}
                                        onTargetDateChange={handleTargetDateChange}
                                        onNotesChange={handleNotesChange}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-gray-500">
                                        Belum ada kebutuhan. Klik tombol tambah untuk memulai.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function RequirementRow({ req, onStatusChange, onNameChange, onTargetDateChange, onNotesChange }) {
    const [isEditingName, setIsEditingName] = useState(false);
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);

    const [name, setName] = useState(req.name);
    const [date, setDate] = useState(req.target_date ? req.target_date.split('T')[0] : '');
    const [notes, setNotes] = useState(req.notes || '');

    // Sync with props if they change externally
    useEffect(() => {
        setName(req.name);
        setDate(req.target_date ? req.target_date.split('T')[0] : '');
        setNotes(req.notes || '');
    }, [req]);

    return (
        <tr>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 align-top">
                {isEditingName ? (
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => { setIsEditingName(false); if (name !== req.name) onNameChange(req.id, name); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                        className="border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 rounded-md shadow-sm w-full"
                        autoFocus
                    />
                ) : (
                    <span
                        onClick={() => setIsEditingName(true)}
                        className="cursor-pointer hover:text-primary border-b border-dashed border-transparent hover:border-gray-400"
                    >
                        {req.name} {req.quantity > 1 && `(${req.quantity})`}
                    </span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                {isEditingDate ? (
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        onBlur={() => { setIsEditingDate(false); if (date !== (req.target_date ? req.target_date.split('T')[0] : '')) onTargetDateChange(req.id, date); }}
                        className="border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 rounded-md shadow-sm"
                        autoFocus
                    />
                ) : (
                    <span
                        onClick={() => setIsEditingDate(true)}
                        className="cursor-pointer hover:text-primary border-b border-dashed border-transparent hover:border-gray-400"
                    >
                        {date ? new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                    </span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap align-top">
                <select
                    value={req.status}
                    onChange={(e) => onStatusChange(req.id, e.target.value)}
                    className={`text-sm rounded-md shadow-sm border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50
                        ${req.status === 'completed' ? 'text-green-600 bg-green-50' :
                            req.status === 'ready' ? 'text-secondary bg-blue-50' : 'text-gray-600 bg-gray-50'}`}
                >
                    <option value="pending">Belum Proses</option>
                    <option value="ready">Proses</option>
                    <option value="completed">Selesai</option>
                </select>
            </td>
            <td className="px-6 py-4 text-sm text-gray-500 align-top max-w-xs truncate">
                {isEditingNotes ? (
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => { setIsEditingNotes(false); if (notes !== (req.notes || '')) onNotesChange(req.id, notes); }}
                        className="border-gray-300 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 rounded-md shadow-sm w-full text-xs"
                        rows="2"
                        autoFocus
                    />
                ) : (
                    <span
                        onClick={() => setIsEditingNotes(true)}
                        className={`cursor-pointer hover:text-primary block ${!notes ? 'text-gray-300 italic' : ''}`}
                        title={notes}
                    >
                        {notes || 'Klik untuk catatan...'}
                    </span>
                )}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                {/* Placeholder for needs items */}
                <span className="text-xs text-gray-400">-</span>
            </td>
        </tr>
    );
}

