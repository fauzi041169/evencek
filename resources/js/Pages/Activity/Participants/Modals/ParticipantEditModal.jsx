import React, { useEffect, useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import Swal from 'sweetalert2';
import { UserPen } from 'lucide-react';
import axios from 'axios';

export default function ParticipantEditModal({ show, onClose, user, provinces, activity }) {
    // If no user is provided, don't render or handle gracefully
    const targetUser = user || {};
    
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

    useEffect(() => {
        if (show && targetUser && targetUser.id) {
            setData({
                name: targetUser.name || '',
                email: targetUser.email || '',
                no_hp: targetUser.phone || targetUser.no_hp || targetUser.profile?.no_hp || '',
                nik: targetUser.nik || targetUser.profile?.nik || '',
                jenis_kelamin: targetUser.gender || targetUser.jenis_kelamin || targetUser.profile?.jenis_kelamin || '',
                birth_place: targetUser.birth_place || targetUser.profile?.birth_place || '',
                birth_date: targetUser.birthday || targetUser.birth_date || targetUser.profile?.birth_date || '',
                alamat: targetUser.address || targetUser.alamat || targetUser.profile?.alamat || '',
                instansi: targetUser.institution || targetUser.instansi || targetUser.profile?.instansi || '',
                jabatan: targetUser.job_title || targetUser.jabatan || targetUser.profile?.jabatan || '',
                pekerjaan: targetUser.occupation || targetUser.pekerjaan || targetUser.profile?.pekerjaan || '',
                province_id: targetUser.profile?.province_id || '',
                regency_id: targetUser.profile?.regency_id || '',
                district_id: targetUser.profile?.district_id || '',
                foto_file: null,
                additional_data: targetUser.profile?.additional_data || {},
                _method: 'PUT'
            });

            // Load initial regions if present
            if (targetUser.profile?.province_id) {
                fetchRegencies(targetUser.profile.province_id);
            }
            if (targetUser.profile?.regency_id) {
                fetchDistricts(targetUser.profile.regency_id);
            }
        }
    }, [show, targetUser]);

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
        
        transform((data) => {
            const { additional_data, ...rest } = data;
            // Filter out null/undefined additional data keys to avoid sending "null" string if any
            const cleanAdditional = {};
            Object.keys(additional_data).forEach(key => {
                cleanAdditional[key] = additional_data[key];
            });

            return {
                ...rest,
                ...cleanAdditional
            };
        });

        post(route('profile.update-user', { id: targetUser.id }), {
            onSuccess: () => {
                onClose();
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
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                        <UserPen className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                            Edit Profil Peserta
                        </h3>
                        <div className="mt-2">
                            <div className="flex justify-center mb-6">
                                <img 
                                    src={targetUser.profile_photo_url} 
                                    alt={targetUser.name} 
                                    className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-md"
                                    onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                />
                            </div>

                            <p className="text-sm text-gray-500 mb-4 text-center">
                                Perbarui informasi profil peserta ini.
                            </p>
                            
                            <form onSubmit={submit} encType="multipart/form-data">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Name */}
                                    <div className="mb-4 col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                                        <input
                                            type="text"
                                            value={data.name}
                                            onChange={(e) => setData('name', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            required
                                        />
                                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                    </div>

                                    {/* Email */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            value={data.email}
                                            onChange={(e) => setData('email', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            required
                                        />
                                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                                    </div>

                                    {/* Phone */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">No. WhatsApp / HP</label>
                                        <input
                                            type="text"
                                            value={data.no_hp}
                                            onChange={(e) => setData('no_hp', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        {errors.no_hp && <p className="text-red-500 text-xs mt-1">{errors.no_hp}</p>}
                                    </div>

                                    {/* NIK */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">NIK</label>
                                        <input
                                            type="text"
                                            value={data.nik}
                                            onChange={(e) => setData('nik', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        {errors.nik && <p className="text-red-500 text-xs mt-1">{errors.nik}</p>}
                                    </div>

                                    {/* Gender */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                                        <select
                                            value={data.jenis_kelamin}
                                            onChange={(e) => setData('jenis_kelamin', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        >
                                            <option value="">Pilih...</option>
                                            <option value="L">Laki-laki</option>
                                            <option value="P">Perempuan</option>
                                        </select>
                                        {errors.jenis_kelamin && <p className="text-red-500 text-xs mt-1">{errors.jenis_kelamin}</p>}
                                    </div>

                                    {/* Birth Place */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tempat Lahir</label>
                                        <input
                                            type="text"
                                            value={data.birth_place}
                                            onChange={(e) => setData('birth_place', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        {errors.birth_place && <p className="text-red-500 text-xs mt-1">{errors.birth_place}</p>}
                                    </div>

                                    {/* Birth Date */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Lahir</label>
                                        <input
                                            type="date"
                                            value={data.birth_date}
                                            onChange={(e) => setData('birth_date', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        {errors.birth_date && <p className="text-red-500 text-xs mt-1">{errors.birth_date}</p>}
                                    </div>

                                    {/* Institution */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Instansi / Organisasi</label>
                                        <input
                                            type="text"
                                            value={data.instansi}
                                            onChange={(e) => setData('instansi', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        {errors.instansi && <p className="text-red-500 text-xs mt-1">{errors.instansi}</p>}
                                    </div>

                                    {/* Job Title */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                                        <input
                                            type="text"
                                            value={data.jabatan}
                                            onChange={(e) => setData('jabatan', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        {errors.jabatan && <p className="text-red-500 text-xs mt-1">{errors.jabatan}</p>}
                                    </div>

                                    {/* Pekerjaan */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Pekerjaan</label>
                                        <input
                                            type="text"
                                            value={data.pekerjaan}
                                            onChange={(e) => setData('pekerjaan', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        />
                                        {errors.pekerjaan && <p className="text-red-500 text-xs mt-1">{errors.pekerjaan}</p>}
                                    </div>

                                    {/* Province */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
                                        <select
                                            value={data.province_id}
                                            onChange={handleProvinceChange}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                        >
                                            <option value="">Pilih Provinsi...</option>
                                            {provinces && provinces.map(prov => (
                                                <option key={prov.id} value={prov.id}>{prov.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Regency */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kabupaten/Kota</label>
                                        <select
                                            value={data.regency_id}
                                            onChange={handleRegencyChange}
                                            disabled={!data.province_id}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                                        >
                                            <option value="">Pilih Kabupaten/Kota...</option>
                                            {regencies && regencies.map(reg => (
                                                <option key={reg.id} value={reg.id}>{reg.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* District */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan</label>
                                        <select
                                            value={data.district_id}
                                            onChange={(e) => setData('district_id', e.target.value)}
                                            disabled={!data.regency_id}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:bg-gray-100"
                                        >
                                            <option value="">Pilih Kecamatan...</option>
                                            {districts && districts.map(dist => (
                                                <option key={dist.id} value={dist.id}>{dist.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Address */}
                                    <div className="mb-4 col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap</label>
                                        <textarea
                                            value={data.alamat}
                                            onChange={(e) => setData('alamat', e.target.value)}
                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                            rows="3"
                                        ></textarea>
                                        {errors.alamat && <p className="text-red-500 text-xs mt-1">{errors.alamat}</p>}
                                    </div>

                                    {/* Additional Data (Dynamic) */}
                                    {Object.keys(data.additional_data).length > 0 && (
                                        <div className="col-span-2 border-t pt-4 mt-2">
                                            <h4 className="text-sm font-semibold text-gray-900 mb-3">Data Tambahan</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {Object.entries(data.additional_data).map(([key, value]) => (
                                                    <div key={key} className="mb-4">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                                                            {key.replace(/_/g, ' ')}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={value || ''}
                                                            onChange={(e) => {
                                                                const newData = { ...data.additional_data, [key]: e.target.value };
                                                                setData('additional_data', newData);
                                                            }}
                                                            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="mr-3 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                                    >
                                        {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
