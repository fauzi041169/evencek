import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { Transition } from '@headlessui/react';

export default function ColumnFilter({ label, options = [], value, onChange, className = '' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef(null);

    // Normalize options to {label, value} format
    const normalizedOptions = useMemo(() => {
        return options.map(opt => {
            if (typeof opt === 'object' && opt !== null) {
                // Handle various object structures (id/name, value/label)
                const val = opt.value ?? opt.id;
                const lab = opt.label ?? opt.name ?? val;
                return { label: String(lab || ''), value: String(val || '') };
            }
            return { label: String(opt || ''), value: String(opt || '') };
        });
    }, [options]);

    // Filter options based on search
    const filteredOptions = useMemo(() => {
        if (!search) return normalizedOptions;
        const s = search.toLowerCase();
        return normalizedOptions.filter(opt => 
            opt.label.toLowerCase().includes(s)
        );
    }, [normalizedOptions, search]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={`flex items-center gap-2 ${className}`} ref={dropdownRef}>
            <span className={`font-semibold uppercase tracking-wider text-xs whitespace-nowrap ${value ? 'text-primary' : 'text-slate-700'}`}>
                {label}
            </span>
            <div className="relative">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                    className={`p-1 rounded hover:bg-slate-200 transition-colors ${value ? 'text-primary bg-indigo-50 ring-1 ring-indigo-200' : 'text-slate-400'}`}
                    title={`Filter ${label}`}
                >
                    <Filter className="w-3.5 h-3.5" />
                </button>

                <Transition
                    show={isOpen}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                    className="absolute z-50 mt-2 w-60 bg-white rounded-lg shadow-xl border border-slate-200 left-0 md:left-auto md:right-0 lg:left-0"
                >
                    <div className="p-2">
                        <div className="relative mb-2">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Cari..."
                                className="w-full pl-8 pr-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                autoFocus
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                            {search && (
                                <button 
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        
                        <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
                            <button
                                onClick={() => {
                                    onChange('');
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-slate-50 flex items-center justify-between ${!value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600'}`}
                            >
                                <span>Semua</span>
                                {!value && <span className="text-primary text-[10px]">â—</span>}
                            </button>
                            
                            {filteredOptions.map((opt, idx) => {
                                const isSelected = String(value) === opt.value;
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            onChange(opt.value);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-slate-50 flex items-center justify-between ${isSelected ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600'}`}
                                    >
                                        <span className="truncate">{opt.label || '(Kosong)'}</span>
                                        {isSelected && <span className="text-primary text-[10px]">â—</span>}
                                    </button>
                                );
                            })}
                            
                            {filteredOptions.length === 0 && (
                                <div className="px-2 py-4 text-xs text-slate-400 text-center italic">
                                    Tidak ada data
                                </div>
                            )}
                        </div>
                    </div>
                </Transition>
            </div>
        </div>
    );
}

