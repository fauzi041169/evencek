import React, { useState, useEffect } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';

export default function MissingDataModal({ show, onClose, missingData = [], onSuccess }) {
    const { auth } = usePage().props;
    const [previewUrl, setPreviewUrl] = useState(auth?.user?.profile_photo_url || null);
    
    // Icon map matching the blade file
    const iconMap = {
        'name': 'fa-user',
        'email': 'fa-envelope',
        'phone': 'fa-phone',
        'whatsapp': 'fa-whatsapp',
        'gender': 'fa-venus-mars',
        'jenis_kelamin': 'fa-venus-mars',
        'address': 'fa-map-marker-alt',
        'instansi': 'fa-building',
        'jabatan': 'fa-briefcase',
        'job_title': 'fa-briefcase',
        'kategori': 'fa-tag',
        'category': 'fa-tag',
        'ukuran_kaos': 'fa-tshirt',
        'shirt_size': 'fa-tshirt',
        'ukuran_sepatu': 'fa-shoe-prints',
        'shoe_size': 'fa-shoe-prints',
        'province_id': 'fa-map',
        'regency_id': 'fa-city',
        'city_id': 'fa-city',
        'district_id': 'fa-map-signs',
        'foto': 'fa-camera',
        'photo': 'fa-camera'
    };

    const { data, setData, post, processing, errors, reset } = useForm({
        _method: 'PUT',
        foto_file: null,
        // Dynamic fields will be added here
    });

    // Initialize form data based on missing fields
    useEffect(() => {
        if (show && missingData.length > 0) {
            const initialData = { _method: 'PUT' };
            missingData.forEach(field => {
                initialData[field.key] = field.value || '';
            });
            setData(initialData);
        }
    }, [show, missingData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('profile.update'), {
            onSuccess: () => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    onClose();
                }
            },
            preserveScroll: true
        });
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('foto_file', file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        }
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <div className="bg-white w-full rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modern Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white sticky top-0 z-10 shadow-sm">
                    <div>
                        <h6 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600">
                                <i className="fas fa-user-edit text-sm"></i>
                            </span>
                            <span>Lengkapi Profil</span>
                        </h6>
                        <p className="text-xs text-gray-500 mt-1 ml-10">Data ini diperlukan untuk melanjutkan</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200 focus:outline-none"
                    >
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 p-6">
                    {/* Modern Alert Box */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 p-4 mb-6 shadow-sm">
                        <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-amber-100 rounded-full opacity-50 blur-xl"></div>
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
                                <i className="fas fa-info text-lg"></i>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-1">Perhatian</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Untuk kebutuhan ID Card acara, Anda harus melengkapi profil untuk dapat mengikuti kegiatan ini.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form id="missing-data-form" onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
                        {/* Profile Photo Section - Card Style */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <label className="block text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <i className="fas fa-camera text-indigo-500"></i>
                                Foto Profil
                            </label>
                            
                            <div className="flex flex-col sm:flex-row items-center gap-6">
                                <div className="relative group cursor-pointer">
                                    <div className="w-24 h-24 rounded-full p-1 bg-white border-2 border-indigo-100 shadow-md">
                                        <img 
                                            src={previewUrl || '/assets/images/profilefoto/default-profile.png'} 
                                            alt="Foto Profil" 
                                            className="w-full h-full rounded-full object-cover"
                                            onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                        />
                                    </div>
                                    <label htmlFor="fotoProfileInput" className="absolute bottom-0 right-0 bg-indigo-600 hover:bg-indigo-700 text-white w-8 h-8 flex items-center justify-center rounded-full cursor-pointer shadow-lg transition-transform hover:scale-110 border-2 border-white">
                                        <i className="fas fa-camera text-xs"></i>
                                    </label>
                                </div>
                                
                                <div className="flex-1 text-center sm:text-left w-full">
                                    <input 
                                        type="file" 
                                        id="fotoProfileInput" 
                                        name="foto_file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handlePhotoChange}
                                    />
                                    <label 
                                        htmlFor="fotoProfileInput"
                                        className="inline-block sm:hidden mb-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium"
                                    >
                                        Ubah Foto
                                    </label>
                                    <div className="text-sm text-gray-500 space-y-1 bg-gray-50 p-3 rounded-lg border border-dashed border-gray-300">
                                        <p className="font-medium text-gray-700">Ketentuan Foto:</p>
                                        <ul className="list-disc list-inside text-xs text-gray-500 ml-1">
                                            <li>Wajah terlihat jelas</li>
                                            <li>Format JPG/PNG (Max 20MB)</li>
                                            <li>Disarankan rasio 1:1 (Persegi)</li>
                                        </ul>
                                    </div>
                                    {errors.foto_file && <p className="text-red-500 text-xs mt-2 font-medium"><i className="fas fa-exclamation-circle mr-1"></i>{errors.foto_file}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Fields - Grid Layout */}
                        <div className="grid grid-cols-1 gap-5">
                            {missingData.map((originalField, index) => {
                                // Parse Dropdown syntax from label or key
                                // Format: "Label|Dropdown:Option1~Option2~Option3"
                                let isDropdown = originalField.type === 'select';
                                let options = originalField.options || [];
                                let label = originalField.label || originalField.key.replace(/_/g, ' ');
                                
                                // Check for custom dropdown syntax
                                // Look for |Dropdown: pattern
                                const dropdownMatch = label.match(/\|Dropdown:(.*)/i) || (originalField.key && originalField.key.match(/\|Dropdown:(.*)/i));
                                
                                if (dropdownMatch) {
                                    isDropdown = true;
                                    const optionsStr = dropdownMatch[1]; // Get "Option1~Option2"
                                    // Parse options separated by ~
                                    const parsedOptions = optionsStr.split('~').map(opt => {
                                        const cleanOpt = opt.trim();
                                        return { id: cleanOpt, name: cleanOpt };
                                    });
                                    options = parsedOptions;
                                    
                                    // Clean up the label for display
                                    // Remove the |Dropdown:... part
                                    label = label.replace(/\|Dropdown:.*/i, '').trim();
                                }

                                return (
                                <div key={index} className="relative group">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 capitalize flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 flex items-center justify-center text-xs group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600 transition-colors">
                                            <i className={`fas ${iconMap[originalField.key] || 'fa-pen'}`}></i>
                                        </span>
                                        {label} <span className="text-red-500">*</span>
                                    </label>
                                    
                                    {isDropdown ? (
                                        <div className="relative">
                                            <select
                                                value={data[originalField.key] || ''}
                                                onChange={(e) => setData(originalField.key, e.target.value)}
                                                className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-opacity-50 sm:text-sm transition-all outline-none appearance-none"
                                                required
                                            >
                                                <option value="" disabled>Pilih {label}</option>
                                                {options.map((opt) => (
                                                    <option key={opt.id || opt} value={opt.id || opt}>
                                                        {opt.name || opt}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                                <i className="fas fa-chevron-down text-xs"></i>
                                            </div>
                                        </div>
                                    ) : (
                                        <input
                                            type={originalField.type || 'text'}
                                            value={data[originalField.key] || ''}
                                            onChange={(e) => setData(originalField.key, e.target.value)}
                                            className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:ring-opacity-50 sm:text-sm transition-all outline-none placeholder-gray-400"
                                            placeholder={`Masukkan ${label}`}
                                            required
                                        />
                                    )}
                                    {errors[originalField.key] && (
                                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 animate-pulse">
                                            <i className="fas fa-exclamation-circle"></i> {errors[originalField.key]}
                                        </p>
                                    )}
                                </div>
                            )})}
                        </div>
                    </form>
                </div>

                {/* Sticky Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3 sticky bottom-0 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex justify-center items-center rounded-xl border border-gray-300 shadow-sm px-5 py-2.5 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        form="missing-data-form"
                        disabled={processing}
                        className="inline-flex justify-center items-center rounded-xl border border-transparent shadow-md px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-sm font-bold text-white hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                    >
                        {processing ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-save mr-2"></i>
                                Simpan Perubahan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
