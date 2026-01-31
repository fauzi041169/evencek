import React from 'react';
import { Plus, ChevronRight } from 'lucide-react';

export default function DivisionSidebar({ divisions, selectedDivisionId, onSelect, activity }) {
    // Sort divisions by hierarchy logic if needed (already sorted from controller)

    return (
        <div className="h-full flex flex-col font-primary">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-white">
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
            <div className="p-3 flex-1 overflow-y-auto">
                <div className="space-y-1">
                    {divisions.map((division) => (
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

                    {divisions.length === 0 && (
                        <div className="text-center py-8 text-gray-400 text-xs italic">
                            Belum ada divisi.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

