import React, { useEffect } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';

function toDateOnly(value) {
    if (value == null || value === '') return '';
    if (typeof value !== 'string') value = String(value);
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export default function ProfileEditModal({ show, onClose }) {
    const { auth } = usePage().props;
    const user = auth?.user || {};

    const { data, setData, post, processing, errors, reset } = useForm({
        name: user.name || '',
        email: user.email || '',
        no_hp: user.phone || user.no_hp || user.profile?.no_hp || '',
        jenis_kelamin: user.gender || user.jenis_kelamin || user.profile?.jenis_kelamin || '',
        birth_date: toDateOnly(user.birthday || user.birth_date || user.profile?.birth_date || ''),
        alamat: user.address || user.alamat || user.profile?.alamat || '',
        instansi: user.institution || user.instansi || user.profile?.instansi || '',
        jabatan: user.job_title || user.jabatan || user.profile?.jabatan || '',
        foto_file: null,
        _method: 'PUT'
    });

    useEffect(() => {
        if (show && user) {
            setData({
                name: user.name || '',
                email: user.email || '',
                no_hp: user.phone || user.no_hp || user.profile?.no_hp || '',
                jenis_kelamin: user.gender || user.jenis_kelamin || user.profile?.jenis_kelamin || '',
                birth_date: toDateOnly(user.birthday || user.birth_date || user.profile?.birth_date || ''),
                alamat: user.address || user.alamat || user.profile?.alamat || '',
                instansi: user.institution || user.instansi || user.profile?.instansi || '',
                jabatan: user.job_title || user.jabatan || user.profile?.jabatan || '',
                foto_file: null,
                _method: 'PUT'
            });
        }
    }, [show, user]);

    const submit = (e) => {
        e.preventDefault();
        post(route('profile.update'), {
            onSuccess: () => {
                onClose();
            }
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="lg">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                        <i className="fas fa-user-edit text-blue-600"></i>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                            Edit Profil
                        </h3>
                        <div className="mt-2">
                            <div className="flex justify-center mb-6">
                                <img 
                                    src={user.profile_photo_url} 
                                    alt={user.name} 
                                    className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-md"
                                    onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                />
                            </div>

                            <p className="text-sm text-gray-500 mb-4 text-center">
                                Perbarui informasi profil Anda.
                            </p>
                            
                            <form onSubmit={submit} encType="multipart/form-data">
                                {/* Name */}
                                <div className="mb-4">
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan / Pekerjaan</label>
                                    <input
                                        type="text"
                                        value={data.jabatan}
                                        onChange={(e) => setData('jabatan', e.target.value)}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                    />
                                    {errors.jabatan && <p className="text-red-500 text-xs mt-1">{errors.jabatan}</p>}
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
