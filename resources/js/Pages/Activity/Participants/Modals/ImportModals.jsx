import React, { useState, useRef, useEffect } from 'react';
import { useForm, router } from '@inertiajs/react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, AlertTriangle, FileText, Download, Plus, Save, MapPin, Trash2, ChevronDown, ChevronLeft } from 'lucide-react';

export function ImportModal({ isOpen, onClose, activity, onCheckSuccess, onRegionLookup }) {
    // ImportModal Render
    const [pasteData, setPasteData] = useState('');
    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [columns, setColumns] = useState(['user:email', 'user:name', 'user:password']);
    const [newColumn, setNewColumn] = useState('');
    const [isCustomColumn, setIsCustomColumn] = useState(false);
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [previewData, setPreviewData] = useState([]);
    const [hasHeader, setHasHeader] = useState(true);
    const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const fileInputRef = useRef(null);
    
    const activityId = activity ? (activity.uid || activity.id) : null;

    // Helper: Detect delimiter
    const detectDelimiter = (text) => {
        const firstLine = text.trim().split('\n')[0];
        if (firstLine.includes('\t')) return '\t';
        if (firstLine.includes(';')) return ';';
        if (firstLine.includes(',')) return ',';
        return '\t';
    };

    // Parse paste data for preview
    useEffect(() => {
        if (!pasteData) {
            setPreviewData([]);
            return;
        }

        const delimiter = detectDelimiter(pasteData);
        const rows = pasteData.trim().split('\n').filter(r => r.trim()).slice(0, 5);
        const parsed = rows.map(row => row.split(delimiter));
        setPreviewData(parsed);

        // Smart detection: Check if first row looks like data (e.g. email column has '@')
        if (parsed.length > 0) {
            const emailColIdx = columns.findIndex(c => c.includes('email'));
            if (emailColIdx !== -1 && parsed[0][emailColIdx] && parsed[0][emailColIdx].includes('@')) {
                setHasHeader(false);
            } else {
                setHasHeader(true);
            }
        }
    }, [pasteData, columns]);

    // Safety check moved to end


    const [templateOptions, setTemplateOptions] = useState([
        { value: 'user:name', label: 'Nama Lengkap' },
        { value: 'user:email', label: 'Email' },
        { value: 'user:password', label: 'Password' },
        { value: 'profile:no_hp', label: 'No HP/WA' },
        { value: 'profile:nik', label: 'NIK' },
        { value: 'profile:gender', label: 'Jenis Kelamin' },
        { value: 'profile:birth_place', label: 'Tempat Lahir' },
        { value: 'profile:birth_date', label: 'Tanggal Lahir (YYYY-MM-DD)' },
        { value: 'profile:address', label: 'Alamat Lengkap' },
        { value: 'province', label: 'Provinsi (Teks)' },
        { value: 'regency', label: 'Kabupaten/Kota (Teks)' },
        { value: 'district', label: 'Kecamatan (Teks)' },
        { value: 'profile:province_id', label: 'Provinsi' },
        { value: 'profile:regency_id', label: 'Kabupaten/Kota' },
        { value: 'profile:district_id', label: 'Kecamatan' },
        { value: 'profile:institution', label: 'Instansi' },
        { value: 'profile:position', label: 'Jabatan' },
    ]);

    useEffect(() => {
        if (isOpen && activityId) {
            axios.get(route('activity.preparation.get-import-template', activityId))
                .then(response => {
                    if (response.data.template) {
                        const cols = response.data.template.split(',');
                        setColumns(cols);
                        
                        // Merge unknown columns into options
                        const currentOptions = [...templateOptions];
                        let changed = false;
                        cols.forEach(col => {
                            const clean = col.replace('*', '');
                            if (!currentOptions.find(o => o.value === clean)) {
                                let label = clean;
                                if (clean.startsWith('profile:')) label = clean.replace('profile:', '') + ' (Profile)';
                                else if (clean.startsWith('user:')) label = clean.replace('user:', '') + ' (User)';
                                currentOptions.push({ value: clean, label: label });
                                changed = true;
                            }
                        });
                        if (changed) {
                            setTemplateOptions(currentOptions);
                        }
                    }
                })
                .catch(error => console.error('Failed to load template', error));
        }
    }, [isOpen, activityId]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsColumnDropdownOpen(false);
                setIsCustomColumn(false);
                setNewColumn('');
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    const handleAddColumn = (columnValue) => {
        const val = columnValue || newColumn;
        if (val && !columns.includes(val)) {
            setColumns([...columns, val]);
            setNewColumn('');
            setIsColumnDropdownOpen(false);
            setIsCustomColumn(false);
        }
    };

    const handleRemoveColumn = (index) => {
        const newCols = [...columns];
        newCols.splice(index, 1);
        setColumns(newCols);
    };

    const toggleMandatory = (index) => {
        const newCols = [...columns];
        const col = newCols[index];
        if (col.endsWith('*')) {
            newCols[index] = col.substring(0, col.length - 1);
        } else {
            newCols[index] = col + '*';
        }
        setColumns(newCols);
    };

    const handleSaveTemplate = () => {
        setIsSavingTemplate(true);
        axios.post(route('activity.preparation.save-import-template', activityId), {
            template: columns.join(',')
        })
        .then(() => {
            setIsSavingTemplate(false);
            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'Template berhasil disimpan!',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            });
        })
        .catch(error => {
            setIsSavingTemplate(false);
            console.error('Failed to save template', error);
            Swal.fire({
                icon: 'error',
                title: 'Gagal',
                text: 'Gagal menyimpan template'
            });
        });
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setFile(e.target.files[0]);
            // Logic to read file could go here if we want to preview
        }
    };

    const handleImport = () => {
        setIsProcessing(true);
        
        // Prepare data
        const formData = new FormData();
        if (file) {
            formData.append('file', file);
        } else if (pasteData) {
            // Convert paste data to file or send as text
            let dataToSend = pasteData;
            
            if (!hasHeader) {
                const delimiter = detectDelimiter(pasteData);
                // Prepend header row based on columns
                const headerRow = columns.map(c => c.replace('*', '')).join(delimiter);
                dataToSend = headerRow + '\n' + pasteData;
            }

            const blob = new Blob([dataToSend], { type: 'text/plain' });
            formData.append('file', blob, 'pasted_data.txt');
        } else {
            Swal.fire({
                icon: 'warning',
                title: 'Perhatian',
                text: 'Silakan tempel data atau pilih file Excel.'
            });
            setIsProcessing(false);
            return;
        }

        // Send data
        setIsProcessing(true);
        axios.post(route('activity.preparation.import-participants', activityId), formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        })
        .then(response => {
            setIsProcessing(false);
            // Backend returns import result directly (inserted, skipped, etc.)
            // or { status: 'error' } on failure.
            if (response.data && !response.data.status && response.data.success) {
                // Success (direct object)
                onCheckSuccess(response.data);
            } else if (response.data.status === 'success') {
                onCheckSuccess(response.data.stats || response.data);
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Terjadi kesalahan: ' + (response.data.message || 'Unknown error')
                });
            }
        })
        .catch(error => {
            setIsProcessing(false);
            console.error(error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Gagal mengimpor: ' + (error.response?.data?.message || error.message)
            });
        });
    };

    if (!isOpen || !activity || !activityId) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-30 transition-opacity" onClick={onClose}></div>
                <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
                <div className="relative inline-block overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
                    <div className="bg-primary px-4 py-3 sm:px-6 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Tempel Data dari Excel</h3>
                        <button onClick={onClose} className="text-indigo-100 hover:text-white focus:outline-none">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <p className="text-sm text-gray-600 mb-3">Salin (copy) data dari Excel lalu tempel (paste) di area bawah. Sesuaikan kolom template jika perlu agar urutan cocok dengan template impor.</p>

                        <div className="mb-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Template Kolom (urut dari kiri)</label>
                            
                            <div className="flex gap-2 mb-2 flex-wrap items-center">
                                <div className="relative" ref={dropdownRef}>
                                    <button 
                                        type="button" 
                                        onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
                                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium shadow-md hover:bg-emerald-700 transition-all duration-200"
                                    >
                                        <Plus className="w-4 h-4" /> Tambah Kolom
                                    </button>

                                    {isColumnDropdownOpen && (
                                        <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 z-50 animate-in fade-in zoom-in-95 duration-200">
                                            {isCustomColumn ? (
                                                <div className="p-3">
                                                    <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-700">
                                                        <button 
                                                            onClick={() => setIsCustomColumn(false)}
                                                            className="p-1 hover:bg-gray-100 rounded"
                                                        >
                                                            <ChevronLeft className="w-4 h-4" />
                                                        </button>
                                                        <span>Kolom Custom</span>
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={newColumn}
                                                        onChange={(e) => setNewColumn(e.target.value)}
                                                        placeholder="Contoh: size_baju"
                                                        className="w-full text-sm border-gray-300 rounded-md focus:border-indigo-500 focus:ring-indigo-500 mb-2"
                                                        autoFocus
                                                    />
                                                    <button 
                                                        onClick={() => handleAddColumn()}
                                                        disabled={!newColumn}
                                                        className="w-full bg-primary text-white py-1.5 rounded-md text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                                                    >
                                                        Tambah
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="py-1 max-h-60 overflow-y-auto">
                                                    {templateOptions.filter(o => !columns.includes(o.value) && !columns.includes(o.value + '*')).map(opt => (
                                                        <button
                                                            key={opt.value}
                                                            onClick={() => handleAddColumn(opt.value)}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                    {templateOptions.filter(o => !columns.includes(o.value) && !columns.includes(o.value + '*')).length === 0 && (
                                                        <div className="px-4 py-2 text-xs text-gray-400 italic text-center">Semua kolom standar sudah dipilih</div>
                                                    )}
                                                    <div className="border-t border-gray-100 my-1"></div>
                                                    <button
                                                        onClick={() => { setIsCustomColumn(true); setNewColumn(''); }}
                                                        className="w-full text-left px-4 py-2 text-sm text-secondary font-medium hover:bg-blue-50 transition-colors flex items-center gap-2"
                                                    >
                                                        <Plus className="w-3 h-3" /> Buat Kolom Custom
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <button 
                                    type="button" 
                                    onClick={handleSaveTemplate}
                                    disabled={isSavingTemplate}
                                    className="inline-flex items-center gap-2 rounded-lg bg-primary text-white px-3 py-1.5 text-sm font-medium shadow-md hover:bg-indigo-700 transition-all duration-200"
                                >
                                    <Save className="w-4 h-4" /> Simpan Template
                                </button>

                                <a 
                                    href={route('activity.preparation.download-participants-template', activityId)} 
                                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3 py-1.5 text-sm font-medium shadow-md hover:shadow-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-200" 
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <Download className="w-4 h-4" /> Unduh .xlsx
                                </a>
                                <button 
                                    type="button" 
                                    onClick={onRegionLookup} 
                                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 text-sm font-medium shadow-md hover:shadow-lg hover:from-primary hover:to-pink-600 transition-all duration-200"
                                >
                                    <MapPin className="w-4 h-4" /> Lihat ID Wilayah
                                </button>
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()} 
                                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 text-sm font-medium shadow-md hover:shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                                >
                                    <FileSpreadsheet className="w-4 h-4" /> Input Excel
                                </button>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    accept=".xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {file && (
                                <div className="mb-2 p-2 bg-blue-50 text-blue-700 rounded flex items-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4" />
                                    <span className="text-sm font-medium">File dipilih: {file.name}</span>
                                    <button onClick={() => setFile(null)} className="ml-auto text-blue-500 hover:text-blue-700"><X className="w-4 h-4" /></button>
                                </div>
                            )}

                            {/* Column Editor */}
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mb-3">
                                <p className="text-xs text-gray-500 mb-2">Klik pada kotak centang untuk menandai kolom sebagai wajib diisi (*).</p>
                                <div className="flex flex-wrap gap-2">
                                    {columns.map((col, idx) => {
                                        const isMandatory = col.endsWith('*');
                                        const cleanCol = isMandatory ? col.slice(0, -1) : col;
                                        let label = templateOptions.find(o => o.value === cleanCol)?.label || cleanCol;
                                        
                                        // Clean up label display
                                        if (label.includes('|')) label = label.split('|')[0];
                                        if (label.endsWith('_id')) label = label.slice(0, -3);
                                        if (label.endsWith(' (ID)')) label = label.slice(0, -5);

                                        return (
                                            <div key={idx} className={`group px-2 py-1 rounded text-xs font-mono border shadow-sm flex items-center gap-2 ${isMandatory ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                                                <div className="flex items-center gap-1.5 cursor-pointer select-none" onClick={() => toggleMandatory(idx)} title={isMandatory ? "Klik untuk tidak wajib" : "Klik untuk wajib"}>
                                                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${isMandatory ? 'bg-red-500 border-red-500 text-white' : 'border-gray-300 bg-white hover:border-gray-400'}`}>
                                                        {isMandatory && <CheckCircle className="w-2.5 h-2.5" />}
                                                    </div>
                                                    <span className={isMandatory ? 'font-medium text-red-700' : 'text-gray-700'}>{label}{isMandatory ? '*' : ''}</span>
                                                </div>
                                                <button 
                                                    onClick={() => handleRemoveColumn(idx)}
                                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-1 border-l pl-1 border-gray-200"
                                                    title="Hapus kolom"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    {columns.length === 0 && <span className="text-xs text-gray-400 italic">Belum ada kolom dipilih</span>}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-2">
                                <input 
                                    type="checkbox" 
                                    id="has-header" 
                                    checked={hasHeader} 
                                    onChange={(e) => setHasHeader(e.target.checked)}
                                    className="rounded border-gray-300 text-primary focus:ring-indigo-500" 
                                />
                                <label htmlFor="has-header" className="text-xs text-gray-600">File memiliki header (baris pertama akan diabaikan)</label>
                            </div>
                        </div>

                        <textarea 
                            value={pasteData}
                            onChange={(e) => setPasteData(e.target.value)}
                            className="w-full h-36 border border-gray-300 rounded p-2 text-sm font-mono" 
                            placeholder="Tempel di sini (Ctrl+V)"
                        ></textarea>

                        {previewData.length > 0 && (
                            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 text-xs font-semibold text-gray-700 flex justify-between items-center">
                                    <span>Pratinjau Data (5 Baris Pertama)</span>
                                    <span className="text-xs text-gray-500 font-normal">Pastikan urutan kolom sesuai dengan template di atas</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {columns.map((col, idx) => (
                                                    <th key={idx} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                                        {templateOptions.find(o => o.value === col)?.label || col}
                                                    </th>
                                                ))}
                                                {/* Add extra header for potential extra columns in data */}
                                                {previewData[0] && previewData[0].length > columns.length && (
                                                    <th className="px-3 py-2 text-left text-xs font-medium text-red-500 uppercase tracking-wider whitespace-nowrap">
                                                        + {previewData[0].length - columns.length} Kolom Berlebih
                                                    </th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {previewData.map((row, rIdx) => (
                                                <tr key={rIdx} className="hover:bg-gray-50">
                                                    {row.slice(0, columns.length).map((cell, cIdx) => (
                                                        <td key={cIdx} className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 border-r last:border-r-0 border-gray-100">
                                                            {cell}
                                                        </td>
                                                    ))}
                                                    {/* Handle extra columns in data */}
                                                    {row.length > columns.length && (
                                                        <td className="px-3 py-2 whitespace-nowrap text-xs text-red-500 italic bg-red-50">
                                                            {row.slice(columns.length).join(', ')}
                                                        </td>
                                                    )}
                                                    {/* Handle missing columns */}
                                                    {row.length < columns.length && Array(columns.length - row.length).fill(0).map((_, i) => (
                                                        <td key={`empty-${i}`} className="px-3 py-2 whitespace-nowrap text-xs text-gray-400 italic bg-gray-50">
                                                            (Kosong)
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                        <button 
                            type="button" 
                            onClick={handleImport} 
                            disabled={isProcessing}
                            className="w-full inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-white font-medium hover:bg-indigo-700 sm:w-auto sm:text-sm disabled:opacity-50"
                        >
                            {isProcessing ? 'Memproses...' : 'Impor'}
                        </button>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isProcessing}
                            className="w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 sm:w-auto sm:text-sm"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CheckSummaryModal({ isOpen, onClose, data, onConfirm }) {
    if (!isOpen || !data) return null;

    const stats = data.stats || {};
    
    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
                <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
                    <div className="bg-emerald-600 px-4 py-3 sm:px-6 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Hasil Pemeriksaan Peserta</h3>
                        <button onClick={onClose} className="text-emerald-100 hover:text-white focus:outline-none">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-emerald-600">{stats.existing || 0}</div>
                                <div className="text-xs text-emerald-700 font-medium mt-1">Sudah di Sistem</div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-secondary">{stats.new || 0}</div>
                                <div className="text-xs text-blue-700 font-medium mt-1">Peserta Baru</div>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-amber-600">{stats.linked || 0}</div>
                                <div className="text-xs text-amber-700 font-medium mt-1">Sudah di Kegiatan</div>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-red-600">{stats.invalid || 0}</div>
                                <div className="text-xs text-red-700 font-medium mt-1">Email Tidak Valid</div>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm text-gray-700">
                            <p>Data di atas adalah hasil pemeriksaan awal berdasarkan email peserta.</p>
                            <p className="text-xs text-gray-500">Peserta dengan email tidak valid akan dilewati dari proses impor.</p>
                        </div>
                    </div>
                    <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                        <button 
                            type="button" 
                            onClick={() => onConfirm(data.import_id)} 
                            className="w-full inline-flex justify-center rounded-md bg-emerald-600 text-white px-4 py-2 font-medium hover:bg-emerald-700 sm:w-auto sm:text-sm"
                        >
                            Lanjut Impor
                        </button>
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="w-full inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 font-medium hover:bg-gray-50 sm:w-auto sm:text-sm"
                        >
                            Batalkan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ResultModal({ isOpen, onClose, data }) {
    if (!isOpen) return null;

    // Safety check for data
    if (!data) {
        return (
            <div className="fixed inset-0 z-50 overflow-y-auto">
                <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                    <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle p-6">
                        <div className="text-center">
                            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Data Hasil Tidak Tersedia</h3>
                            <p className="mt-2 text-sm text-gray-500">Maaf, data hasil impor tidak dapat ditampilkan.</p>
                            <div className="mt-4">
                                <button
                                    onClick={onClose}
                                    className="inline-flex justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const stats = data.stats || {};
    // Fallback for backward compatibility or if stats is missing keys
    const newUsers = stats.new_users ?? data.inserted ?? 0;
    const existingUsers = stats.existing_users ?? 0;
    const newParticipants = stats.new_participants ?? data.linked ?? 0;
    const alreadyRegistered = stats.already_registered ?? data.already_linked ?? 0;
    const totalBill = stats.total_bill ?? 0;
    const skipped = data.skipped ?? 0;
    const failed = data.failed ?? 0;
    const isPaymentAvailable = data.bulk_payment_available;
    const redirectUrl = data.redirect_url;

    // Helper for currency
    const formatCurrency = (amount) => {
        try {
            return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
        } catch (e) {
            return amount;
        }
    };

    const handleComplete = () => {
        if (isPaymentAvailable && redirectUrl) {
            window.location.href = redirectUrl;
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
                <span className="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
                <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
                    <div className="bg-emerald-600 px-4 py-3 sm:px-6 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white">Hasil Impor Peserta</h3>
                        <button onClick={onClose} className="text-emerald-100 hover:text-white focus:outline-none">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        
                        {isPaymentAvailable && (
                             <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center mb-6">
                                 <h4 className="text-lg font-bold text-primary mb-1">Pembayaran Diperlukan</h4>
                                 <p className="text-sm text-indigo-700">
                                     Pendaftaran berhasil, namun pembayaran diperlukan untuk menyelesaikan proses.
                                 </p>
                             </div>
                        )}

                        <h4 className="font-medium text-gray-900 mb-3">Statistik User</h4>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-secondary">{newUsers}</div>
                                <div className="text-xs text-blue-700 font-medium mt-1">User Baru</div>
                            </div>
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-gray-600">{existingUsers}</div>
                                <div className="text-xs text-gray-700 font-medium mt-1">User Lama (Updated)</div>
                            </div>
                        </div>

                        <h4 className="font-medium text-gray-900 mb-3">Statistik Peserta Kegiatan</h4>
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-emerald-600">{newParticipants}</div>
                                <div className="text-xs text-emerald-700 font-medium mt-1">Peserta Baru Terdaftar</div>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                                <div className="text-2xl font-bold text-amber-600">{alreadyRegistered}</div>
                                <div className="text-xs text-amber-700 font-medium mt-1">Sudah Terdaftar Sebelumnya</div>
                            </div>
                        </div>

                        {(skipped > 0 || failed > 0) && (
                             <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-yellow-600">{skipped}</div>
                                    <div className="text-xs text-yellow-700 font-medium mt-1">Dilewati (Skipped)</div>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                    <div className="text-2xl font-bold text-red-600">{failed}</div>
                                    <div className="text-xs text-red-700 font-medium mt-1">Gagal</div>
                                </div>
                            </div>
                        )}

                        {totalBill > 0 && (
                            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-center mb-6">
                                <h4 className="text-sm font-medium text-primary mb-1">Potensi Tagihan Peserta Baru</h4>
                                <div className="text-3xl font-bold text-indigo-700">{formatCurrency(totalBill)}</div>
                                <p className="text-xs text-primary mt-2">
                                    ({newParticipants} peserta x {formatCurrency(totalBill / (newParticipants || 1))})
                                </p>
                            </div>
                        )}

                    </div>
                    <div className="px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
                        <button 
                            type="button" 
                            onClick={handleComplete} 
                            className={`w-full inline-flex justify-center rounded-md px-4 py-2 font-medium sm:w-auto sm:text-sm ${isPaymentAvailable ? 'bg-primary text-white hover:bg-indigo-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                        >
                            {isPaymentAvailable ? 'Lanjut ke Pembayaran' : 'Selesai'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ImportModals Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-500 bg-opacity-75">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-lg w-full">
                        <h3 className="text-lg font-bold text-red-600 mb-2">Terjadi Kesalahan</h3>
                        <p className="text-sm text-gray-700 mb-4">Maaf, terjadi kesalahan saat menampilkan modal impor.</p>
                        <div className="bg-gray-100 p-3 rounded text-xs font-mono mb-4 overflow-auto max-h-40">
                            {this.state.error && this.state.error.toString()}
                        </div>
                        <button 
                            onClick={() => {
                                this.setState({ hasError: false });
                                if (this.props.onClose) this.props.onClose();
                            }}
                            className="w-full bg-primary text-white py-2 rounded hover:bg-indigo-700"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default function ImportModals({ show, onClose, activity, onRegionLookup }) {
    const [step, setStep] = useState('input'); // input, check, result
    const [checkData, setCheckData] = useState(null);
    const [resultData, setResultData] = useState(null);

    // Reset step when modal is closed or opened
    React.useEffect(() => {
        if (show) {
            setStep('input');
            setCheckData(null);
            setResultData(null);
        }
    }, [show]);

    // Safety check: if step is result but no data, go back to input
    React.useEffect(() => {
        if (show && step === 'result' && !resultData) {
            console.warn('ImportModals: Step is result but no data. Resetting to input.');
            setStep('input');
        }
    }, [step, resultData, show]);

    const handleCheckSuccess = (data) => {
        // Backend currently performs import immediately, so we go straight to result
        console.log('Import Result Data:', data);
        if (data) {
            setResultData(data);
            setStep('result');
        } else {
            alert('Data hasil impor tidak valid.');
        }
    };

    const handleConfirmSuccess = (data) => {
        setResultData(data);
        setStep('result');
    };

    if (!show) return null;

    return (
        <ErrorBoundary onClose={onClose}>
            <ImportModal 
                isOpen={show && step === 'input'} 
                onClose={onClose} 
                activity={activity}
                onCheckSuccess={handleCheckSuccess}
                onRegionLookup={onRegionLookup}
            />

            <CheckSummaryModal
                isOpen={show && step === 'check'}
                onClose={onClose}
                data={checkData}
                onConfirm={handleConfirmSuccess}
                onBack={() => setStep('input')}
                activity={activity}
            />

            <ResultModal
                isOpen={show && step === 'result'}
                onClose={onClose}
                data={resultData}
            />
        </ErrorBoundary>
    );
}

