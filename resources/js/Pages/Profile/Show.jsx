import React, { useState } from 'react';
import { Head, useForm, usePage, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import MyQrCodeModal from '@/Components/MyQrCodeModal';
import Cropper from 'react-easy-crop';
import Swal from 'sweetalert2';

export default function ProfileShow({ auth, user, provinces = [] }) {
    const { props } = usePage();
    const flash = props.flash || {};
    const missingFields = Array.isArray(flash.missing_profile_fields) ? flash.missing_profile_fields : [];

    const isFieldRequired = (key) => {
        if (['name', 'email'].includes(key)) return true;
        return missingFields.includes(key);
    };

    const isOwnProfile = auth.user.id === user.id;
    const isSuperAdmin = auth.user.role === 'superadmin' || (auth.user.roles && auth.user.roles.some(r => r.name === 'superadmin'));
    const canEdit = isOwnProfile || isSuperAdmin;
    const [activeTab, setActiveTab] = useState('overview');
    const [showQrModal, setShowQrModal] = useState(false);
    const [showNotification, setShowNotification] = useState(false);

    // Auto-hide notification
    React.useEffect(() => {
        if (flash.success || flash.error) {
            setShowNotification(true);
            const timer = setTimeout(() => setShowNotification(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    // Region Data States
    const [regencies, setRegencies] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loadingRegencies, setLoadingRegencies] = useState(false);

    const [loadingDistricts, setLoadingDistricts] = useState(false);

    // Manual processing state for router.post
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cropper State
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [imageSrc, setImageSrc] = useState(null);
    const [showCropper, setShowCropper] = useState(false);

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const readFile = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.addEventListener('load', () => resolve(reader.result), false);
            reader.readAsDataURL(file);
        });
    };

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc, pixelCrop) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return null;
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((file) => {
                resolve(file);
            }, 'image/jpeg');
        });
    };

    const saveCroppedImage = async () => {
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            const file = new File([croppedBlob], "profile_cropped.jpg", { type: "image/jpeg" });
            setData('foto_file', file);
            setShowCropper(false);
            // Optional: Show preview immediately if needed, but setData triggers re-render with objectURL
        } catch (e) {
            console.error(e);
        }
    };

    // Profile Edit Form
    const { data, setData, put, processing, errors, transform } = useForm({
        name: user.name || '',
        email: user.email || '',
        no_hp: user.profile?.no_hp || '',
        pekerjaan: user.profile?.pekerjaan || '',
        jabatan: user.profile?.jabatan || '',
        alamat: user.profile?.alamat || '',
        jenis_kelamin: user.profile?.jenis_kelamin || 'L',
        tanggal_lahir: user.profile?.tanggal_lahir ? user.profile.tanggal_lahir.split('T')[0] : '',
        province_id: user.profile?.province_id || '',
        regency_id: user.profile?.regency_id || '',
        district_id: user.profile?.district_id || '',
        foto_file: null,
        cover_file: null,
    });

    // Load initial region data if editing
    React.useEffect(() => {
        if (data.province_id) fetchRegencies(data.province_id);
    }, []);

    React.useEffect(() => {
        if (data.regency_id) fetchDistricts(data.regency_id);
    }, [regencies]); // Run after regencies loaded to ensure we can set value if needed

    const fetchRegencies = async (provinceId) => {
        if (!provinceId) {
            setRegencies([]);
            return;
        }
        setLoadingRegencies(true);
        try {
            const response = await fetch(route('profile.ajax.regencies', provinceId));
            if (!response.ok) {
                // If 404 or other error, clear regencies
                setRegencies([]);
                return;
            }
            const json = await response.json();
            setRegencies(Array.isArray(json) ? json : []);
        } catch (error) {
            console.error("Failed to fetch regencies", error);
            setRegencies([]);
        } finally {
            setLoadingRegencies(false);
        }
    };

    const fetchDistricts = async (regencyId) => {
        if (!regencyId) {
            setDistricts([]);
            return;
        }
        setLoadingDistricts(true);
        try {
            const response = await fetch(route('profile.ajax.districts', regencyId));
            if (!response.ok) {
                setDistricts([]);
                return;
            }
            const json = await response.json();
            setDistricts(Array.isArray(json) ? json : []);
        } catch (error) {
            console.error("Failed to fetch districts", error);
            setDistricts([]);
        } finally {
            setLoadingDistricts(false);
        }
    };

    // Password Update Form
    const { data: passData, setData: setPassData, put: putPass, processing: passProcessing, errors: passErrors, reset: resetPass } = useForm({
        user_id: user.id,
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
    });

    // Handle Profile Update
    const submitProfile = (e) => {
        e.preventDefault();

        // Use Inertia's router.post with `_method: 'PUT'` to handle file uploads via method spoofing.
        // Inertia automatically converts the data object to FormData when it detects files.
        // Use profile.update-user to support editing other users (admin/superadmin)
        router.post(route('profile.update-user', user.uid || user.id), {
            ...data,
            _method: 'PUT',
        }, {
            forceFormData: true,
            preserveScroll: true,
            onStart: () => setIsSubmitting(true),
            onFinish: () => setIsSubmitting(false),
            onSuccess: () => {
                setShowNotification(true);
            },
            onError: (errors) => {
                console.error('Profile update errors:', errors);
                setIsSubmitting(false);
            }
        });
    };

    const submitPassword = (e) => {
        e.preventDefault();
        putPass(route('profile.update-password'), {
            preserveScroll: true,
            onSuccess: () => resetPass(),
        });
    };

    const handleFileChange = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];

            // Limit file size to 2MB to prevent post_max_size issues
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire({
                    title: 'Ukuran File Terlalu Besar',
                    text: 'Max 2MB. Silakan kompres foto Anda terlebih dahulu.',
                    icon: 'warning',
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Oke'
                });
                e.target.value = '';
                return;
            }

            const imageDataUrl = await readFile(file);
            setImageSrc(imageDataUrl);
            setShowCropper(true);
            setCrop({ x: 0, y: 0 });
            setZoom(1);
        }
    };

    const handleCoverChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Limit file size to 2MB
            if (file.size > 2 * 1024 * 1024) {
                Swal.fire({
                    title: 'Ukuran File Terlalu Besar',
                    text: 'Max 2MB. Silakan kompres foto Anda terlebih dahulu.',
                    icon: 'warning',
                    confirmButtonColor: '#3085d6',
                    confirmButtonText: 'Oke'
                });
                e.target.value = '';
                return;
            }
            setData('cover_file', file);
        }
    };

    const qrCodeUrl = `/profile/qr-code/${user.uid || user.id}`;

    return (
        <AdminLayout title={`Profil - ${user.name}`}>
            <MyQrCodeModal user={user} isOpen={showQrModal} onClose={() => setShowQrModal(false)} />

            {/* Image Cropper Modal */}
            {showCropper && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl overflow-hidden w-full max-w-lg shadow-2xl">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg">Sesuaikan Foto</h3>
                            <button onClick={() => setShowCropper(false)} className="text-gray-500 hover:text-gray-700"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="relative w-full h-80 bg-gray-900">
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
                        <div className="p-4 flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Zoom</label>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(e.target.value)}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setShowCropper(false)} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition">Batal</button>
                                <button onClick={saveCroppedImage} className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition shadow-lg shadow-amber-600/20">Simpan Foto</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-6xl mx-auto">
                {/* Missing Profile Fields Alert */}
                {Array.isArray(flash.missing_profile_fields) && flash.missing_profile_fields.length > 0 && (
                    <div className="mb-6 animate-in slide-in-from-top-4 duration-500">
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <i className="fas fa-exclamation-circle text-red-500 text-xl"></i>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-bold text-red-800">
                                        Profil Belum Lengkap
                                    </h3>
                                    <div className="mt-1 text-sm text-red-700">
                                        <p>{flash.error || "Silakan lengkapi data profil Anda untuk melanjutkan."}</p>
                                        <ul className="list-disc list-inside mt-2 font-semibold">
                                            {flash.missing_profile_fields.map((field, idx) => (
                                                <li key={idx}>{field}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header Profile Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8 relative group/cover">
                    {/* Cover Placeholder */}
                    <div className="h-48 bg-gradient-to-r from-gray-900 to-gray-800 relative overflow-hidden">
                        {/* Preview Cover if uploaded, else existing cover, else default pattern */}
                        {data.cover_file ? (
                            <img src={URL.createObjectURL(data.cover_file)} className="w-full h-full object-cover" />
                        ) : user.profile?.cover_image ? (
                            <img src={`/assets/images/profilecover/${user.profile.cover_image}`} className="w-full h-full object-cover" />
                        ) : (
                            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>
                        )}

                        {canEdit && (
                            <div className="absolute inset-0 bg-black/0 group-hover/cover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover/cover:opacity-100">
                                <button
                                    onClick={() => document.getElementById('coverInput').click()}
                                    className="px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-white text-sm font-medium hover:bg-white/30 transition shadow-lg"
                                >
                                    <i className="fas fa-camera mr-2"></i> Ganti Sampul
                                </button>
                                <input type="file" id="coverInput" className="hidden" accept="image/*" onChange={handleCoverChange} />
                            </div>
                        )}
                    </div>

                    <div className="px-8 pb-8 -mt-20 relative z-10">
                        <div className="flex flex-col lg:flex-row justify-between items-stretch gap-8">
                            {/* Left Side: Avatar, Bio and QR Code */}
                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-2">
                                    {/* Avatar */}
                                    <div className="relative group flex-shrink-0">
                                        <div className="w-40 h-40 md:w-44 md:h-44 rounded-full border-[6px] border-white bg-white shadow-2xl overflow-hidden">
                                            <img
                                                src={data.foto_file ? URL.createObjectURL(data.foto_file) : user.profile_photo_url}
                                                className="w-full h-full object-cover"
                                                onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                            />
                                            {canEdit && (
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full" onClick={() => document.getElementById('avatarInput').click()}>
                                                    <i className="fas fa-camera text-white text-3xl"></i>
                                                </div>
                                            )}
                                        </div>
                                        {canEdit && <input type="file" id="avatarInput" className="hidden" accept="image/*" onChange={handleFileChange} />}
                                    </div>

                                    {/* Bio Info */}
                                    <div className="text-center md:text-left mb-4">
                                        <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-none mb-2">{user.name}</h1>
                                        <p className="text-gray-500 font-bold text-lg mb-3 tracking-tight">{user.email}</p>
                                        <div className="flex items-center justify-center md:justify-start gap-2 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                                            <i className="fas fa-calendar-alt text-gray-300"></i>
                                            <span>Bergabung {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* QR Code Button - Clearly Positioned Below Avatar */}
                                <div className="flex items-center justify-center md:justify-start">
                                    <button
                                        onClick={() => setShowQrModal(true)}
                                        className="px-6 py-2.5 bg-[#F4F7FA] text-black rounded-2xl font-black text-xs uppercase tracking-widest border border-gray-100/50 hover:bg-gray-100 transition flex items-center gap-3 shadow-sm"
                                    >
                                        <i className="fas fa-qrcode text-sm"></i>
                                        <span>QR Code</span>
                                    </button>
                                </div>
                            </div>

                            {/* Right Side: Status & Kapasitas Card - EXACT MOCKUP STYLE */}
                            <div className="flex items-end justify-center lg:justify-end">
                                <div className="bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] min-w-[320px] animate-in fade-in slide-in-from-right-8 duration-1000">
                                    <div className="flex items-center gap-5 mb-6">
                                        <div className="w-16 h-16 rounded-[1.25rem] bg-gradient-to-br from-[#2D60FF] to-[#1E4DCC] flex items-center justify-center shadow-[0_10px_25px_-5px_rgba(45,96,255,0.4)]">
                                            <i className="fas fa-user-check text-white text-2xl"></i>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status Akun</span>
                                                <div className="w-2 h-2 rounded-full bg-amber-400 border-2 border-amber-100 shadow-[0_0_8px_rgba(251,191,36,0.4)]"></div>
                                            </div>
                                            <span className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none block">
                                                {user.role || 'GUEST'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-5 border-t border-gray-50 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-black uppercase tracking-[0.15em] text-gray-400">Kapasitas</span>
                                            <span className="text-[10px] font-black px-3 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 uppercase tracking-tighter shadow-sm">
                                                {user.subscription?.plan?.name || 'FREE'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white px-4 py-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center transitionhover:shadow-md cursor-default">
                                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-2">Peserta</span>
                                                <span className="text-xl font-black text-gray-800 leading-none">{user.subscription?.plan?.max_participants_per_activity || '∞'}</span>
                                            </div>
                                            <div className="bg-white px-4 py-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center transitionhover:shadow-md cursor-default">
                                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-2">Kegiatan</span>
                                                <span className="text-xl font-black text-gray-800 leading-none">{user.subscription?.plan?.max_activities || '∞'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="px-8 mt-2 border-t border-gray-100 flex gap-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-4 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'overview' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Overview & Edit
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`py-4 font-medium text-sm border-b-2 transition whitespace-nowrap ${activeTab === 'security' ? 'border-amber-500 text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            Keamanan
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">

                    {activeTab === 'overview' && (
                        <form onSubmit={submitProfile} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Informasi Pribadi</h2>
                                {canEdit && (
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-5 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <i className="fas fa-circle-notch animate-spin"></i>
                                                Menyimpan...
                                            </>
                                        ) : 'Simpan Perubahan'}
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Nama Lengkap {isFieldRequired('name') && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition ${isFieldRequired('name') && !data.name ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                        placeholder="Nama Lengkap Anda"
                                        disabled={!canEdit}
                                        required={isFieldRequired('name')}
                                    />
                                    {errors.name && <div className="text-red-500 text-xs mt-1">{errors.name}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email {isFieldRequired('email') && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition ${isFieldRequired('email') && !data.email ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                        placeholder="email@example.com"
                                        disabled={!canEdit}
                                        required={isFieldRequired('email')}
                                    />
                                    {errors.email && <div className="text-red-500 text-xs mt-1">{errors.email}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        No. HP / WhatsApp {isFieldRequired('no_hp') && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={data.no_hp}
                                        onChange={(e) => setData('no_hp', e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition ${isFieldRequired('no_hp') && !data.no_hp ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                        placeholder="08xxxxxxxxxx"
                                        disabled={!canEdit}
                                        required={isFieldRequired('no_hp')}
                                    />
                                    {errors.no_hp && <div className="text-red-500 text-xs mt-1">{errors.no_hp}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Pekerjaan {isFieldRequired('pekerjaan') && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={data.pekerjaan}
                                        onChange={(e) => setData('pekerjaan', e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition ${isFieldRequired('pekerjaan') && !data.pekerjaan ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                        placeholder="Pekerjaan Anda"
                                        disabled={!canEdit}
                                        required={isFieldRequired('pekerjaan')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Jabatan {isFieldRequired('jabatan') && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={data.jabatan}
                                        onChange={(e) => setData('jabatan', e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition ${isFieldRequired('jabatan') && !data.jabatan ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                        placeholder="Jabatan (Opsional)"
                                        disabled={!canEdit}
                                        required={isFieldRequired('jabatan')}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Jenis Kelamin {isFieldRequired('jenis_kelamin') && <span className="text-red-500">*</span>}
                                    </label>
                                    <select
                                        value={data.jenis_kelamin}
                                        onChange={(e) => setData('jenis_kelamin', e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition ${isFieldRequired('jenis_kelamin') && !data.jenis_kelamin ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                        disabled={!canEdit}
                                        required={isFieldRequired('jenis_kelamin')}
                                    >
                                        <option value="L">Laki-laki</option>
                                        <option value="P">Perempuan</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Tanggal Lahir {isFieldRequired('birth_date') && <span className="text-red-500">*</span>}
                                    </label>
                                    <input
                                        type="date"
                                        value={data.tanggal_lahir}
                                        onChange={(e) => setData('tanggal_lahir', e.target.value)}
                                        className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition ${isFieldRequired('birth_date') && !data.tanggal_lahir ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                        disabled={!canEdit}
                                        required={isFieldRequired('birth_date')}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Alamat Lengkap {isFieldRequired('alamat') && <span className="text-red-500">*</span>}
                                    </label>
                                    <textarea
                                        value={data.alamat}
                                        onChange={(e) => setData('alamat', e.target.value)}
                                        rows="3"
                                        className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition ${isFieldRequired('alamat') && !data.alamat ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                        placeholder="Alamat lengkap domisili saat ini..."
                                        disabled={!canEdit}
                                        required={isFieldRequired('alamat')}
                                    ></textarea>
                                </div>

                                {/* Region Selects */}
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Provinsi {isFieldRequired('province_id') && <span className="text-red-500">*</span>}
                                        </label>
                                        <select
                                            value={data.province_id}
                                            onChange={(e) => {
                                                setData(d => ({ ...d, province_id: e.target.value, regency_id: '', district_id: '' }));
                                                fetchRegencies(e.target.value);
                                            }}
                                            className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition ${(isFieldRequired('province_id') && !data.province_id) || errors.province_id ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                            disabled={!canEdit}
                                            required={isFieldRequired('province_id')}
                                        >
                                            <option value="">Pilih Provinsi</option>
                                            {provinces.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        {errors.province_id && <div className="text-red-500 text-xs mt-1">{errors.province_id}</div>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Kabupaten/Kota {isFieldRequired('regency_id') && <span className="text-red-500">*</span>}
                                        </label>
                                        <select
                                            value={data.regency_id}
                                            onChange={(e) => {
                                                setData(d => ({ ...d, regency_id: e.target.value, district_id: '' }));
                                                fetchDistricts(e.target.value);
                                            }}
                                            className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition ${(isFieldRequired('regency_id') && !data.regency_id) || errors.regency_id ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                            disabled={!canEdit || loadingRegencies || !data.province_id}
                                            required={isFieldRequired('regency_id')}
                                        >
                                            <option value="">{loadingRegencies ? 'Memuat...' : 'Pilih Kota/Kab'}</option>
                                            {regencies.map(r => (
                                                <option key={r.id} value={r.id}>{r.name}</option>
                                            ))}
                                        </select>
                                        {errors.regency_id && <div className="text-red-500 text-xs mt-1">{errors.regency_id}</div>}
                                        {!data.province_id && data.regency_id && <div className="text-amber-600 text-[10px] mt-1 italic font-medium">Pilih Provinsi terlebih dahulu untuk memvalidasi data ini.</div>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Kecamatan {isFieldRequired('district_id') && <span className="text-red-500">*</span>}
                                        </label>
                                        <select
                                            value={data.district_id}
                                            onChange={(e) => setData('district_id', e.target.value)}
                                            className={`w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition ${(isFieldRequired('district_id') && !data.district_id) || errors.district_id ? 'border-red-300 ring-1 ring-red-200' : ''}`}
                                            disabled={!canEdit || loadingDistricts || !data.regency_id}
                                            required={isFieldRequired('district_id')}
                                        >
                                            <option value="">{loadingDistricts ? 'Memuat...' : 'Pilih Kecamatan'}</option>
                                            {districts.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                        {errors.district_id && <div className="text-red-500 text-xs mt-1">{errors.district_id}</div>}
                                    </div>
                                </div>
                            </div>
                        </form>
                    )}

                    {activeTab === 'security' && canEdit && (
                        <form onSubmit={submitPassword} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-800">Ubah Password</h2>
                                <button
                                    type="submit"
                                    disabled={passProcessing}
                                    className="px-5 py-2 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {passProcessing ? 'Menyimpan...' : 'Update Password'}
                                </button>
                            </div>

                            <div className="space-y-6 max-w-xl">
                                {isOwnProfile && (
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Password Saat Ini</label>
                                        <input
                                            type="password"
                                            value={passData.current_password}
                                            onChange={(e) => setPassData('current_password', e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition"
                                            placeholder="••••••••"
                                        />
                                        {passErrors.current_password && <div className="text-red-500 text-xs mt-1">{passErrors.current_password}</div>}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Password Baru</label>
                                    <input
                                        type="password"
                                        value={passData.new_password}
                                        onChange={(e) => setPassData('new_password', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition"
                                        placeholder="••••••••"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Minimal 8 karakter. Disarankan menggunakan kombinasi huruf besar, huruf kecil, angka, dan simbol.
                                    </p>
                                    {passErrors.new_password && <div className="text-red-500 text-xs mt-1">{passErrors.new_password}</div>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Konfirmasi Password Baru</label>
                                    <input
                                        type="password"
                                        value={passData.new_password_confirmation}
                                        onChange={(e) => setPassData('new_password_confirmation', e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 border-gray-200 focus:border-amber-500 focus:ring-amber-500 transition"
                                        placeholder="••••••••"
                                    />
                                    {passErrors.new_password_confirmation && <div className="text-red-500 text-xs mt-1">{passErrors.new_password_confirmation}</div>}
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                {/* Sidebar Info - Subscription & Stats */}
                <div className="space-y-8">
                    {/* Subscription Card - Fixed visibility and enhanced aesthetics */}
                    <div className="bg-slate-900 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden">
                        {/* Vibrant decorative gradients */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/30 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-[80px] -ml-32 -mb-32"></div>

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">Status Langganan</h3>
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                    <i className="fas fa-crown text-amber-400"></i>
                                </div>
                            </div>

                            <div className="mb-6">
                                <span className={`inline-block px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${user.subscription?.isActive ? 'bg-amber-400 text-amber-950 shadow-lg shadow-amber-400/20' : 'bg-slate-800 text-slate-300 border border-slate-700'}`}>
                                    {user.subscription?.isActive ? (user.subscription.plan?.name || 'Premium') : 'FREE PLAN'}
                                </span>
                            </div>

                            {user.subscription?.isActive ? (
                                <div className="space-y-4">
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        Langganan Anda aktif hingga <span className="text-white font-bold">{new Date(user.subscription.ends_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>.
                                    </p>
                                    <Link href="/subscriptions/manage" className="block w-full py-3.5 bg-white text-slate-900 font-bold text-center rounded-2xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-white/10 active:scale-[0.98]">
                                        Kelola Langganan
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        Upgrade ke Premium untuk akses fitur eksklusif, batas lebih tinggi, dan analitik lengkap.
                                    </p>
                                    <Link href={route('subscriptions.pricing')} className="block w-full py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 font-black text-center rounded-2xl hover:from-amber-300 hover:to-amber-400 transition-all shadow-lg shadow-amber-400/20 active:scale-[0.98]">
                                        Upgrade Sekarang
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-800 mb-4">Statistik Singkat</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                                        <i className="fas fa-calendar-check"></i>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">Total Kegiatan</span>
                                </div>
                                <span className="font-bold text-gray-900">{user.activities_count || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                        <i className="fas fa-users"></i>
                                    </div>
                                    <span className="text-sm font-medium text-gray-600">Partisipasi</span>
                                </div>
                                <span className="font-bold text-gray-900">{user.participations_count || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
