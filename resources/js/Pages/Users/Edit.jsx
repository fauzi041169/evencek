import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import axios from 'axios';

export default function Edit({ user, provinces, regencies: initialRegencies, districts: initialDistricts, activity_id }) {
    const { flash, errors } = usePage().props;
    const [regencies, setRegencies] = useState(initialRegencies || []);
    const [districts, setDistricts] = useState(initialDistricts || []);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [photoPreview, setPhotoPreview] = useState(user.profile?.foto_url || (user.profile?.foto ? `/assets/images/profilefoto/${user.profile.foto}` : '/assets/images/profilefoto/default-profile.png'));

    const { data, setData, post, processing, transform } = useForm({
        name: user.name || '',
        email: user.email || '',
        no_hp: user.profile?.no_hp || '',
        pekerjaan: user.profile?.pekerjaan || '',
        instansi: user.profile?.instansi || '',
        jabatan: user.profile?.jabatan || '',
        alamat: user.profile?.alamat || '',
        province_id: user.profile?.province_id || '',
        regency_id: user.profile?.regency_id || '',
        district_id: user.profile?.district_id || '',
        jenis_kelamin: user.profile?.jenis_kelamin || '',
        foto_file: null,
        foto_data: '',
        activity_id: activity_id || '',
        _method: 'PUT'
    });

    // Effect for cascading dropdowns
    useEffect(() => {
        if (data.province_id && data.province_id !== user.profile?.province_id) {
            // Only fetch if changed from initial or if we don't have regencies
            axios.get(`/profile/ajax/regencies/${data.province_id}`)
                .then(res => {
                    setRegencies(res.data);
                    setDistricts([]);
                    setData(prev => ({ ...prev, regency_id: '', district_id: '' }));
                });
        }
    }, [data.province_id]);

    useEffect(() => {
        if (data.regency_id && data.regency_id !== user.profile?.regency_id) {
            axios.get(`/profile/ajax/districts/${data.regency_id}`)
                .then(res => {
                    setDistricts(res.data);
                    setData(prev => ({ ...prev, district_id: '' }));
                });
        }
    }, [data.regency_id]);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setData('foto_file', file);
            setData('foto_data', ''); // Clear base64 if file selected
            const reader = new FileReader();
            reader.onload = (e) => setPhotoPreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    const startCamera = async () => {
        setShowCamera(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            Swal.fire({
                title: 'Akses Kamera Gagal',
                text: 'Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.',
                icon: 'error',
                confirmButtonColor: '#E02424'
            });
            setShowCamera(false);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            context.drawImage(videoRef.current, 0, 0, 320, 240);
            const dataUrl = canvasRef.current.toDataURL('image/jpeg');
            setPhotoPreview(dataUrl);
            setData('foto_data', dataUrl); // Set base64 data
            setData('foto_file', null); // Clear file input
            stopCamera();
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setShowCamera(false);
    };
    
    const handleDeletePhoto = () => {
        Swal.fire({
            title: 'Hapus foto?',
            text: "Foto profil akan dihapus.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                setPhotoPreview('/assets/images/profilefoto/default-profile.png');
                setData('foto_data', 'delete');
                setData('foto_file', null);
            }
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('users.update', user.id), {
            forceFormData: true,
            onSuccess: () => {
                // Handle success if needed, typically inertia handles redirect
            }
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Head title="Edit Profil Peserta" />
            
            {/* Simple Navbar */}
            <nav className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/" className="flex items-center text-white font-bold text-xl">
                                <i className="fas fa-shield-alt mr-2"></i> ADZKIATEKNO
                            </Link>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Link href="/" className="text-white hover:text-gray-200 text-sm font-medium">Beranda</Link>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                        <h4 className="text-xl font-bold text-white flex items-center">
                            <i className="fas fa-user-edit mr-3"></i>Edit Profil Peserta
                        </h4>
                    </div>

                    <div className="p-8">
                        {/* Flash messages are handled globally */}

                        
                        {Object.keys(errors).length > 0 && (
                             <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-r shadow-sm">
                                <div className="ml-3">
                                    <p className="font-bold text-red-700">Terjadi kesalahan:</p>
                                    <ul className="list-disc ml-5 mt-1 text-sm text-red-700">
                                        {Object.values(errors).map((error, idx) => (
                                            <li key={idx}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* Photo Section */}
                        <div className="flex justify-center mb-8">
                            <div className="relative group">
                                <img 
                                    src={photoPreview} 
                                    alt="Profile" 
                                    className="w-40 h-40 rounded-full object-cover border-4 border-white shadow-lg"
                                    onError={(e) => {e.target.src = '/assets/images/profilefoto/default-profile.png'}}
                                />
                                <div className="absolute bottom-0 right-0 flex space-x-2">
                                    <button 
                                        type="button" 
                                        onClick={startCamera}
                                        className="bg-secondary hover:bg-blue-700 text-white p-2 rounded-full shadow-md transition"
                                        title="Ambil Foto"
                                    >
                                        <i className="fas fa-camera"></i>
                                    </button>
                                    <label className="bg-cyan-500 hover:bg-cyan-600 text-white p-2 rounded-full shadow-md transition cursor-pointer" title="Upload Foto">
                                        <i className="fas fa-upload"></i>
                                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                                    </label>
                                    {(user.profile?.foto || photoPreview !== '/assets/images/profilefoto/default-profile.png') && (
                                        <button 
                                            type="button" 
                                            onClick={handleDeletePhoto}
                                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-md transition"
                                            title="Hapus Foto"
                                        >
                                            <i className="fas fa-trash"></i>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Camera Modal */}
                        {showCamera && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
                                <div className="bg-white p-4 rounded-lg shadow-xl max-w-lg w-full">
                                    <h3 className="text-lg font-bold mb-4">Ambil Foto</h3>
                                    <div className="relative aspect-video bg-black rounded overflow-hidden mb-4">
                                        <video ref={videoRef} className="w-full h-full object-cover"></video>
                                    </div>
                                    <canvas ref={canvasRef} width="320" height="240" className="hidden"></canvas>
                                    <div className="flex justify-end space-x-3">
                                        <button onClick={stopCamera} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">Batal</button>
                                        <button onClick={capturePhoto} className="px-4 py-2 bg-secondary text-white rounded hover:bg-secondary/90">Ambil Foto</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Personal Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span className="text-red-500">*</span></label>
                                    <input 
                                        type="text" 
                                        value={data.name} 
                                        onChange={e => setData('name', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 transition"
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                                    <input 
                                        type="email" 
                                        value={data.email} 
                                        onChange={e => setData('email', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 transition"
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">No. HP</label>
                                    <input 
                                        type="tel" 
                                        value={data.no_hp} 
                                        onChange={e => setData('no_hp', e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 transition"
                                        maxLength="13"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin <span className="text-red-500">*</span></label>
                                    <select 
                                        value={data.jenis_kelamin} 
                                        onChange={e => setData('jenis_kelamin', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 transition"
                                        required
                                    >
                                        <option value="" disabled>Pilih Jenis Kelamin</option>
                                        <option value="Laki-laki">Laki-laki</option>
                                        <option value="Perempuan">Perempuan</option>
                                    </select>
                                </div>
                            </div>

                            {/* Job Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pekerjaan</label>
                                    <input 
                                        type="text" 
                                        value={data.pekerjaan} 
                                        onChange={e => setData('pekerjaan', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Instansi</label>
                                    <input 
                                        type="text" 
                                        value={data.instansi} 
                                        onChange={e => setData('instansi', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 transition"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Jabatan</label>
                                    <input 
                                        type="text" 
                                        value={data.jabatan} 
                                        onChange={e => setData('jabatan', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 transition"
                                    />
                                </div>
                            </div>

                            {/* Address */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Alamat Lengkap <span className="text-red-500">*</span></label>
                                <textarea 
                                    value={data.alamat} 
                                    onChange={e => setData('alamat', e.target.value)}
                                    rows="3"
                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 transition"
                                    required
                                ></textarea>
                            </div>

                            {/* Region */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi <span className="text-red-500">*</span></label>
                                    <select 
                                        value={data.province_id} 
                                        onChange={e => setData('province_id', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring focus:ring-blue-200 transition"
                                        required
                                    >
                                        <option value="" disabled>Pilih Provinsi</option>
                                        {provinces.map(prov => (
                                            <option key={prov.id} value={prov.id}>{prov.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kabupaten/Kota <span className="text-red-500">*</span></label>
                                    <select 
                                        value={data.regency_id} 
                                        onChange={e => setData('regency_id', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 transition"
                                        required
                                        disabled={!data.province_id}
                                    >
                                        <option value="" disabled>Pilih Kabupaten/Kota</option>
                                        {regencies.map(reg => (
                                            <option key={reg.id} value={reg.id}>{reg.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan <span className="text-red-500">*</span></label>
                                    <select 
                                        value={data.district_id} 
                                        onChange={e => setData('district_id', e.target.value)}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 transition"
                                        required
                                        disabled={!data.regency_id}
                                    >
                                        <option value="" disabled>Pilih Kecamatan</option>
                                        {districts.map(dist => (
                                            <option key={dist.id} value={dist.id}>{dist.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
                                {activity_id ? (
                                    <a href={`/activity/${activity_id}/detail`} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition flex items-center">
                                        <i className="fas fa-arrow-left mr-2"></i> Kembali
                                    </a>
                                ) : (
                                    <button type="button" onClick={() => window.history.back()} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition flex items-center">
                                        <i className="fas fa-arrow-left mr-2"></i> Kembali
                                    </button>
                                )}
                                
                                <button 
                                    type="submit" 
                                    disabled={processing}
                                    className="px-6 py-2 bg-secondary text-white rounded-md hover:bg-secondary/90 transition flex items-center shadow-md disabled:opacity-50"
                                >
                                    {processing ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin mr-2"></i> Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-save mr-2"></i> Simpan Perubahan
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

