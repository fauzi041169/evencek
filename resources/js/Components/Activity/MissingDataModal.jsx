import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import Cropper from 'react-easy-crop';
import Swal from 'sweetalert2';
import getCroppedImg from '@/Utils/canvasUtils';
import axios from 'axios';

export default function MissingDataModal({ show, onClose, missingData = [], onSuccess, activityId = null }) {
    const { t } = useTranslation();
    const { auth } = usePage().props;
    const [previewUrl, setPreviewUrl] = useState(auth?.user?.profile_photo_url || null);

    // region states
    const [provinces, setProvinces] = useState([]);
    const [regencies, setRegencies] = useState([]);
    const [districts, setDistricts] = useState([]);

    // Cropper State
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [showCropper, setShowCropper] = useState(false);

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

    // Hanya placeholder yang wajib diganti. Foto dari Google, Gravatar, email, dll dianggap valid.
    const hasDefaultPhoto = useMemo(() => {
        const photoUrl = (auth?.user?.profile_photo_url || '').toLowerCase();
        if (!photoUrl) return true;
        if (photoUrl.includes('default-profile.png')) return true;
        if (photoUrl.includes('ui-avatars.com')) return true;
        return false;
    }, [auth?.user?.profile_photo_url]);

    // Calculate effective missing data
    const effectiveMissingData = useMemo(() => {
        let newData = [...missingData];

        // Define logical sort order
        const sortOrder = [
            'foto', 'photo',
            'name', 'nama',
            'email',
            'gender', 'jenis_kelamin',
            'no_hp', 'phone', 'whatsapp',
            'province_id',
            'regency_id',
            'district_id',
            'address', 'alamat',
            'instansi',
            'jabatan', 'job_title',
            'pekerjaan',
            'kategori', 'category'
        ];

        // Sort the fields
        newData.sort((a, b) => {
            const indexA = sortOrder.indexOf(a.key);
            const indexB = sortOrder.indexOf(b.key);

            // If both are in the list, sort by defined order
            if (indexA !== -1 && indexB !== -1) return indexA - indexB;

            // If only A is in list, it goes first
            if (indexA !== -1) return -1;

            // If only B is in list, it goes first
            if (indexB !== -1) return 1;

            // Otherwise keep relative order (or could sort alphabetically)
            return 0;
        });

        return newData;
    }, [missingData]);

    // Initialize form data based on missing fields
    useEffect(() => {
        if (show && effectiveMissingData.length > 0) {
            const initialData = {
                _method: 'POST',
                foto_file: null,
                ...(activityId ? { activity_id: activityId } : {})
            };
            effectiveMissingData.forEach(field => {
                if (field.type === 'file' && field.value) {
                    initialData[field.key] = field.value;
                } else {
                    initialData[field.key] = field.value || '';
                }
            });
            setData(initialData);
        }
    }, [show, effectiveMissingData, activityId]);

    // Fetch Provinces on Load
    useEffect(() => {
        if (show && effectiveMissingData.some(f => f.key === 'province_id')) {
            axios.get(route('profile.ajax.provinces'))
                .then(res => setProvinces(res.data))
                .catch(err => console.error('Error fetching provinces:', err));
        }
    }, [show, effectiveMissingData]);

    // Fetch Regencies when Province changes
    useEffect(() => {
        if (data.province_id) {
            axios.get(route('profile.ajax.regencies', { province: data.province_id }))
                .then(res => {
                    setRegencies(res.data);
                })
                .catch(err => console.error('Error fetching regencies:', err));
        } else {
            setRegencies([]);
            setDistricts([]);
        }
    }, [data.province_id]);

    // Fetch Districts when Regency changes
    useEffect(() => {
        if (data.regency_id) {
            axios.get(route('profile.ajax.districts', { regency: data.regency_id }))
                .then(res => setDistricts(res.data))
                .catch(err => console.error('Error fetching districts:', err));
        } else {
            setDistricts([]);
        }
    }, [data.regency_id]);

    const handleFieldChange = (key, value) => {
        const newData = { [key]: value };

        // Cascade clear
        if (key === 'province_id') {
            newData.regency_id = '';
            newData.district_id = '';
        } else if (key === 'regency_id') {
            newData.district_id = '';
        }

        setData((prevData) => ({ ...prevData, ...newData }));
    };

    const normalizeKey = (k) => String(k).toLowerCase().trim().replace(/[\s\-]+/g, '_');
    const getFileViewUrl = (value) => {
        if (!value || value === '-') return null;
        const v = String(value).trim();
        if (v.startsWith('http://') || v.startsWith('https://')) return v;
        if (v.toLowerCase().includes('fakepath') || /^[a-zA-Z]:\\/.test(v)) return null;
        const path = v.startsWith('storage/') ? v : (v.startsWith('/') ? v.slice(1) : `storage/${v}`);
        return (typeof window !== 'undefined' ? window.location.origin : '') + '/' + path.replace(/^\/+/, '');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!isFormValid) {
            const missing = effectiveMissingData.filter(field => {
                if (field.key === 'foto' || field.key === 'photo') {
                    return !data.foto_file && hasDefaultPhoto;
                }
                if (field.type === 'file') {
                    const val = data[field.key];
                    return !val || (typeof val === 'string' && val.trim() === '');
                }
                const val = data[field.key];
                return val === null || val === undefined || String(val).trim() === '';
            }).map(f => f.label || f.key.replace(/_/g, ' '));
            const onlyFoto = missing.length === 1 && (missing[0] === 'Foto Profil' || missing[0].toLowerCase().includes('foto'));
            Swal.fire({
                title: onlyFoto ? 'Lengkapi Foto Profil' : 'Lengkapi Data',
                html: onlyFoto
                    ? 'Foto profil wajib dilengkapi untuk persyaratan kegiatan ini. Silakan unggah foto Anda di atas.'
                    : `Mohon lengkapi: <br/><strong>${missing.join(', ')}</strong>`,
                icon: 'info',
                confirmButtonText: 'Mengerti',
                confirmButtonColor: '#4F46E5'
            });
            return;
        }
        const fileFields = effectiveMissingData.filter(f => f.type === 'file' && f.key !== 'foto' && f.key !== 'photo');
        post(route('profile.update'), {
            transform: (data) => {
                const custom_files = {};
                const out = { ...data };
                fileFields.forEach(field => {
                    const val = out[field.key];
                    if (val instanceof File) {
                        custom_files[normalizeKey(field.key)] = val;
                        delete out[field.key];
                    }
                });
                if (Object.keys(custom_files).length) Object.assign(out, { custom_files });
                return out;
            },
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Profil berhasil diperbarui.',
                    timer: 1500,
                    showConfirmButton: false
                });
                try { onClose && onClose(); } catch (e) {}
                try { onSuccess && onSuccess(); } catch (e) {}
            },
            onError: (err) => {
                console.error('Profile update failed', err);
                const firstError = err && typeof err === 'object' ? Object.values(err)[0] : null;
                const msg = firstError ? String(firstError) : '';
                const isFotoRequired = /foto.*wajib|wajib.*foto|foto.*diunggah|foto.*dilengkapi/i.test(msg);
                if (isFotoRequired) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Lengkapi Foto Profil',
                        text: 'Foto profil wajib dilengkapi untuk persyaratan kegiatan ini. Silakan unggah foto Anda.',
                        confirmButtonText: 'Mengerti',
                        confirmButtonColor: '#4F46E5',
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal menyimpan',
                        text: msg || 'Terjadi kesalahan saat menyimpan data. Coba lagi.',
                    });
                }
            },
            preserveScroll: true,
            forceFormData: true,
        });
    };

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result);
                setShowCropper(true);
                // Reset file input value to allow re-selecting same file
                e.target.value = null;
            });
            reader.readAsDataURL(file);
        }
    };

    const handleCropSave = async () => {
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            // Create a File object from the Blob
            const file = new File([croppedImageBlob], "profile_photo.jpg", { type: "image/jpeg" });

            setData('foto_file', file);
            setPreviewUrl(URL.createObjectURL(croppedImageBlob));
            setShowCropper(false);
        } catch (e) {
            console.error(e);
            Swal.fire({
                title: 'Gagal',
                text: 'Gagal memproses gambar',
                icon: 'error',
                confirmButtonColor: '#E02424'
            });
        }
    };

    const handleCropCancel = () => {
        setShowCropper(false);
        setImageSrc(null);
    };

    // Check valid status
    const isFormValid = React.useMemo(() => {
        return effectiveMissingData.every(field => {
            if (field.key === 'foto' || field.key === 'photo') {
                return !!data.foto_file || !hasDefaultPhoto;
            }
            if (field.type === 'file') {
                const val = data[field.key];
                return val != null && (val instanceof File || (typeof val === 'string' && val.trim() !== '' && !String(val).toLowerCase().includes('fakepath')));
            }
            const val = data[field.key];
            return val !== null && val !== undefined && String(val).trim() !== '';
        });
    }, [data, effectiveMissingData]);

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
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 p-6 relative">

                    {/* Cropper Overlay */}
                    {showCropper && imageSrc && (
                        <div className="absolute inset-0 z-50 bg-white flex flex-col">
                            <div className="flex-1 relative bg-slate-900">
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    aspect={1}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                />
                            </div>
                            <div className="p-4 bg-white border-t border-gray-200 flex flex-col gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">Zoom</label>
                                    <input
                                        type="range"
                                        value={zoom}
                                        min={1}
                                        max={3}
                                        step={0.1}
                                        aria-labelledby="Zoom"
                                        onChange={(e) => setZoom(e.target.value)}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={handleCropCancel}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleCropSave}
                                        className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                                    >
                                        Terapkan Foto
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* Modern Alert Box */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 p-4 mb-6 shadow-sm">
                        <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-indigo-100 rounded-full opacity-50 blur-xl"></div>
                        <div className="flex items-start gap-4 relative z-10">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-sm">
                                <i className="fas fa-info-circle text-lg"></i>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-1">Persyaratan Kegiatan</h4>
                                <p className="text-sm text-gray-600 leading-relaxed">
                                    Untuk kebutuhan ID Card acara, lengkapi profil Anda termasuk <strong>foto profil</strong> agar dapat mengikuti kegiatan ini.
                                </p>
                            </div>
                        </div>
                    </div>

                    <form id="missing-data-form" onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
                        {/* Profile Photo Section - Card Style */}
                        {effectiveMissingData.some(f => f.key === 'foto' || f.key === 'photo') && (
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <label className="block text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <i className="fas fa-camera text-indigo-500"></i>
                                    <i className="fas fa-camera text-indigo-500"></i>
                                    Foto Profil {hasDefaultPhoto ? '(Wajib)' : ''}
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
                                                <li>Anda akan diminta menyesuaikan (crop) foto setelah dipilih.</li>
                                            </ul>
                                        </div>
                                        {errors.foto_file && <p className="text-red-500 text-xs mt-2 font-medium"><i className="fas fa-exclamation-circle mr-1"></i>{errors.foto_file}</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Dynamic Fields - Grid Layout */}
                        <div className="grid grid-cols-1 gap-5">
                            {effectiveMissingData
                                .filter(f => f.key !== 'foto' && f.key !== 'photo')
                                .map((originalField, index) => {
                                    // Parse Dropdown syntax from label or key
                                    // Format: "Label|Dropdown:Option1~Option2~Option3"
                                    // Custom fields use type 'dropdown', standard fields use 'select'
                                    let isDropdown = originalField.type === 'select' || originalField.type === 'dropdown';
                                    let options = originalField.options || [];

                                    // Robust options handling
                                    if (typeof options === 'string') {
                                        try {
                                            if (options.trim().startsWith('[')) {
                                                options = JSON.parse(options);
                                            } else {
                                                options = options.split(',').map(o => {
                                                    const val = o.trim();
                                                    return { id: val, name: val };
                                                });
                                            }
                                        } catch (e) {
                                            console.warn('Failed to parse options for field', originalField.key, e);
                                            options = [];
                                        }
                                    }

                                    let label = originalField.label || originalField.key.replace(/_/g, ' ');

                                    // Special handling for region fields
                                    if (originalField.key === 'province_id') {
                                        isDropdown = true;
                                        options = provinces;
                                        label = t('regions.province');
                                    } else if (originalField.key === 'regency_id') {
                                        isDropdown = true;
                                        options = regencies;
                                        label = t('regions.regency');
                                    } else if (originalField.key === 'district_id') {
                                        isDropdown = true;
                                        options = districts;
                                        label = t('regions.district');
                                    } else if (['jenis_kelamin', 'gender'].includes(originalField.key)) {
                                        isDropdown = true;
                                        options = [
                                            { id: 'L', name: 'Laki-laki' },
                                            { id: 'P', name: 'Perempuan' }
                                        ];
                                        label = 'Jenis Kelamin';
                                    }

                                    // Check for custom dropdown syntax
                                    // Look for |Dropdown: pattern
                                    const dropdownMatch = !isDropdown && (label.match(/\|Dropdown:(.*)/i) || (originalField.key && originalField.key.match(/\|Dropdown:(.*)/i)));

                                    if (dropdownMatch) {
                                        isDropdown = true;
                                        const optionsStr = dropdownMatch[1]; // Get "Option1~Option2"
                                        // Parse options separated by ~
                                        const parsedOptions = optionsStr.split('~').map(opt => {
                                            const cleanOpt = opt.trim();
                                            return { id: cleanOpt, name: cleanOpt };
                                        });
                                        options = parsedOptions;

                                        // Clean up the label for display (remove generic modifiers)
                                        // Remove |Dropdown:..., |Text, etc.
                                        label = label.replace(/\|.*/, '').trim();
                                    } else {
                                        // Also clean up label if it wasn't a dropdown but has modifiers
                                        label = label.replace(/\|.*/, '').trim();
                                    }

                                    const isFileField = originalField.type === 'file';
                                    const fileVal = data[originalField.key];
                                    const savedFileUrl = (typeof fileVal === 'string' && fileVal && !fileVal.includes('fakepath')) ? getFileViewUrl(fileVal) : null;
                                    const existingValueUrl = (originalField.value && typeof originalField.value === 'string') ? getFileViewUrl(originalField.value) : null;
                                    const viewUrl = savedFileUrl || existingValueUrl;

                                    return (
                                        <div key={index} className="relative group">
                                            <label className="block text-sm font-semibold text-gray-700 mb-2 capitalize flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 flex items-center justify-center text-xs group-focus-within:bg-indigo-50 group-focus-within:text-indigo-600 transition-colors">
                                                    <i className={`fas ${iconMap[originalField.key] || 'fa-file-alt'}`}></i>
                                                </span>
                                                {label} <span className="text-red-500">*</span>
                                            </label>

                                            {isFileField ? (
                                                <div className="space-y-2">
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                        onChange={(e) => handleFieldChange(originalField.key, e.target.files?.[0] || null)}
                                                        className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                                    />
                                                    {viewUrl && (
                                                        <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                                                            <i className="fas fa-external-link-alt text-xs"></i>
                                                            Lihat file
                                                        </a>
                                                    )}
                                                    {fileVal instanceof File && !viewUrl && (
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="text-sm text-gray-500">
                                                                File dipilih: {fileVal.name}.
                                                            </span>
                                                            <a
                                                                href={URL.createObjectURL(fileVal)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
                                                            >
                                                                <i className="fas fa-external-link-alt text-xs"></i>
                                                                Preview file
                                                            </a>
                                                            <span className="text-xs text-gray-400">Simpan untuk mengunggah ke server.</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : isDropdown ? (
                                                <div className="relative">
                                                    <select
                                                        value={data[originalField.key] || ''}
                                                        onChange={(e) => handleFieldChange(originalField.key, e.target.value)}
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
                                                    onChange={(e) => handleFieldChange(originalField.key, e.target.value)}
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
                                    )
                                })}
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
