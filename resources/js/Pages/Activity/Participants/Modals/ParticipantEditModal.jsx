import React, { useEffect } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import Modal from '@/Components/Modal';

export default function ParticipantEditModal({ show, onClose, user }) {
    // If no user is provided, don't render or handle gracefully
    const targetUser = user || {};

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        no_hp: '',
        jenis_kelamin: '',
        birth_date: '',
        alamat: '',
        instansi: '',
        jabatan: '',
        foto_file: null,
        _method: 'PUT'
    });

    useEffect(() => {
        if (show && targetUser && targetUser.id) {
            setData({
                name: targetUser.name || '',
                email: targetUser.email || '',
                no_hp: targetUser.phone || targetUser.no_hp || targetUser.profile?.no_hp || '',
                jenis_kelamin: targetUser.gender || targetUser.jenis_kelamin || targetUser.profile?.jenis_kelamin || '',
                birth_date: targetUser.birthday || targetUser.birth_date || targetUser.profile?.birth_date || '',
                alamat: targetUser.address || targetUser.alamat || targetUser.profile?.alamat || '',
                instansi: targetUser.institution || targetUser.instansi || targetUser.profile?.instansi || '',
                jabatan: targetUser.job_title || targetUser.jabatan || targetUser.profile?.jabatan || '',
                foto_file: null,
                _method: 'PUT'
            });
        }
    }, [show, targetUser]);

    const submit = (e) => {
        e.preventDefault();
        if (!targetUser?.id) return;
        
        post(route('profile.update-user', { user: targetUser.id }), {
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
