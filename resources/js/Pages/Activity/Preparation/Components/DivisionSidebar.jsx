import React from 'react';

export default function DivisionSidebar({ divisions, selectedDivisionId, onSelect, activity }) {
    // Sort divisions by hierarchy logic if needed (already sorted from controller)
    
    return (
        <div className="bg-white overflow-hidden shadow-xl sm:rounded-lg">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">Divisi & Jabatan</h3>
                <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-add-division-modal'))}
                    className="text-sm bg-secondary text-white px-2 py-1 rounded hover:bg-blue-700"
                    title="Tambah Divisi"
                >
                    <i className="fas fa-plus"></i> +
                </button>
            </div>
            <div className="p-2 max-h-[600px] overflow-y-auto">
                <div className="space-y-1">
                    {divisions.map((division) => (
                        <div 
                            key={division.id}
                            onClick={() => onSelect(division.id)}
                            className={`
                                cursor-pointer px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 flex items-center justify-between
                                ${selectedDivisionId === division.id 
                                    ? 'bg-secondary text-white border-secondary shadow-sm' 
                                    : 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-secondary/10'
                                }
                            `}
                        >
                            <span className="truncate">{division.name}</span>
                            {/* Optional: Show task count or status indicator if available */}
                        </div>
                    ))}
                    
                    {divisions.length === 0 && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                            Belum ada divisi.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

