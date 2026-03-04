import React, { useState, useEffect, useRef } from 'react';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import axios from 'axios';
import MainLayout from '@/Layouts/MainLayout';

export default function Edit({ user, provinces, regencies: initialRegencies, districts: initialDistricts, redirect_to }) {
    const { flash, errors } = usePage().props;
    const [regencies, setRegencies] = useState(initialRegencies || []);
    const [districts, setDistricts] = useState(initialDistricts || []);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [photoPreview, setPhotoPreview] = useState(user.profile_photo_url);

    const { data, setData, post, processing } = useForm({
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
        redirect_to: redirect_to || '',
        _method: 'PUT'
    });

    // Effect for cascading dropdowns - dengan AbortController untuk hindari race condition
    useEffect(() => {
        if (!data.province_id || data.province_id === user.profile?.province_id) return;
        const ac = new AbortController();
        axios.get(`/profile/ajax/regencies/${data.province_id}`, { signal: ac.signal })
            .then(res => {
                setRegencies(res.data);
                setDistricts([]);
                setData(prev => ({ ...prev, regency_id: '', district_id: '' }));
            })
            .catch(err => { if (err.name !== 'CanceledError') console.error(err); });
        return () => ac.abort();
    }, [data.province_id]);

    useEffect(() => {
        if (!data.regency_id || data.regency_id === user.profile?.regency_id) return;
        const ac = new AbortController();
        axios.get(`/profile/ajax/districts/${data.regency_id}`, { signal: ac.signal })
            .then(res => {
                setDistricts(res.data);
                setData(prev => ({ ...prev, district_id: '' }));
            })
            .catch(err => { if (err.name !== 'CanceledError') console.error(err); });
        return () => ac.abort();
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
            Swal.fire('Error', 'Tidak dapat mengakses kamera', 'error');
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

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('profile.update-user', user.id), {
            forceFormData: true,
            onSuccess: () => {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Profil berhasil diperbarui!',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            },
            onError: () => {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: 'Gagal memperbarui profil. Periksa inputan Anda.',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3000
                });
            }
        });
    };

    return (
        <MainLayout>
            <Head title="Edit Profil" />
            
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white shadow rounded-xl mb-4 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                        <h5 className="m-0 flex items-center text-gray-800 font-semibold text-lg">
                            <i className="fas fa-user-edit fa-lg mr-3"></i>Edit Profil
                        </h5>
                    </div>

                    <div className="p-6">
                        {/* Flash messages are handled globally */}

                        
                        {/* Validation errors are handled globally */}


                        {/* Foto Profil Card */}
                        <div className="bg-white shadow-sm rounded-lg mb-6 border border-gray-100">
                            <div className="text-center p-6">
                                <div className="relative inline-block mb-2">
                                    <img 
                                        src={photoPreview}
                                        className="rounded-full shadow-sm h-40 w-40 object-cover ring-4 ring-white"
                                        alt="Foto profil"
                                        onError={(e) => {e.target.src = '/assets/images/profilefoto/default-profile.png'}}
                                    />
                                </div>
                                <div className="flex justify-center gap-2 mt-2">
                                    <button 
                                        type="button" 
                                        onClick={startCamera}
                                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-secondary hover:bg-blue-700 focus:outline-none transition"
                                        title="Ambil dengan Kamera"
                                    >
                                        <i className="fas fa-camera mr-2"></i> Kamera
                                    </button>
                                    <label className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none transition cursor-pointer">
                                        <i className="fas fa-file-upload mr-2"></i> Upload
                                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Camera Modal Overlay */}
                        {showCamera && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
                                <div className="bg-white rounded-lg overflow-hidden shadow-xl max-w-lg w-full">
                                    <div className="p-4 bg-gray-100 border-b flex justify-between items-center">
                                        <h3 className="font-bold text-gray-800">Ambil Foto</h3>
                                        <button onClick={stopCamera} className="text-gray-500 hover:text-gray-700">&times;</button>
                                    </div>
                                    <div className="p-4 flex flex-col items-center">
                                        <video ref={videoRef} className="w-full rounded mb-4 bg-black" autoPlay playsInline></video>
                                        <canvas ref={canvasRef} width="320" height="240" className="hidden"></canvas>
                                        <div className="flex gap-4">
                                            <button onClick={capturePhoto} className="bg-secondary text-white px-4 py-2 rounded hover:bg-blue-700">
                                                <i className="fas fa-camera mr-2"></i> Ambil
                                            </button>
                                            <button onClick={stopCamera} className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">
                                                Batal
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="mt-4">
                            <div className="space-y-4">

                                <div className="sm:flex sm:items-center">
                                    <label className="sm:w-1/3 text-sm font-medium text-gray-700">Nama Lengkap</label>
                                    <div className="sm:w-2/3 mt-2 sm:mt-0">
                                        <input 
                                            type="text" 
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500" 
                                            value={data.name}
                                            onChange={e => setData('name', e.target.value)}
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className="sm:flex sm:items-center">
                                    <label className="sm:w-1/3 text-sm font-medium text-gray-700">Email</label>
                                    <div className="sm:w-2/3 mt-2 sm:mt-0">
                                        <input 
                                            type="email" 
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500" 
                                            value={data.email}
                                            onChange={e => setData('email', e.target.value)}
                                            required 
                                        />
                                    </div>
                                </div>

                                <div className="sm:flex sm:items-center">
                                    <label className="sm:w-1/3 text-sm font-medium text-gray-700">No. HP</label>
                                    <div className="sm:w-2/3 mt-2 sm:mt-0">
                                        <input 
                                            type="text" 
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500" 
                                            value={data.no_hp}
                                            onChange={e => setData('no_hp', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="sm:flex sm:items-center">
                                    <label className="sm:w-1/3 text-sm font-medium text-gray-700">Jenis Kelamin</label>
                                    <div className="sm:w-2/3 mt-2 sm:mt-0">
                                        <select 
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500" 
                                            value={data.jenis_kelamin}
                                            onChange={e => setData('jenis_kelamin', e.target.value)}
                                        >
                                            <option value="">Pilih Jenis Kelamin</option>
                                            <option value="Laki-laki">Laki-laki</option>
                                            <option value="Perempuan">Perempuan</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="sm:flex sm:items-center">
                                    <label className="sm:w-1/3 text-sm font-medium text-gray-700">Pekerjaan</label>
                                    <div className="sm:w-2/3 mt-2 sm:mt-0">
                                        <input 
                                            type="text" 
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500" 
                                            value={data.pekerjaan}
                                            onChange={e => setData('pekerjaan', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="sm:flex sm:items-center">
                                    <label className="sm:w-1/3 text-sm font-medium text-gray-700">Instansi</label>
                                    <div className="sm:w-2/3 mt-2 sm:mt-0">
                                        <input 
                                            type="text" 
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500" 
                                            value={data.instansi}
                                            onChange={e => setData('instansi', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="sm:flex sm:items-center">
                                    <label className="sm:w-1/3 text-sm font-medium text-gray-700">Jabatan</label>
                                    <div className="sm:w-2/3 mt-2 sm:mt-0">
                                        <input 
                                            type="text" 
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500" 
                                            value={data.jabatan}
                                            onChange={e => setData('jabatan', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="sm:flex sm:items-center">
                                    <label className="sm:w-1/3 text-sm font-medium text-gray-700">Provinsi</label>
                                    <div className="sm:w-2/3 mt-2 sm:mt-0">
                                        <select 
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={data.province_id}
                                            onChange={e => setData('province_id', e.target.value)}
                                        >
                                            <option value="">Pilih Provinsi</option>
                                            {provinces.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="sm:flex sm:items-center">
                                    <label className="sm:w-1/3 text-sm font-medium text-gray-700">Kabupaten/Kota</label>
                                    <div className="sm:w-2/3 mt-2 sm:mt-0">
                                        <select 
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={data.regency_id}
                                            onChange={e => setData('regency_id', e.target.value)}
                                            disabled={!data.province_id}
                                        >
                                            <option value="">Pilih Kabupaten/Kota</option>
                                            {regencies.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="sm:flex sm:items-center">
                                    <label className="sm:w-1/3 text-sm font-medium text-gray-700">Kecamatan</label>
                                    <div className="sm:w-2/3 mt-2 sm:mt-0">
                                        <select 
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                            value={data.district_id}
                                            onChange={e => setData('district_id', e.target.value)}
                                            disabled={!data.regency_id}
                                        >
                                            <option value="">Pilih Kecamatan</option>
                                            {districts.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="sm:flex sm:items-start">
                                    <label className="sm:w-1/3 text-sm font-medium text-gray-700 mt-2">Alamat Lengkap</label>
                                    <div className="sm:w-2/3 mt-2 sm:mt-0">
                                        <textarea 
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                                            rows="3"
                                            value={data.alamat}
                                            onChange={e => setData('alamat', e.target.value)}
                                        ></textarea>
                                    </div>
                                </div>

                            </div>

                            <div className="mt-8 flex justify-end">
                                <Link
                                    href={route('profile.show', user.id)}
                                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md mr-3 hover:bg-gray-300 transition"
                                >
                                    Batal
                                </Link>
                                <button 
                                    type="submit" 
                                    disabled={processing}
                                    className="bg-secondary text-white px-6 py-2 rounded-md hover:bg-blue-700 transition shadow-sm disabled:opacity-50 flex items-center"
                                >
                                    {processing && <i className="fas fa-spinner fa-spin mr-2"></i>}
                                    Simpan Perubahan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

