import React, { useMemo, useState } from 'react';
import { Plus, ChevronRight } from 'lucide-react';

export default function DivisionSidebar({ divisions, selectedDivisionId, onSelect, activity }) {
    // Sort divisions by hierarchy logic if needed (already sorted from controller)

    const [query, setQuery] = useState('');
    const filteredDivisions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return divisions;
        return divisions.filter(d => (d.name || '').toLowerCase().includes(q));
    }, [divisions, query]);

    return (
        <div className="h-full flex flex-col font-primary">
            <div className="p-5 border-b border-gray-100 bg-white space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-primary rounded-full"></div>
                        <h4 className="font-black text-slate-800 uppercase text-[11px] tracking-[0.15em]">Jabatan / Divisi</h4>
                    </div>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-add-division-modal'))}
                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:bg-primary hover:text-white transition-all border border-slate-100"
                        title="Tambah Divisi"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
                <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Cari divisi..."
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/30 focus:border-primary/50 outline-none"
                        aria-label="Cari divisi"
                    />
                </div>
            </div>
            <div className="p-3 flex-1 overflow-y-auto">
                <div className="space-y-1">
                    {filteredDivisions.map((division) => (
                        <div
                            key={division.id}
                            onClick={() => onSelect(division.id)}
                            className={`
                                cursor-pointer px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-between group
                                ${selectedDivisionId === division.id
                                    ? 'bg-primary text-white shadow-md shadow-primary/30 translate-x-1'
                                    : 'text-gray-600 hover:bg-white hover:text-primary hover:shadow-sm'
                                }
                            `}
                        >
                            <span className="truncate">{division.name}</span>
                            {selectedDivisionId === division.id && <ChevronRight className="w-3 h-3 opacity-80" />}
                        </div>
                    ))}

                    {filteredDivisions.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-xs italic">
                            Tidak ada divisi yang cocok.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
