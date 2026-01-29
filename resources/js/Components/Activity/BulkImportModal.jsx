import React, { Fragment, useState, useEffect } from 'react';
import axios from 'axios';
import { Dialog, Transition } from '@headlessui/react';
import { X, Clipboard, Upload, FileSpreadsheet, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';
import { usePage } from '@inertiajs/react';


const DEFAULT_TEMPLATE_OPTIONS = [
    { value: 'user:name', label: 'Nama Lengkap' },
    { value: 'user:email', label: 'Email' },
    { value: 'user:password', label: 'Password' },
    { value: 'profile:no_hp', label: 'No HP/WA' },
    { value: 'profile:nik', label: 'NIK' },
    { value: 'profile:gender', label: 'Jenis Kelamin (L/P)' },
    { value: 'profile:birth_place', label: 'Tempat Lahir' },
    { value: 'profile:birth_date', label: 'Tanggal Lahir (YYYY-MM-DD)' },
    { value: 'profile:address', label: 'Alamat Lengkap' },
    { value: 'province', label: 'Provinsi' },
    { value: 'regency', label: 'Kabupaten/Kota' },
    { value: 'district', label: 'Kecamatan' },
    { value: 'province_id', label: 'Provinsi' },
    { value: 'regency_id', label: 'Kabupaten/Kota' },
    { value: 'district_id', label: 'Kecamatan' },
    { value: 'profile:institution', label: 'Instansi' },
    { value: 'profile:position', label: 'Jabatan' },
];

export default function BulkImportModal({ isOpen, onClose, activityId, activity, onSuccess, onPaymentRequest, return_to }) {
    const { props } = usePage();
    const [pastedText, setPastedText] = useState('');
    const [previewData, setPreviewData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState(null);
    const [importErrors, setImportErrors] = useState(null);
    const [fileHasHeader, setFileHasHeader] = useState(true);

    const [templateOptions, setTemplateOptions] = useState(DEFAULT_TEMPLATE_OPTIONS);
    const [templateColumns, setTemplateColumns] = useState([]);

    const [mapping, setMapping] = useState({});
    const [step, setStep] = useState('paste'); // paste, map, preview, check
    const [checkData, setCheckData] = useState(null);

    const isPaidActivity = activity ? parseFloat(activity.price || 0) > 0 : false;

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setPastedText('');
            setPreviewData([]);
            setHeaders([]);
            setMapping({});
            setStep('paste');
            setImportResult(null);
            setImportErrors(null);

            // Fetch template specifically for this activity
            if (activityId) {
                axios.get(route('activity.preparation.get-import-template', activityId))
                    .then(response => {
                        if (response.data.template) {
                            const cols = response.data.template.split(',').map(c => c.trim());
                            setTemplateColumns(cols);

                            // Merge into options if not exists
                            const newOptions = [...DEFAULT_TEMPLATE_OPTIONS];
                            cols.forEach(col => {
                                const clean = col.replace('*', '');
                                if (!newOptions.find(o => o.value === clean)) {
                                    // Try to format label nicely
                                    const labelMap = {
                                        'province': 'Provinsi',
                                        'regency': 'Kabupaten/Kota',
                                        'district': 'Kecamatan',
                                        'province_id': 'Provinsi',
                                        'regency_id': 'Kabupaten/Kota',
                                        'district_id': 'Kecamatan',
                                        'no_hp': 'No HP/WA',
                                        'nik': 'NIK',
                                        'address': 'Alamat',
                                        'institution': 'Instansi',
                                        'position': 'Jabatan'
                                    };

                                    let label = clean;
                                    const bare = clean.replace('profile:', '').replace('user:', '');

                                    if (labelMap[bare]) {
                                        label = labelMap[bare];
                                    } else if (clean.startsWith('profile:')) {
                                        label = clean.replace('profile:', '').replace(/_/g, ' ');
                                        label = label.charAt(0).toUpperCase() + label.slice(1);
                                    } else if (clean.startsWith('user:')) {
                                        label = clean.replace('user:', '').replace(/_/g, ' ');
                                        label = label.charAt(0).toUpperCase() + label.slice(1);
                                    }

                                    newOptions.push({ value: clean, label: label });
                                }
                            });
                            setTemplateOptions(newOptions);
                        }
                    })
                    .catch(err => console.error('Failed to load template', err));
            }
        }
    }, [isOpen, activityId]);

    const handlePaste = (e) => {
        const text = e.target.value;
        setPastedText(text);

        // Smart detection: if first line contains '@', assume it's data (no header)
        if (text && text.trim()) {
            const firstLine = text.trim().split('\n')[0];
            if (firstLine.includes('@')) {
                setFileHasHeader(false);
            }
        }
    };

    const processPaste = () => {
        if (!pastedText.trim()) return;
        parseData(pastedText);
        setStep('map');
    };

    const parseData = (text) => {
        if (!text.trim()) {
            setPreviewData([]);
            setHeaders([]);
            return;
        }

        // Simple TSV/CSV parser (handles tabs and commas)
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) return;

        // Detect delimiter (tab, semicolon, or comma)
        const firstLine = lines[0];
        let delimiter = '\t';
        if (firstLine.includes('\t')) delimiter = '\t';
        else if (firstLine.includes(';')) delimiter = ';';
        else if (firstLine.includes(',')) delimiter = ',';

        const parsedRows = lines.map(line => line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, '')));

        let dataRows = parsedRows;
        let detectedHeaders = [];

        if (fileHasHeader) {
            detectedHeaders = parsedRows[0];
            dataRows = parsedRows.slice(1);
        } else {
            // Generate generic headers
            const colCount = parsedRows[0].length;
            for (let i = 0; i < colCount; i++) detectedHeaders.push(`Kolom ${i + 1}`);
        }

        setHeaders(detectedHeaders);
        setPreviewData(dataRows);

        // Auto-map headers
        const newMapping = {};

        detectedHeaders.forEach((header, index) => {
            // Strategy 1: Map by Index (Prioritize template order as requested)
            // The user stated that uploaded data MUST follow template order.
            if (index < templateColumns.length) {
                // Remove asterisk if present to match option values
                const cleanCol = templateColumns[index].replace('*', '');
                newMapping[index] = cleanCol;
                return;
            }

            // Strategy 2: Map by Header Name (Fallback for extra columns)
            if (fileHasHeader) {
                const lowerHeader = header.toLowerCase();
                // Find best match in templateOptions
                const match = templateOptions.find(opt =>
                    opt.label.toLowerCase().includes(lowerHeader) ||
                    opt.value.toLowerCase() === lowerHeader ||
                    (lowerHeader.includes('nama') && opt.value === 'user:name') ||
                    (lowerHeader.includes('email') && opt.value === 'user:email') ||
                    (lowerHeader.includes('hp') && opt.value === 'profile:no_hp')
                );

                if (match) {
                    newMapping[index] = match.value;
                }
            }
        });

        setMapping(newMapping);
    };

    // Re-parse when fileHasHeader changes, pastedText updates, or template changes
    useEffect(() => {
        if (pastedText) {
            parseData(pastedText);
        }
    }, [fileHasHeader, pastedText, templateOptions, templateColumns]);

    const handleMappingChange = (index, value) => {
        setMapping(prev => ({
            ...prev,
            [index]: value
        }));
    };

    const handleImport = async (forceFull = false) => {
        setIsImporting(true);
        setImportResult(null);
        setImportErrors(null);

        const isPreview = isPaidActivity && !forceFull && step === 'preview';

        try {


            // Construct CSV content from previewData and mapping
            // The backend expects a file with headers matching the mapped fields
            const csvHeaderRow = headers.map((_, index) => mapping[index] || `col_${index}`);
            console.log('[DEBUG] Sending CSV Headers:', csvHeaderRow);

            const escapeCsvCell = (cell) => {
                if (cell === null || cell === undefined) return '';
                const str = String(cell);
                if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };

            const csvContent = [
                csvHeaderRow.map(escapeCsvCell).join(','),
                ...previewData.map(row => row.map(escapeCsvCell).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const file = new File([blob], 'import_data.csv', { type: 'text/csv' });

            const formData = new FormData();
            formData.append('file', file);
            if (return_to) {
                formData.append('return_to', return_to);
            }
            if (isPreview) {
                formData.append('preview', '1');
            }
            // formData.append('mapping', JSON.stringify(mapping)); // Not needed as we baked it into the CSV header

            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');



            const response = await fetch(route('activity.preparation.import-participants', activityId), {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken
                }
            });



            const result = await response.json();

            if (result.success || result.status === 'success') {
                if (result.is_preview) {
                    setCheckData(result);
                    setStep('check');
                } else {
                    setImportResult(result.stats ? result : (result.data || result));
                    // if (onSuccess) onSuccess(); // Do not close immediately, let user see stats
                }
            } else {
                console.error('[DEBUG] Import Failed:', result);
                setImportErrors(result.errors || [{ row: 0, email: 'Unknown', name: 'Unknown', error: result.message || 'Import failed' }]);
            }

        } catch (error) {
            console.error('[DEBUG] Import Exception:', error);
            setImportErrors([{ row: 0, error: 'Network or server error: ' + (error.message || String(error)) }]);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <>
            <Transition appear show={isOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/25" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                                    <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center">
                                        <Dialog.Title as="h3" className="text-lg font-bold text-white">
                                            Tempel Data dari Excel/CSV
                                        </Dialog.Title>
                                        <button onClick={onClose} className="text-indigo-100 hover:text-white">
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>

                                    <div className="p-6">
                                        {!importResult && !importErrors && (
                                            <>
                                                {step === 'paste' && (
                                                    <div className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                                            Template Kolom yang Didukung
                                                        </label>
                                                        <div className="flex flex-wrap gap-2 text-xs text-gray-600 mb-4">
                                                            {(templateColumns.length > 0 ? templateColumns : templateOptions.map(o => o.value)).map(col => {
                                                                const isMandatory = col.endsWith('*');
                                                                const cleanCol = isMandatory ? col.slice(0, -1) : col;
                                                                const option = templateOptions.find(o => o.value === cleanCol);
                                                                let label = option ? option.label : cleanCol;

                                                                // If it's a dropdown/custom column, only show the name part
                                                                if (label.includes('|')) {
                                                                    label = label.split('|')[0];
                                                                }

                                                                return (
                                                                    <span key={col} className={`px-2 py-1 rounded border ${isMandatory ? 'bg-red-50 border-red-200 text-red-700 font-medium' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
                                                                        {label}{isMandatory && '*'}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>

                                                        <div className="flex gap-2 mb-4">

                                                            <a
                                                                href={route('activity.preparation.download-participants-template', activityId)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 text-white px-3 py-2 text-sm font-medium hover:bg-orange-600 transition-colors"
                                                            >
                                                                <FileSpreadsheet className="w-4 h-4" />
                                                                Unduh Template .xlsx
                                                            </a>
                                                        </div>

                                                        <div className="flex items-center gap-2 mb-2">
                                                            <input
                                                                type="checkbox"
                                                                id="has-header"
                                                                checked={fileHasHeader}
                                                                onChange={(e) => setFileHasHeader(e.target.checked)}
                                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <label htmlFor="has-header" className="text-sm text-gray-700">
                                                                Baris pertama adalah header
                                                            </label>
                                                        </div>

                                                        <p className="text-sm text-gray-600 mb-2">
                                                            Salin data dari Excel lalu tempel di bawah ini:
                                                        </p>
                                                        <textarea
                                                            value={pastedText}
                                                            onChange={handlePaste}
                                                            className="w-full h-40 border border-gray-300 rounded-lg p-3 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-4"
                                                            placeholder="Paste data here..."
                                                        />

                                                        {previewData.length > 0 && (
                                                            <div className="mt-4">
                                                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                                    Pratinjau & Pemetaan Data
                                                                </h4>
                                                                <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-80 mb-4">
                                                                    <table className="min-w-full divide-y divide-gray-200 relative">
                                                                        <thead className="bg-gray-50 sticky top-0 z-10">
                                                                            <tr>
                                                                                {headers.map((header, index) => (
                                                                                    <th key={index} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50 min-w-[180px]">
                                                                                        <div className="mb-1 text-gray-400 text-[10px] truncate" title={header}>{header}</div>
                                                                                        <select
                                                                                            value={mapping[index] || ''}
                                                                                            onChange={(e) => handleMappingChange(index, e.target.value)}
                                                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1"
                                                                                        >
                                                                                            <option value="">-- Abaikan --</option>
                                                                                            {templateOptions.map(opt => (
                                                                                                <option key={opt.value} value={opt.value}>
                                                                                                    {opt.label}
                                                                                                </option>
                                                                                            ))}
                                                                                        </select>
                                                                                    </th>
                                                                                ))}
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                                            {previewData.slice(0, 100).map((row, rIndex) => (
                                                                                <tr key={rIndex}>
                                                                                    {row.map((cell, cIndex) => (
                                                                                        <td key={cIndex} className={`px-3 py-2 text-sm whitespace-nowrap ${mapping[cIndex] ? 'text-gray-900' : 'text-gray-400'}`}>
                                                                                            {cell}
                                                                                        </td>
                                                                                    ))}
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                    </table>
                                                                    {previewData.length > 100 && (
                                                                        <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 border-t">
                                                                            ...dan {previewData.length - 100} baris lainnya
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {step === 'map' && (
                                                    <div className="mb-4">
                                                        <h4 className="text-sm font-medium text-gray-700 mb-4">Petakan Kolom CSV ke Data Peserta</h4>
                                                        <div className="max-h-[60vh] overflow-y-auto pr-2">
                                                            {headers.map((header, index) => (
                                                                <div key={index} className="flex items-center gap-4 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                                    <div className="w-1/3">
                                                                        <label className="text-xs text-gray-500 block">Kolom CSV</label>
                                                                        <div className="font-medium text-gray-900 truncate" title={header}>{header}</div>
                                                                        {previewData.length > 0 && (
                                                                            <div className="text-xs text-gray-400 mt-1 truncate">
                                                                                Contoh: {previewData[0][index]}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="w-8 flex justify-center text-gray-400">
                                                                        <i className="fas fa-arrow-right"></i>
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <label className="text-xs text-gray-500 block mb-1">Petakan ke Field</label>
                                                                        <select
                                                                            value={mapping[index] || ''}
                                                                            onChange={(e) => handleMappingChange(index, e.target.value)}
                                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                                        >
                                                                            <option value="">-- Abaikan Kolom Ini --</option>
                                                                            {templateOptions.map(opt => (
                                                                                <option key={opt.value} value={opt.value}>
                                                                                    {opt.label}
                                                                                </option>
                                                                            ))}
                                                                        </select>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        <div className="flex justify-between mt-6">
                                                            <button
                                                                onClick={() => setStep('paste')}
                                                                className="text-gray-600 hover:text-gray-900 font-medium text-sm"
                                                            >
                                                                Kembali
                                                            </button>
                                                            <button
                                                                onClick={() => setStep('preview')}
                                                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 transition-colors"
                                                            >
                                                                Lanjut ke Pratinjau
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {step === 'preview' && (
                                                    <div className="mt-4">
                                                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                                                            Pratinjau Data yang Akan Diimpor
                                                        </h4>
                                                        <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-60 mb-4">
                                                            <table className="min-w-full divide-y divide-gray-200">
                                                                <thead className="bg-gray-50">
                                                                    <tr>
                                                                        {headers.map((h, i) => mapping[i] ? (
                                                                            <th key={i} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap bg-green-50">
                                                                                {templateOptions.find(t => t.value === mapping[i])?.label || mapping[i]}
                                                                            </th>
                                                                        ) : null)}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white divide-y divide-gray-200">
                                                                    {previewData.slice(0, 10).map((row, i) => (
                                                                        <tr key={i}>
                                                                            {row.map((cell, j) => mapping[j] ? (
                                                                                <td key={j} className="px-3 py-2 text-sm text-gray-500 whitespace-nowrap">
                                                                                    {cell}
                                                                                </td>
                                                                            ) : null)}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                            {previewData.length > 10 && (
                                                                <div className="p-2 text-center text-xs text-gray-500 bg-gray-50 border-t">
                                                                    ...dan {previewData.length - 10} baris lainnya
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex justify-between">
                                                            <button
                                                                onClick={() => setStep('map')}
                                                                className="text-gray-600 hover:text-gray-900 font-medium text-sm"
                                                                disabled={isImporting}
                                                            >
                                                                Kembali
                                                            </button>
                                                            <button
                                                                onClick={() => handleImport(false)}
                                                                disabled={isImporting}
                                                                className="inline-flex items-center gap-2 rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                                            >
                                                                {isImporting ? (
                                                                    <>
                                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                        {isPaidActivity ? 'Cek Validasi...' : 'Mengimpor...'}
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Upload className="w-4 h-4" />
                                                                        {isPaidActivity ? 'Cek Validasi' : 'Mulai Impor'}
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {step === 'check' && checkData && (
                                                    <div className="mt-4">
                                                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
                                                            <div className="flex items-center gap-3 mb-4">
                                                                <CheckCircle className="w-6 h-6 text-emerald-600" />
                                                                <h4 className="text-lg font-bold text-emerald-800">Pratinjau Hasil Impor</h4>
                                                            </div>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                                <div className="text-center">
                                                                    <div className="text-xl font-bold text-emerald-700">{checkData.stats?.new_users || 0}</div>
                                                                    <div className="text-[10px] text-emerald-600 uppercase font-bold">User Baru</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-xl font-bold text-blue-700">{checkData.stats?.existing_users || 0}</div>
                                                                    <div className="text-[10px] text-blue-600 uppercase font-bold">User Lama</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-xl font-bold text-amber-700">{checkData.stats?.already_registered || 0}</div>
                                                                    <div className="text-[10px] text-amber-600 uppercase font-bold">Terdaftar</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-xl font-bold text-red-700">{checkData.stats?.invalid || 0}</div>
                                                                    <div className="text-[10px] text-red-600 uppercase font-bold">Gagal/Skip</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {Number(checkData.stats?.total_bill || 0) > 0 && (
                                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center gap-4">
                                                                <div className="bg-amber-100 rounded-full p-3">
                                                                    <AlertCircle className="w-6 h-6 text-amber-600" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-bold text-amber-800">Tagihan Pembayaran</h4>
                                                                    <div className="text-2xl font-black text-amber-900">
                                                                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(checkData.stats.total_bill)}
                                                                    </div>
                                                                    <p className="text-xs text-amber-700">Tagihan akan dibuat otomatis untuk setiap peserta baru.</p>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex justify-between items-center bg-gray-50 -mx-6 -mb-6 p-6 mt-6">
                                                            <button
                                                                onClick={() => setStep('preview')}
                                                                className="text-gray-600 hover:text-gray-900 font-medium text-sm"
                                                                disabled={isImporting}
                                                            >
                                                                Kembali
                                                            </button>
                                                            <button
                                                                onClick={() => handleImport(true)}
                                                                disabled={isImporting}
                                                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30"
                                                            >
                                                                {isImporting ? (
                                                                    <>
                                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                        Memproses...
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle className="w-4 h-4" />
                                                                        Konfirmasi & Impor Sekarang
                                                                    </>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        {importResult && (
                                            <div className="text-center py-6">
                                                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
                                                    <CheckCircle className="h-10 w-10 text-green-600" />
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">Impor Berhasil</h3>

                                                {importResult.stats ? (
                                                    <div className="max-w-xl mx-auto mt-4">
                                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                                <div className="text-2xl font-bold text-blue-600">{importResult.stats.new_users || 0}</div>
                                                                <div className="text-xs text-blue-800">User Baru</div>
                                                            </div>
                                                            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                                                <div className="text-2xl font-bold text-green-600">{importResult.stats.new_participants || 0}</div>
                                                                <div className="text-xs text-green-800">Peserta Baru</div>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-3">
                                                            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                                                                <div className="text-xl font-bold text-amber-600">{importResult.stats.already_registered || 0}</div>
                                                                <div className="text-xs text-amber-800">Sudah Ada</div>
                                                            </div>
                                                            <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                                                <div className="text-xl font-bold text-yellow-600">{importResult.skipped || 0}</div>
                                                                <div className="text-xs text-yellow-800">Dilewati</div>
                                                            </div>
                                                            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                                                <div className="text-xl font-bold text-red-600">{importResult.failed || (importResult.failures ? importResult.failures.length : 0)}</div>
                                                                <div className="text-xs text-red-800">Gagal</div>
                                                            </div>
                                                        </div>
                                                        {importResult.stats.total_bill > 0 && (
                                                            <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                                                <div className="text-xs text-indigo-800 mb-1">Total Tagihan Peserta Baru</div>
                                                                <div className="text-xl font-bold text-indigo-700">
                                                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(importResult.stats.total_bill)}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-4 gap-4 max-w-lg mx-auto mt-4">
                                                        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                                            <div className="text-2xl font-bold text-green-600">{importResult.linked || 0}</div>
                                                            <div className="text-xs text-green-800">Dihubungkan</div>
                                                        </div>
                                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                                            <div className="text-2xl font-bold text-blue-600">{importResult.inserted || 0}</div>
                                                            <div className="text-xs text-blue-800">Baru</div>
                                                        </div>
                                                        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                                            <div className="text-2xl font-bold text-yellow-600">{importResult.skipped || 0}</div>
                                                            <div className="text-xs text-yellow-800">Dilewati</div>
                                                        </div>
                                                        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                                            <div className="text-2xl font-bold text-red-600">{importResult.failed || (importResult.failures ? importResult.failures.length : 0)}</div>
                                                            <div className="text-xs text-red-800">Gagal</div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Download Credentials Button */}
                                                <div className="mt-6 flex justify-center">
                                                    <a
                                                        href={route('activity.preparation.download-import-result-excel', activityId)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 text-white px-5 py-2.5 text-sm font-bold hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-emerald-500/30 border border-emerald-400"
                                                    >
                                                        <FileSpreadsheet className="w-5 h-5" />
                                                        Unduh Hasil & Akun Peserta (.xlsx)
                                                    </a>
                                                </div>

                                                {importResult.bulk_payment_available && (
                                                    <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 text-sm">
                                                        <p className="font-bold text-lg mb-1">Pembayaran Diperlukan</p>
                                                        <p>Silakan klik tombol "Lanjut ke Pembayaran" untuk menyelesaikan pendaftaran {importResult.stats?.new_participants || importResult.linked} peserta baru.</p>
                                                    </div>
                                                )}
                                                {/* Failure List (if any) */}
                                                {importResult.failures && importResult.failures.length > 0 && (
                                                    <div className="mt-8 text-left">
                                                        <div className="flex items-center gap-2 text-red-600 mb-3 ml-1">
                                                            <AlertCircle className="w-5 h-5" />
                                                            <h4 className="text-sm font-bold uppercase tracking-wider">Detail Kesalahan ({importResult.failures.length})</h4>
                                                        </div>
                                                        <div className="overflow-hidden border border-red-100 rounded-xl bg-red-50/30">
                                                            <div className="max-h-60 overflow-y-auto">
                                                                <table className="min-w-full divide-y divide-red-100">
                                                                    <thead className="bg-red-50/50 sticky top-0 backdrop-blur-sm">
                                                                        <tr>
                                                                            <th className="px-4 py-2 text-left text-[10px] font-bold text-red-800 uppercase tracking-widest">Baris</th>
                                                                            <th className="px-4 py-2 text-left text-[10px] font-bold text-red-800 uppercase tracking-widest">Email</th>
                                                                            <th className="px-4 py-2 text-left text-[10px] font-bold text-red-800 uppercase tracking-widest">Alasan Kesalahan</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-red-100">
                                                                        {importResult.failures.map((err, i) => (
                                                                            <tr key={i} className="hover:bg-red-50/50 transition-colors">
                                                                                <td className="px-4 py-2.5 text-xs font-mono text-red-900 leading-relaxed font-bold">{err.row || i + 1}</td>
                                                                                <td className="px-4 py-2.5 text-xs text-red-700 leading-relaxed truncate max-w-[150px]" title={err.email}>{err.email || '-'}</td>
                                                                                <td className="px-4 py-2.5 text-xs text-red-600 leading-relaxed font-medium">
                                                                                    {err.error || err.reason || (typeof err === 'string' ? err : 'Terjadi kesalahan tidak diketahui')}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </div>
                                                        <p className="mt-2 text-[10px] text-red-400 italic ml-1">* Silakan perbaiki data pada baris di atas dan impor kembali.</p>
                                                    </div>
                                                )}

                                            </div>
                                        )}

                                        {importErrors && (
                                            <div className="py-4">
                                                <div className="flex items-center gap-2 text-red-600 mb-4">
                                                    <AlertCircle className="w-6 h-6" />
                                                    <h3 className="text-lg font-bold">Gagal Mengimpor</h3>
                                                </div>
                                                <div className="overflow-auto max-h-96 border border-red-200 rounded-lg shadow-sm">
                                                    <table className="min-w-full divide-y divide-red-200">
                                                        <thead className="bg-red-50">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-red-800 uppercase">Row</th>
                                                                <th className="px-4 py-2 text-left text-xs font-medium text-red-800 uppercase">Error</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-red-100">
                                                            {Array.isArray(importErrors) ? importErrors.map((err, i) => (
                                                                <tr key={i}>
                                                                    <td className="px-4 py-2 text-sm text-gray-900">{err.row || i + 1}</td>
                                                                    <td className="px-4 py-2 text-sm text-red-600">
                                                                        {err.error || err.reason || (typeof err === 'string' ? err : JSON.stringify(err))}
                                                                    </td>
                                                                </tr>
                                                            )) : (
                                                                <tr>
                                                                    <td colSpan="2" className="px-4 py-2 text-sm text-red-600">{JSON.stringify(importErrors)}</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 px-6 py-3 flex flex-row-reverse gap-2">
                                        {!importResult && !importErrors && (
                                            <button
                                                type="button"
                                                className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                                                onClick={handleImport}
                                                disabled={previewData.length === 0 || isImporting}
                                            >
                                                {isImporting ? 'Mengimpor...' : 'Impor Data'}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className={`mt-3 inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm sm:mt-0 sm:w-auto ${importResult && importResult.bulk_payment_available ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-white text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}
                                            onClick={() => {
                                                if (importResult && importResult.bulk_payment_available && onPaymentRequest) {
                                                    onPaymentRequest(importResult);
                                                } else if (importResult && importResult.redirect_url) {
                                                    window.location.href = importResult.redirect_url;
                                                } else if (importResult && onSuccess) {
                                                    onSuccess();
                                                } else {
                                                    onClose();
                                                }
                                            }}
                                        >
                                            {importResult ? (importResult.bulk_payment_available ? 'Lanjut ke Pembayaran' : 'Selesai') : 'Tutup'}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>


        </>
    );
}
