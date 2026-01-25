import React from 'react';

export default function DivisionSidebar({ divisions, selectedDivisionId, onSelect, activity }) {
    // Sort divisions by hierarchy logic if needed (already sorted from controller)
    
    return (
        <div className="h-full flex flex-col font-primary">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h4 className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Daftar Divisi</h4>
                <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-add-division-modal'))}
                    className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-lg hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm"
                    title="Tambah Divisi"
                >
                    <i className="fas fa-plus mr-1"></i> Tambah
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
                            {selectedDivisionId === division.id && <i className="fas fa-chevron-right text-xs opacity-80"></i>}
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

