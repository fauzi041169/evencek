import React, { useEffect, useState } from 'react';
import { useForm, usePage, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import Swal from 'sweetalert2';
import {
    User, Mail, Phone, Key, Users, MapPin,
    Briefcase, Building, Calendar, Save, X,
    CreditCard, Hash, FileText
} from 'lucide-react';
import axios from 'axios';

// Normalize date to yyyy-MM-dd for <input type="date"> (backend may send ISO string)
function toDateOnly(value) {
    if (value == null || value === '') return '';
    if (typeof value !== 'string') value = String(value);
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export default function ParticipantEditModal({ show, onClose, user, provinces, activity, customKeys = [], customOptions = {}, requiredProfileFields = [] }) {
    // 'user' prop here is likely the 'ActivityUser' object (pivot context) from the parent component
    // we need to extract the actual User model and Profile model from it.

    // 'user' prop can be full participant (ActivityUser with .user and .custom_data) or User
    const activityUser = user || {};
    const targetUser = activityUser.user || activityUser;
    const targetProfile = targetUser.profile || {};
    // custom_data for this activity is on the participant (ActivityUser), not on User
    const participantCustomData = activityUser.custom_data;

    const [regencies, setRegencies] = useState([]);
    const [districts, setDistricts] = useState([]);

    const { data, setData, post, processing, errors, reset, transform } = useForm({
        name: '',
        email: '',
        no_hp: '',
        nik: '',
        jenis_kelamin: '',
        birth_place: '',
        birth_date: '',
        alamat: '',
        instansi: '',
        jabatan: '',
        pekerjaan: '',
        province_id: '',
        regency_id: '',
        district_id: '',
        foto_file: null,
        additional_data: {},
        _method: 'PUT'
    });

    // Helper: apakah field profil wajib untuk kegiatan ini
    const isRequired = (key) => {
        const k = String(key || '').toLowerCase();
        return Array.isArray(requiredProfileFields) && requiredProfileFields.map(s => String(s).toLowerCase()).includes(k);
    };

    useEffect(() => {
        if (show && targetUser && targetUser.id) {
            // Prepare Additional Data (Custom Fields)
            // Merge profile existing data with activity's custom_data (from participant pivot)
            const profileAdditionalData = targetProfile.additional_data || {};
            const activityCustomData = (participantCustomData != null && typeof participantCustomData === 'object')
                ? participantCustomData
                : (targetUser.custom_data || {});

            const initialAdditionalData = {
                ...profileAdditionalData,
                ...activityCustomData
            };

            // Ensure all configured columns (customKeys) are initialized and canonicalized
            if (Array.isArray(customKeys)) {
                customKeys.forEach(rawKey => {
                    const baseKey = rawKey.split('|')[0].trim();
                    const lowerKey = baseKey.toLowerCase();
                    const existingKey = Object.keys(initialAdditionalData).find(k => k.toLowerCase() === lowerKey);

                    if (existingKey) {
                        const value = initialAdditionalData[existingKey];
                        if (existingKey !== baseKey) {
                            delete initialAdditionalData[existingKey];
                        }
                        initialAdditionalData[baseKey] = value;
                    } else {
                        initialAdditionalData[baseKey] = '';
                    }
                });
            }

            setData({
                name: targetUser.name || '',
                email: targetUser.email || '',
                no_hp: targetUser.phone || targetUser.no_hp || targetProfile.no_hp || '',
                nik: targetUser.nik || targetProfile.nik || '',
                jenis_kelamin: targetUser.gender || targetUser.jenis_kelamin || targetProfile.jenis_kelamin || '',
                birth_place: targetUser.birth_place || targetProfile.birth_place || '',
                birth_date: toDateOnly(targetUser.birthday || targetUser.birth_date || targetProfile.birth_date || ''),
                alamat: targetUser.address || targetUser.alamat || targetProfile.alamat || '',
                instansi: targetUser.institution || targetUser.instansi || targetProfile.instansi || '',
                jabatan: targetUser.job_title || targetUser.jabatan || targetProfile.jabatan || '',
                pekerjaan: targetUser.occupation || targetUser.pekerjaan || targetProfile.pekerjaan || '',
                province_id: targetProfile.province_id || '',
                regency_id: targetProfile.regency_id || '',
                district_id: targetProfile.district_id || '',
                foto_file: null,
                additional_data: initialAdditionalData,
                activity_id: activity?.id || activity?.uid || '', // Backend accepts id atau uid
                _method: 'PUT'
            });

            // Load initial regions if present
            if (targetProfile.province_id) {
                fetchRegencies(targetProfile.province_id);
            }
            if (targetProfile.regency_id) {
                fetchDistricts(targetProfile.regency_id);
            }
        }
    }, [show, user, activity]); // Dependency on 'user' (the prop), not derived state

    const fetchRegencies = (provinceId) => {
        if (!provinceId) {
            setRegencies([]);
            return;
        }
        axios.get(`/profile/ajax/regencies/${provinceId}`)
            .then(res => setRegencies(res.data))
            .catch(err => console.error(err));
    };

    const fetchDistricts = (regencyId) => {
        if (!regencyId) {
            setDistricts([]);
            return;
        }
        axios.get(`/profile/ajax/districts/${regencyId}`)
            .then(res => setDistricts(res.data))
            .catch(err => console.error(err));
    };

    // Cascading dropdowns handlers
    const handleProvinceChange = (e) => {
        const provinceId = e.target.value;
        setData(prev => ({ ...prev, province_id: provinceId, regency_id: '', district_id: '' }));
        fetchRegencies(provinceId);
        setDistricts([]);
    };

    const handleRegencyChange = (e) => {
        const regencyId = e.target.value;
        setData(prev => ({ ...prev, regency_id: regencyId, district_id: '' }));
        fetchDistricts(regencyId);
    };

    const submit = (e) => {
        e.preventDefault();
        if (!targetUser?.id) return;

        const hasFileUpload = Object.values(data.additional_data || {}).some(v => v instanceof File);
        transform((data) => {
            const { additional_data: adj, ...rest } = data;
            const cleanAdditional = {};
            const custom_files = {};
            const isFakepath = (v) => typeof v === 'string' && (v.toLowerCase().includes('fakepath') || /^[a-zA-Z]:\\/.test(v) || v.includes('\\'));
            const normalizeKey = (k) => String(k).toLowerCase().trim().replace(/[\s\-]+/g, '_');
            Object.keys(adj || {}).forEach(key => {
                const value = adj[key];
                if (value === undefined || value === null) return;
                if (isFakepath(value)) return;
                if (value instanceof File) {
                    custom_files[normalizeKey(key)] = value;
                } else {
                    cleanAdditional[key] = value;
                }
            });

            return {
                ...rest,
                ...cleanAdditional,
                ...(Object.keys(custom_files).length ? { custom_files } : {})
            };
        });

        // Saat ada file (surat tugas dll), paksa FormData agar file terkirim ke server (penting di hosting)
        post(route('profile.update-user', { id: targetUser.id }), {
            forceFormData: hasFileUpload,
            onSuccess: () => {
                onClose();
                router.reload({ only: ['participants', 'participantsStats', 'filters'] });
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Profil peserta berhasil diperbarui!',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            },
            onError: (errors) => {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal memperbarui profil. Silakan periksa input Anda.',
                });
            }
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="4xl">
            <div className="bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header with Gradient */}
                <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-6 pb-6 sm:pb-16 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30 shadow-inner">
                            <User className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Edit Profil Peserta</h2>
                            <p className="text-blue-100 text-sm mt-0.5">Perbarui informasi lengkap peserta di bawah ini</p>
                        </div>
                    </div>

                    {/* Decorative Circles */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-2xl"></div>
                </div>

                {/* Main Content Area (Scrollable) */}
                <div className="flex-1 overflow-y-auto bg-slate-50/50 relative -mt-8 mx-0 z-10 rounded-t-3xl">
                    <form onSubmit={submit} className="p-6 md:p-8 space-y-8">

                        {/* Profile Photo - Floating */}
                        <div className="flex justify-center -mt-20 mb-6 relative z-20">
                            <div className="relative group">
                                <div className="p-1 bg-white rounded-full shadow-lg">
                                    <img
                                        src={targetUser?.profile_photo_url || targetUser?.profile?.foto_url}
                                        alt={targetUser?.name}
                                        className="h-28 w-28 rounded-full object-cover border-4 border-slate-50 group-hover:scale-105 transition-transform duration-300"
                                        onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                    />
                                </div>
                                <span className="absolute bottom-2 right-2 p-2 bg-indigo-600 text-white rounded-full shadow-md border-2 border-white">
                                    <User className="w-4 h-4" />
                                </span>
                            </div>
                        </div>

                        {/* Section: Identitas Pribadi */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-500" />
                                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Identitas Pribadi</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2 md:col-span-1">
                                    <FormInput
                                        label="Nama Lengkap"
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        error={errors.name}
                                        icon={<User className="w-4 h-4" />}
                                required={isRequired('name')}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <FormInput
                                        label="Email"
                                        type="email"
                                        value={data.email}
                                        onChange={e => setData('email', e.target.value)}
                                        error={errors.email}
                                        icon={<Mail className="w-4 h-4" />}
                                required={isRequired('email')}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <FormInput
                                        label="No. WhatsApp / HP"
                                        value={data.no_hp}
                                        onChange={e => setData('no_hp', e.target.value)}
                                        error={errors.no_hp}
                                        icon={<Phone className="w-4 h-4" />}
                                required={isRequired('no_hp')}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <FormInput
                                        label="NIK"
                                        value={data.nik}
                                        onChange={e => setData('nik', e.target.value)}
                                        error={errors.nik}
                                        icon={<Hash className="w-4 h-4" />}
                                required={isRequired('nik')}
                                    />
                                </div>

                                <div className="col-span-2 md:col-span-1">
                                    <FormSelect
                                        label="Jenis Kelamin"
                                        value={data.jenis_kelamin}
                                        onChange={e => setData('jenis_kelamin', e.target.value)}
                                        error={errors.jenis_kelamin}
                                required={isRequired('jenis_kelamin') || isRequired('gender')}
                                    >
                                        <option value="">Pilih Jenis Kelamin</option>
                                        <option value="L">Laki-laki</option>
                                        <option value="P">Perempuan</option>
                                    </FormSelect>
                                </div>

                                <div className="col-span-2 md:col-span-1 grid grid-cols-2 gap-4">
                                    <FormInput
                                        label="Tempat Lahir"
                                        value={data.birth_place}
                                        onChange={e => setData('birth_place', e.target.value)}
                                        error={errors.birth_place}
                                        icon={<MapPin className="w-4 h-4" />}
                                required={isRequired('birth_place')}
                                    />
                                    <FormInput
                                        label="Tanggal Lahir"
                                        type="date"
                                        value={data.birth_date}
                                        onChange={e => setData('birth_date', e.target.value)}
                                        error={errors.birth_date}
                                        icon={<Calendar className="w-4 h-4" />}
                                required={isRequired('birth_date')}
                                    />
                                </div>

                        {/* Foto Profil (opsional, tampil jika diwajibkan) */}
                        {(isRequired('foto') || isRequired('photo')) && (
                            <div className="col-span-2 space-y-1.5">
                                <FormInput
                                    label="Foto Profil"
                                    type="file"
                                    onChange={(e) => setData('foto_file', e.target.files?.[0] || null)}
                                    error={errors.foto_file}
                                    required
                                />
                                <p className="text-xs text-slate-500">Pilih file baru akan menggantikan foto yang sudah tersimpan.</p>
                                {(targetUser?.profile_photo_url || targetProfile?.foto_url) && (
                                    <a
                                        href={targetUser?.profile_photo_url || targetProfile?.foto_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-indigo-600 text-xs hover:underline"
                                    >
                                        <FileText className="w-3 h-3" /> Lihat foto tersimpan
                                    </a>
                                )}
                            </div>
                        )}
                            </div>
                        </div>

                        {/* Section: Data Tambahan / Custom Fields */}
                        {Object.keys(data.additional_data).length > 0 && (
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-amber-500" />
                                    <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Data Kegiatan & Lainnya</h3>
                                </div>
                                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {customKeys && customKeys.length > 0 ? (
                                        customKeys.map((rawKey) => {
                                            // Pastikan rawKey selalu string (hindari [object Object] dari backend/column_settings)
                                            const rawKeyStr = typeof rawKey === 'string'
                                                ? rawKey
                                                : (rawKey && (rawKey.key ?? rawKey.label ?? rawKey.name)) || String(rawKey || '');
                                            const parts = String(rawKeyStr).split('|');
                                            const baseKey = (parts[0] || '').trim();
                                            const label = baseKey.replace(/^custom_/, '').replace(/_/g, ' ').trim();

                                            const value = data.additional_data[baseKey];

                                            let cleanKey = label.toLowerCase().trim();
                                            const originalKey = baseKey; // Use baseKey for updates

                                            let currentOptions = [];
                                            let isDropdown = false;
                                            const isFileField = Array.isArray(activity?.custom_fields) && !!activity.custom_fields.find(f => (f.key || '').toLowerCase() === baseKey.toLowerCase() && (f.type || '') === 'file');
                                            const isRequiredCustom = Array.isArray(activity?.custom_fields) && !!activity.custom_fields.find(f => (f.key || '').toLowerCase() === baseKey.toLowerCase() && (f.required === true || f.required === 1));
                                            const getFileUrl = (v) => {
                                                const pathStr = toFilePathString(v);
                                                if (!pathStr) return null;
                                                let s = String(pathStr).trim();
                                                if (s.startsWith('http://') || s.startsWith('https://')) return s;
                                                if (s.toLowerCase().includes('fakepath') || /^[a-zA-Z]:\\/.test(s)) return null;
                                                if (s.includes('\\')) s = s.replace(/\\/g, '/');
                                                const path = s.startsWith('storage/') ? s : (s.startsWith('/') ? s.slice(1) : `storage/${s}`);
                                                return window.location.origin + '/' + path.replace(/^\/+/, '');
                                            };
                                            // Normalize value: if object/array, extract path or first item for display/URL
                                            const toFilePathString = (v) => {
                                                if (v == null) return '';
                                                if (typeof v === 'string') return v;
                                                if (typeof v === 'object' && v !== null) {
                                                    if (v.path) return v.path;
                                                    if (v.url) return v.url;
                                                    if (Array.isArray(v) && v.length > 0) return toFilePathString(v[0]);
                                                }
                                                return '';
                                            };
                                            const toDisplayValue = (v) => {
                                                if (v == null) return '';
                                                if (typeof v === 'string') return v;
                                                if (typeof v === 'object' && v !== null) {
                                                    if (v.label) return v.label;
                                                    if (v.name) return v.name;
                                                    if (v.path) return v.path;
                                                    if (v.url) return v.url;
                                                    if (Array.isArray(v) && v.length > 0) return toDisplayValue(v[0]);
                                                }
                                                return String(v);
                                            };

                                            // 0. Parse complex type definition (e.g. "Dropdown:A~B~C")
                                            if (parts.length > 1) {
                                                const typeDef = parts[1];
                                                if (typeDef.toLowerCase().startsWith('dropdown:')) {
                                                    const optionsStr = typeDef.substring('dropdown:'.length);
                                                    // Options are typically separated by '~' or ','
                                                    currentOptions = optionsStr.split(/~|,/).map(o => o.trim()).filter(o => o);
                                                    isDropdown = true;
                                                }
                                            }

                                            if (isFileField) {
                                                // Gunakan route backend (custom-file) agar selalu baca file terbaru dari server; menghindari cache/symlink di hosting
                                                const pathStr = toFilePathString(value);
                                                const isStoredPath = pathStr && typeof value !== 'object' && !(value instanceof File);
                                                const fileUrl = (activity && targetUser?.id && isStoredPath && pathStr && !pathStr.startsWith('http'))
                                                    ? (typeof route !== 'undefined'
                                                        ? `${route('activity.participants.custom-file', { activityId: activity.uid || activity.id, userId: targetUser.id })}?key=${encodeURIComponent(baseKey)}`
                                                        : getFileUrl(value))
                                                    : getFileUrl(value);
                                                return (
                                                    <div key={rawKeyStr} className="space-y-1.5">
                                                        <label className="block text-sm font-medium text-slate-700">{label} {isRequiredCustom && <span className="text-red-500">*</span>}</label>
                                                        <input
                                                            type="file"
                                                            onChange={(e) => {
                                                                const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                                                                const newData = { ...data.additional_data, [originalKey]: file || '' };
                                                                setData('additional_data', newData);
                                                            }}
                                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all shadow-sm"
                                                            required={isRequiredCustom}
                                                        />
                                                        <p className="text-xs text-slate-500">Pilih file baru akan menggantikan dokumen yang sudah tersimpan.</p>
                                                        {fileUrl ? (
                                                            <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 text-xs hover:underline">
                                                                <FileText className="w-3 h-3" /> Lihat file tersimpan
                                                            </a>
                                                        ) : (
                                                            value != null && value !== '' ? (
                                                                <span className="text-xs text-slate-400">Belum tersimpan di server</span>
                                                            ) : null
                                                        )}
                                                    </div>
                                                );
                                            }

                                            // 1. Gender check
                                            if (['gender', 'jenis kelamin', 'sex'].includes(cleanKey)) {
                                                return (
                                                    <div key={rawKeyStr}>
                                                        <FormSelect
                                                            label={label}
                                                            value={value || ''}
                                                            onChange={(e) => {
                                                                const newData = { ...data.additional_data, [originalKey]: e.target.value };
                                                                setData('additional_data', newData);
                                                            }}
                                                            className="capitalize-label"
                                                            required={isRequiredCustom}
                                                        >
                                                            <option value="">Pilih {label}...</option>
                                                            <option value="L">Laki-laki</option>
                                                            <option value="P">Perempuan</option>
                                                        </FormSelect>
                                                    </div>
                                                );
                                            }

                                            // 2. Options check (discovered customOptions from table data if not explicitly defined)
                                            if (!isDropdown && !currentOptions.length) {
                                                const optionKey = Object.keys(customOptions || {}).find(k => k.toLowerCase() === rawKeyStr.toLowerCase() || k.toLowerCase().replace(/_/g, ' ') === cleanKey);
                                                if (optionKey && customOptions[optionKey]) {
                                                    currentOptions = customOptions[optionKey];
                                                }
                                            }

                                            // If we have options OR it's a known region field, render as select
                                            if (isDropdown || (currentOptions && currentOptions.length > 0) || ['province', 'provinsi', 'regency', 'kabupaten', 'kota', 'city', 'district', 'kecamatan', 'village', 'desa', 'kelurahan'].includes(cleanKey)) {
                                                // Sort options unique
                                                const uniqueOptions = [...new Set(currentOptions || [])].filter(o => o);
                                                const valueStr = value != null && typeof value === 'object'
                                                    ? toDisplayValue(value)
                                                    : String(value ?? '');
                                                const valueInOptions = uniqueOptions.some(o => (typeof o === 'object' ? (o.value ?? o.id) : String(o)) === valueStr);

return (
                                                    <div key={rawKeyStr}>
                                                    <FormSelect
                                                            label={label}
                                                            value={valueStr}
                                                            onChange={(e) => {
                                                                const newData = { ...data.additional_data, [originalKey]: e.target.value };
                                                                setData('additional_data', newData);
                                                            }}
                                                            className="capitalize-label"
                                                            required={isRequiredCustom}
                                                        >
                                                            <option value="">Pilih {label}...</option>
                                                            {uniqueOptions.map((opt, idx) => {
                                                                const val = (opt && typeof opt === 'object') ? (opt.value ?? opt.id ?? JSON.stringify(opt)) : String(opt);
                                                                const labelText = (opt && typeof opt === 'object') ? (opt.label ?? opt.name ?? val) : String(opt);
                                                                return <option key={idx} value={val}>{labelText}</option>;
                                                            })}
                                                            {/* If current value is not in options, add it so it displays correctly (no [object Object]) */}
                                                            {valueStr && !valueInOptions && (
                                                                <option value={valueStr}>{valueStr}</option>
                                                            )}
                                                        </FormSelect>
                                                    </div>
                                                );
                                            }

                                            // 3. Fallback to Input (tampilkan nilai sebagai string; hindari [object Object])
                                            const displayValue = (v) => {
                                                if (v == null || v === '') return '';
                                                if (typeof v === 'string') return v;
                                                if (v instanceof File) return v.name || '';
                                                if (typeof v === 'object') return v.path ?? v.label ?? v.name ?? '';
                                                return String(v);
                                            };
                                            return (
                                                <div key={rawKeyStr}>
                                                    <FormInput
                                                        label={label}
                                                        value={displayValue(value) || ''}
                                                        onChange={(e) => {
                                                            const newData = { ...data.additional_data, [originalKey]: e.target.value };
                                                            setData('additional_data', newData);
                                                        }}
                                                        className="capitalize-label"
                                                        required={isRequiredCustom}
                                                    />
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="col-span-full text-center text-slate-500 py-4 text-sm">
                                            Tidak ada data tambahan untuk kegiatan ini.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Section: Pekerjaan & Instansi */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-emerald-500" />
                                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Pekerjaan & Instansi</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <FormInput
                                        label="Instansi / Organisasi"
                                        value={data.instansi}
                                        onChange={e => setData('instansi', e.target.value)}
                                        error={errors.instansi}
                                        icon={<Building className="w-4 h-4" />}
                                    required={isRequired('instansi')}
                                    />
                                </div>
                                <div>
                                    <FormInput
                                        label="Detail Pekerjaan"
                                        value={data.pekerjaan}
                                        onChange={e => setData('pekerjaan', e.target.value)}
                                        error={errors.pekerjaan}
                                        icon={<Briefcase className="w-4 h-4" />}
                                    required={isRequired('pekerjaan')}
                                    />
                                </div>
                                <div>
                                    <FormInput
                                        label="Jabatan"
                                        value={data.jabatan}
                                        onChange={e => setData('jabatan', e.target.value)}
                                        error={errors.jabatan}
                                        icon={<CreditCard className="w-4 h-4" />}
                                    required={isRequired('jabatan')}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section: Alamat & Domisili */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-100 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-rose-500" />
                                <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wider">Alamat Lengkap</h3>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <FormSelect
                                        label="Provinsi"
                                        value={data.province_id}
                                        onChange={handleProvinceChange}
                                        error={errors.province_id}
                                    required={isRequired('province_id') || isRequired('provinsi')}
                                    >
                                        <option value="">Pilih Provinsi...</option>
                                        {provinces && provinces.map(prov => (
                                            <option key={prov.id} value={prov.id}>{prov.name}</option>
                                        ))}
                                    </FormSelect>
                                </div>
                                <div>
                                    <FormSelect
                                        label="Kabupaten/Kota"
                                        value={data.regency_id}
                                        onChange={handleRegencyChange}
                                        disabled={!data.province_id}
                                        error={errors.regency_id}
                                    required={isRequired('regency_id') || isRequired('kabupaten') || isRequired('kota') || isRequired('city')}
                                    >
                                        <option value="">Pilih Kota/Kab...</option>
                                        {regencies && regencies.map(reg => (
                                            <option key={reg.id} value={reg.id}>{reg.name}</option>
                                        ))}
                                    </FormSelect>
                                </div>
                                <div>
                                    <FormSelect
                                        label="Kecamatan"
                                        value={data.district_id}
                                        onChange={e => setData('district_id', e.target.value)}
                                        disabled={!data.regency_id}
                                        error={errors.district_id}
                                    required={isRequired('district_id') || isRequired('kecamatan')}
                                    >
                                        <option value="">Pilih Kecamatan...</option>
                                        {districts && districts.map(dist => (
                                            <option key={dist.id} value={dist.id}>{dist.name}</option>
                                        ))}
                                    </FormSelect>
                                </div>
                                <div className="col-span-1 md:col-span-3">
                                    <div className="space-y-1">
                                        <label className="block text-sm font-medium text-slate-700">Detail Alamat</label>
                                        <textarea
                                            value={data.alamat}
                                            onChange={(e) => setData('alamat', e.target.value)}
                                            className="w-full border-slate-200 rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500/20 text-sm min-h-[80px]"
                                            rows="2"
                                            placeholder="Nama jalan, RT/RW, nomor rumah, kode pos, dll."
                                        required={isRequired('alamat') || isRequired('address')}
                                        ></textarea>
                                        {errors.alamat && <p className="text-red-500 text-xs">{errors.alamat}</p>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-3 flex-shrink-0 z-20 sticky bottom-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-800 transition-colors focus:ring-2 focus:ring-slate-200"
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        onClick={submit}
                        disabled={processing}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-indigo-500/20 shadow-md shadow-indigo-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                    >
                        {processing ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Simpan Perubahan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

// Reusable Components to keep code clean
const FormInput = ({ label, type = "text", value, onChange, error, icon, required, className }) => {
    const isFile = String(type).toLowerCase() === 'file';
    return (
        <div className={`space-y-1.5 ${className}`}>
            <label className="block text-sm font-medium text-slate-700 capitalize">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative group">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    type={type}
                    {...(!isFile ? { value } : {})}
                    onChange={onChange}
                    className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all shadow-sm placeholder:text-slate-300 hover:border-slate-300`}
                    placeholder={`Masukkan ${label.toLowerCase()}...`}
                    required={required}
                />
            </div>
            {error && <p className="text-red-500 text-xs flex items-center gap-1">
                <span className="w-1 h-1 bg-red-500 rounded-full"></span> {error}
            </p>}
        </div>
    );
};

const FormSelect = ({ label, value, onChange, error, children, disabled, required }) => (
    <div className="space-y-1.5">
        <label className="block text-sm font-medium text-slate-700">{label}</label>
        <div className="relative">
            <select
                value={value}
                onChange={onChange}
                disabled={disabled}
                required={required}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer appearance-none"
            >
                {children}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        </div>
        {error && <p className="text-red-500 text-xs flex items-center gap-1">
            <span className="w-1 h-1 bg-red-500 rounded-full"></span> {error}
        </p>}
    </div>
);
