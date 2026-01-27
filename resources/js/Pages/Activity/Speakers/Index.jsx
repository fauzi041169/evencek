import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import AcaraLayout from '@/Layouts/AcaraLayout';
import Swal from 'sweetalert2';

export default function Index({ activity, speakers: initialSpeakers }) {
    const [speakers, setSpeakers] = useState(initialSpeakers || []);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingSpeaker, setEditingSpeaker] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [errors, setErrors] = useState({});
    const [flashMessage, setFlashMessage] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [cvName, setCvName] = useState(null);

    const { data, setData, post, put, processing, reset } = useForm({
        name: '',
        title: '',
        institution: '',
        bio: '',
        photo: null,
        cv: null,
        email: '',
        phone: '',
        linkedin: '',
        instagram: '',
    });

    const colors = [
        { bg: 'from-blue-500 to-cyan-500', border: 'border-blue-300', text: 'text-secondary' },
        { bg: 'from-purple-500 to-pink-500', border: 'border-purple-300', text: 'text-primary' },
        { bg: 'from-green-500 to-emerald-500', border: 'border-green-300', text: 'text-green-600' },
        { bg: 'from-orange-500 to-red-500', border: 'border-orange-300', text: 'text-orange-600' },
        { bg: 'from-indigo-500 to-purple-500', border: 'border-indigo-300', text: 'text-primary' },
        { bg: 'from-pink-500 to-rose-500', border: 'border-pink-300', text: 'text-pink-600' },
    ];

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const timeout = setTimeout(() => {
            fetch(route('activity.speakers.search', activity.id) + '?q=' + encodeURIComponent(searchQuery))
                .then(res => res.json())
                .then(data => {
                    setSearchResults(data.speakers || []);
                    setIsSearching(false);
                })
                .catch(() => {
                    setIsSearching(false);
                });
        }, 150);

        return () => clearTimeout(timeout);
    }, [searchQuery]);

    const selectSpeaker = (speaker) => {
        setData({
            ...data,
            name: speaker.name || '',
            title: speaker.title || '',
            institution: speaker.institution || '',
            bio: speaker.bio || '',
            email: speaker.email || '',
            phone: speaker.phone || '',
            linkedin: speaker.linkedin || '',
            instagram: speaker.instagram || '',
        });
        setSearchResults([]);
        setSearchQuery('');
        setFlashMessage('Data narasumber telah diisi. Anda dapat mengubah atau menambahkan informasi lainnya.');
        setTimeout(() => setFlashMessage(null), 3000);
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData();
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== '') {
                formData.append(key, data[key]);
            }
        });

        fetch(route('activity.speakers.store', activity.id), {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
            },
            body: formData,
        })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    setShowCreateModal(false);
                    reset();
                    setPhotoPreview(null);
                    setCvName(null);
                    setErrors({});
                    router.reload();
                } else {
                    setErrors(result.errors || {});
                }
            })
            .catch(() => {
                setErrors({ general: ['Terjadi kesalahan jaringan.'] });
            });
    };

    const handleEditSubmit = (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('_method', 'PUT');
        Object.keys(data).forEach(key => {
            if (data[key] !== null && data[key] !== '') {
                formData.append(key, data[key]);
            }
        });

        fetch(route('activity.speakers.update', [activity.id, editingSpeaker.id]), {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
            },
            body: formData,
        })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    setShowEditModal(false);
                    setEditingSpeaker(null);
                    reset();
                    setPhotoPreview(null);
                    setCvName(null);
                    setErrors({});
                    router.reload();
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Data narasumber berhasil diperbarui!',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                } else {
                    setErrors(result.errors || {});
                }
            })
            .catch(() => {
                setErrors({ general: ['Terjadi kesalahan jaringan.'] });
            });
    };

    const openEditModal = (speaker) => {
        setEditingSpeaker(speaker);
        setData({
            name: speaker.name || '',
            title: speaker.title || '',
            institution: speaker.institution || '',
            bio: speaker.bio || '',
            photo: null,
            cv: null,
            email: speaker.email || '',
            phone: speaker.phone || '',
            linkedin: speaker.linkedin || '',
            instagram: speaker.instagram || '',
        });
        setPhotoPreview(null);
        setCvName(null);
        setErrors({});
        setShowEditModal(true);
    };

    const openCreateModal = () => {
        reset();
        setPhotoPreview(null);
        setCvName(null);
        setErrors({});
        setShowCreateModal(true);
    };

    const handleDelete = (speaker) => {
        Swal.fire({
            title: 'Hapus Narasumber?',
            text: 'Apakah Anda yakin ingin menghapus narasumber ini? Tindakan ini tidak dapat dibatalkan.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E02424',
            cancelButtonColor: '#718096',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('activity.speakers.destroy', [activity.id, speaker.id]));
            }
        });
    };

    return (
        <AcaraLayout activity={activity}>
            <Head title="Manajemen Narasumber" />

            <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 pb-20">
                {/* Header Section */}
                <div className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 border-b border-indigo-400 sticky top-0 z-30 shadow-lg">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <h1 className="text-2xl font-bold text-white sm:text-3xl tracking-tight leading-tight flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                        <i className="fas fa-microphone text-white text-xl"></i>
                                    </div>
                                    Manajemen Narasumber
                                </h1>
                                <p className="mt-2 text-sm text-indigo-100 flex items-center flex-wrap gap-2">
                                    Mengelola daftar narasumber untuk kegiatan:
                                    <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-sm max-w-xs truncate">
                                        <i className="fas fa-calendar-alt mr-1.5"></i> {activity.name}
                                    </span>
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={openCreateModal}
                                    className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all transform hover:scale-105 active:scale-95"
                                >
                                    <i className="fas fa-plus-circle mr-2 text-lg"></i>
                                    Tambah Narasumber
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {flashMessage && (
                        <div className="fixed top-4 right-4 bg-primary text-white rounded-lg px-4 py-3 shadow-lg z-50">
                            <i className="fas fa-check-circle mr-2"></i>{flashMessage}
                        </div>
                    )}

                    {speakers.length === 0 ? (
                        <div className="text-center py-20 bg-gradient-to-br from-white to-purple-50 rounded-3xl border-2 border-dashed border-purple-300 shadow-lg">
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-white mb-6 shadow-lg">
                                <i className="fas fa-microphone text-4xl"></i>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Belum ada narasumber</h3>
                            <p className="text-gray-600 mb-8 max-w-sm mx-auto">Tambahkan narasumber untuk kegiatan ini agar peserta dapat melihat siapa yang akan mengisi acara.</p>
                            <button
                                onClick={openCreateModal}
                                className="inline-flex items-center px-6 py-3 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-primary to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transform hover:scale-105 transition-all"
                            >
                                <i className="fas fa-plus mr-2"></i> Tambah Narasumber Sekarang
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {speakers.map((speaker, index) => {
                                const color = colors[index % colors.length];
                                return (
                                    <div key={speaker.id} className={`bg-white rounded-2xl border-2 ${color.border} shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden group transform hover:-translate-y-2 flex flex-col`}>
                                        <div className={`bg-gradient-to-br ${color.bg} relative flex-1 min-h-[450px]`}>
                                            {speaker.photo ? (
                                                <img
                                                    src={route('activity.speakers.photo', speaker.id)}
                                                    alt={speaker.name}
                                                    className="w-full h-full object-cover object-top"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white">
                                                    <i className="fas fa-user text-7xl opacity-50"></i>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditModal(speaker)}
                                                    className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-secondary hover:bg-white hover:text-blue-700 transition-all transform hover:scale-110"
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(speaker)}
                                                    className="p-2.5 bg-white/90 backdrop-blur-sm rounded-full shadow-lg text-red-600 hover:bg-white hover:text-red-700 transition-all transform hover:scale-110"
                                                >
                                                    <i className="fas fa-trash-alt"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-6 bg-white">
                                            <h3 className="text-lg font-bold text-gray-900 line-clamp-1 mb-2" title={speaker.name}>{speaker.name}</h3>
                                            <p className={`text-sm ${color.text} font-semibold mb-2 flex items-center gap-2`}>
                                                <i className="fas fa-briefcase"></i>
                                                {speaker.title || 'Narasumber'}
                                            </p>
                                            <p className="text-sm text-gray-600 mb-4 flex items-center gap-2">
                                                <i className="fas fa-building text-gray-400"></i>
                                                {speaker.institution || '-'}
                                            </p>

                                            {speaker.cv && (
                                                <div className="mb-4">
                                                    <a
                                                        href={route('activity.speakers.cv', speaker.id)}
                                                        target="_blank"
                                                        className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-semibold hover:from-red-600 hover:to-pink-600 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                                                    >
                                                        <i className="fas fa-file-pdf mr-2"></i> Download CV
                                                    </a>
                                                </div>
                                            )}

                                            <div className="flex gap-3 pt-4 border-t border-gray-200">
                                                {speaker.linkedin && (
                                                    <a href={speaker.linkedin} target="_blank" className="w-10 h-10 rounded-full bg-secondary/10 text-secondary hover:bg-secondary hover:text-white flex items-center justify-center transition-all transform hover:scale-110">
                                                        <i className="fab fa-linkedin"></i>
                                                    </a>
                                                )}
                                                {speaker.instagram && (
                                                    <a href={speaker.instagram} target="_blank" className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-600 hover:text-white flex items-center justify-center transition-all transform hover:scale-110">
                                                        <i className="fab fa-instagram"></i>
                                                    </a>
                                                )}
                                                {speaker.email && (
                                                    <a href={`mailto:${speaker.email}`} className="w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-600 hover:text-white flex items-center justify-center transition-all transform hover:scale-110">
                                                        <i className="fas fa-envelope"></i>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-60 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block w-full max-w-3xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl sm:align-middle">
                            <div className="bg-gradient-to-r from-primary via-pink-600 to-rose-600 px-6 py-5 flex items-center justify-between shadow-xl">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                        <i className="fas fa-user-plus text-xl"></i>
                                    </div>
                                    Tambah Narasumber Baru
                                </h3>
                                <button onClick={() => setShowCreateModal(false)} className="text-white/80 hover:text-white focus:outline-none transition-colors p-2 hover:bg-white/20 rounded-lg">
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>

                            <div className="p-6 max-h-[85vh] overflow-y-auto">
                                {Object.keys(errors).length > 0 && (
                                    <div className="mb-6 bg-red-50 border-2 border-red-200 rounded-2xl p-5 shadow-sm animate-pulse">
                                        <div className="flex items-start">
                                            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white shadow-lg mr-4 flex-shrink-0">
                                                <i className="fas fa-exclamation-triangle text-lg"></i>
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-sm font-black text-red-800 uppercase tracking-wider mb-1">Terjadi Kesalahan</h3>
                                                <ul className="text-sm text-red-700 list-disc list-inside space-y-0.5 font-medium">
                                                    {Object.entries(errors).map(([key, msgs]) => (
                                                        Array.isArray(msgs) ? msgs.map((msg, i) => (
                                                            <li key={`${key}-${i}`}>{msg}</li>
                                                        )) : <li key={key}>{msgs}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleCreateSubmit} className="space-y-8">

                                    {/* Search Existing Speaker */}
                                    <div className="mb-6 p-6 bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 border-2 border-violet-300 rounded-2xl shadow-lg">
                                        <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-500 rounded-lg flex items-center justify-center text-white">
                                                <i className="fas fa-search text-sm"></i>
                                            </div>
                                            Cari Narasumber yang Sudah Terdaftar
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <i className="fas fa-search text-violet-400"></i>
                                            </div>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="block w-full pl-12 pr-4 py-4 rounded-xl border-2 border-violet-300 bg-white shadow-md focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all text-sm"
                                                placeholder="Ketik nama atau email narasumber (minimal 2 karakter)..."
                                            />
                                            {searchResults.length > 0 && (
                                                <div className="absolute z-[9999] w-full mt-2 bg-white border-2 border-violet-300 rounded-xl shadow-2xl max-h-80 overflow-y-auto">
                                                    <div className="divide-y divide-gray-200">
                                                        {searchResults.map(speaker => (
                                                            <div
                                                                key={speaker.id}
                                                                onClick={() => selectSpeaker(speaker)}
                                                                className="p-4 hover:bg-indigo-50 cursor-pointer transition-all border-l-4 border-transparent hover:border-indigo-500"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-sm font-bold text-gray-900 truncate">{speaker.name}</p>
                                                                        {speaker.title && <p className="text-xs text-gray-600 truncate mt-0.5"><i className="fas fa-briefcase mr-1"></i>{speaker.title}</p>}
                                                                        {speaker.email && <p className="text-xs text-primary truncate mt-1 font-medium"><i className="fas fa-envelope mr-1"></i>{speaker.email}</p>}
                                                                    </div>
                                                                    <i className="fas fa-chevron-right text-indigo-400"></i>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {isSearching && (
                                                <div className="absolute z-[9999] w-full mt-2 bg-white border-2 border-violet-300 rounded-xl shadow-2xl p-4 text-center">
                                                    <i className="fas fa-spinner fa-spin mr-2 text-primary"></i>
                                                    <span className="text-sm">Mencari narasumber...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Personal Info */}
                                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200 mb-6 shadow-sm">
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b-2 border-blue-300 pb-3 flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white">
                                                <i className="fas fa-user-circle text-sm"></i>
                                            </div>
                                            Informasi Pribadi
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="col-span-1 md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fas fa-user text-gray-400 mr-1"></i> Nama Lengkap <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.name}
                                                    onChange={e => setData('name', e.target.value)}
                                                    required
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all hover:shadow-md"
                                                    placeholder="Contoh: Dr. Budi Santoso, M.Kom"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fas fa-id-badge text-gray-400 mr-1"></i> Gelar / Jabatan
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.title}
                                                    onChange={e => setData('title', e.target.value)}
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all hover:shadow-md"
                                                    placeholder="Contoh: Kepala Dinas Pendidikan"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fas fa-building text-gray-400 mr-1"></i> Instansi
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.institution}
                                                    onChange={e => setData('institution', e.target.value)}
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all hover:shadow-md"
                                                    placeholder="Contoh: Dinas Pendidikan Kota Bandung"
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi / Biografi Singkat</label>
                                                <textarea
                                                    value={data.bio}
                                                    onChange={e => setData('bio', e.target.value)}
                                                    rows="3"
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all hover:shadow-md"
                                                    placeholder="Tuliskan deskripsi atau biografi singkat narasumber..."
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Media & Documents */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                            <i className="fas fa-file-upload text-blue-500"></i> Media & Dokumen
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Profile</label>
                                                <label className="mt-1 flex flex-col justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group cursor-pointer block w-full relative overflow-hidden min-h-[160px]">
                                                    {photoPreview ? (
                                                        <div className="absolute inset-0 z-0">
                                                            <img src={photoPreview} className="w-full h-full object-cover opacity-20" alt="Preview" />
                                                        </div>
                                                    ) : null}
                                                    <div className="space-y-1 text-center relative z-10">
                                                        <div className="w-12 h-12 mx-auto bg-secondary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform bg-white/80 shadow-sm">
                                                            <i className="fas fa-image text-blue-500 text-xl"></i>
                                                        </div>
                                                        <div className="flex text-sm text-gray-600 justify-center pt-2">
                                                            <span className="relative rounded-md font-bold text-secondary hover:text-blue-500">
                                                                {photoPreview ? 'Ganti Foto' : 'Upload Foto'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium">PNG, JPG up to 10MB</p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="sr-only"
                                                        onChange={e => {
                                                            const file = e.target.files[0];
                                                            setData('photo', file);
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => setPhotoPreview(reader.result);
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Upload CV (PDF)</label>
                                                <label className="mt-1 flex flex-col justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group cursor-pointer block w-full min-h-[160px]">
                                                    <div className="space-y-1 text-center">
                                                        <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                            <i className="fas fa-file-pdf text-red-500 text-xl"></i>
                                                        </div>
                                                        <div className="flex text-sm text-gray-600 justify-center pt-2">
                                                            <span className="relative rounded-md font-bold text-red-600 hover:text-red-500">
                                                                {cvName ? cvName : 'Upload PDF'}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 font-medium">PDF up to 5MB</p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="application/pdf"
                                                        className="sr-only"
                                                        onChange={e => {
                                                            const file = e.target.files[0];
                                                            setData('cv', file);
                                                            if (file) setCvName(file.name);
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact & Social Media */}
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200 mb-6 shadow-sm">
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b-2 border-amber-300 pb-3 flex items-center gap-2">
                                            <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white">
                                                <i className="fas fa-address-card text-sm"></i>
                                            </div>
                                            Kontak & Sosial Media
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fas fa-envelope text-gray-400 mr-1"></i> Email <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    value={data.email}
                                                    onChange={e => setData('email', e.target.value)}
                                                    required
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all hover:shadow-md"
                                                    placeholder="contoh@email.com"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fas fa-phone text-gray-400 mr-1"></i> No. HP/WA
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.phone}
                                                    onChange={e => setData('phone', e.target.value)}
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all hover:shadow-md"
                                                    placeholder="08123456789"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fab fa-linkedin text-blue-700 mr-1"></i> LinkedIn URL
                                                </label>
                                                <input
                                                    type="url"
                                                    value={data.linkedin}
                                                    onChange={e => setData('linkedin', e.target.value)}
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all hover:shadow-md"
                                                    placeholder="https://linkedin.com/in/username"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fab fa-instagram text-pink-600 mr-1"></i> Instagram URL
                                                </label>
                                                <input
                                                    type="url"
                                                    value={data.instagram}
                                                    onChange={e => setData('instagram', e.target.value)}
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 transition-all hover:shadow-md"
                                                    placeholder="https://instagram.com/username"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-6 border-t-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 -mx-6 -mb-6 px-6 py-5 rounded-b-2xl">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all transform hover:scale-105"
                                        >
                                            <i className="fas fa-times mr-2"></i> Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary via-pink-600 to-rose-600 text-white font-bold hover:from-purple-700 hover:via-pink-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 shadow-xl transition-all transform hover:scale-105 active:scale-95"
                                        >
                                            <i className="fas fa-save mr-2"></i> {processing ? 'Menyimpan...' : 'Simpan Narasumber'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editingSpeaker && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
                        <div className="inline-block w-full max-w-3xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl sm:align-middle">
                            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 px-6 py-5 flex items-center justify-between shadow-xl">
                                <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                        <i className="fas fa-user-edit text-xl"></i>
                                    </div>
                                    Edit Narasumber
                                </h3>
                                <button onClick={() => setShowEditModal(false)} className="text-white/80 hover:text-white focus:outline-none transition-colors p-2 hover:bg-white/20 rounded-lg">
                                    <i className="fas fa-times text-xl"></i>
                                </button>
                            </div>

                            <div className="p-6 max-h-[85vh] overflow-y-auto">
                                {Object.keys(errors).length > 0 && (
                                    <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
                                        <div className="flex items-start">
                                            <i className="fas fa-exclamation-circle text-red-500 text-xl mt-0.5 mr-3"></i>
                                            <div className="flex-1">
                                                <h3 className="text-sm font-bold text-red-800">Terdapat kesalahan:</h3>
                                                <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                                                    {Object.entries(errors).map(([key, msgs]) => (
                                                        Array.isArray(msgs) ? msgs.map((msg, i) => (
                                                            <li key={`${key}-${i}`}>{msg}</li>
                                                        )) : <li key={key}>{msgs}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <form onSubmit={handleEditSubmit} className="space-y-8">
                                    {/* Personal Info */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                            <i className="fas fa-user-circle text-yellow-500"></i> Informasi Pribadi
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="col-span-1 md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fas fa-user text-gray-400 mr-1"></i> Nama Lengkap <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.name}
                                                    onChange={e => setData('name', e.target.value)}
                                                    required
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 transition-all hover:shadow-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fas fa-id-badge text-gray-400 mr-1"></i> Gelar / Jabatan
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.title}
                                                    onChange={e => setData('title', e.target.value)}
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 transition-all hover:shadow-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fas fa-building text-gray-400 mr-1"></i> Instansi
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.institution}
                                                    onChange={e => setData('institution', e.target.value)}
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 transition-all hover:shadow-md"
                                                />
                                            </div>
                                            <div className="col-span-1 md:col-span-2">
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Deskripsi / Biografi Singkat</label>
                                                <textarea
                                                    value={data.bio}
                                                    onChange={e => setData('bio', e.target.value)}
                                                    rows="3"
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 transition-all hover:shadow-md"
                                                    placeholder="Tuliskan deskripsi atau biografi singkat narasumber..."
                                                ></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Media & Documents */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                            <i className="fas fa-file-upload text-yellow-500"></i> Media & Dokumen
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Foto Profile</label>
                                                <label className="mt-1 flex flex-col justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-yellow-500 hover:bg-yellow-50 transition-all group cursor-pointer block w-full relative overflow-hidden min-h-[160px]">
                                                    {photoPreview ? (
                                                        <div className="absolute inset-0 z-0">
                                                            <img src={photoPreview} className="w-full h-full object-cover opacity-20" alt="Preview" />
                                                        </div>
                                                    ) : null}
                                                    <div className="space-y-1 text-center relative z-10">
                                                        <div className="w-12 h-12 mx-auto bg-yellow-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform bg-white/80 shadow-sm">
                                                            <i className="fas fa-image text-yellow-500 text-xl"></i>
                                                        </div>
                                                        <div className="flex text-sm text-gray-600 justify-center pt-2">
                                                            <span className="font-bold text-yellow-600 tracking-tight">
                                                                {photoPreview ? 'Ganti Foto' : (editingSpeaker.photo ? 'Update Foto' : 'Upload Foto')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="sr-only"
                                                        onChange={e => {
                                                            const file = e.target.files[0];
                                                            setData('photo', file);
                                                            if (file) {
                                                                const reader = new FileReader();
                                                                reader.onloadend = () => setPhotoPreview(reader.result);
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Upload CV (PDF)</label>
                                                <label className="mt-1 flex flex-col justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl hover:border-red-500 hover:bg-red-50 transition-all group cursor-pointer block w-full min-h-[160px]">
                                                    <div className="space-y-1 text-center">
                                                        <div className="w-12 h-12 mx-auto bg-red-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                                                            <i className="fas fa-file-pdf text-red-500 text-xl"></i>
                                                        </div>
                                                        <div className="flex text-sm text-gray-600 justify-center pt-2">
                                                            <span className="font-bold text-red-600 tracking-tight">
                                                                {cvName ? cvName : (editingSpeaker.cv ? 'Update CV' : 'Upload CV')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="application/pdf"
                                                        className="sr-only"
                                                        onChange={e => {
                                                            const file = e.target.files[0];
                                                            setData('cv', file);
                                                            if (file) setCvName(file.name);
                                                        }}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact & Social Media */}
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                                            <i className="fas fa-address-card text-yellow-500"></i> Kontak & Sosial Media
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fas fa-envelope text-gray-400 mr-1"></i> Email <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    value={data.email}
                                                    onChange={e => setData('email', e.target.value)}
                                                    required
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 transition-all hover:shadow-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fas fa-phone text-gray-400 mr-1"></i> No. HP/WA
                                                </label>
                                                <input
                                                    type="text"
                                                    value={data.phone}
                                                    onChange={e => setData('phone', e.target.value)}
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 transition-all hover:shadow-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fab fa-linkedin text-blue-700 mr-1"></i> LinkedIn URL
                                                </label>
                                                <input
                                                    type="url"
                                                    value={data.linkedin}
                                                    onChange={e => setData('linkedin', e.target.value)}
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 transition-all hover:shadow-md"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                    <i className="fab fa-instagram text-pink-600 mr-1"></i> Instagram URL
                                                </label>
                                                <input
                                                    type="url"
                                                    value={data.instagram}
                                                    onChange={e => setData('instagram', e.target.value)}
                                                    className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:ring-yellow-500 focus:border-yellow-500 transition-all hover:shadow-md"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-3 pt-6 border-t-2 border-orange-200 bg-gradient-to-r from-amber-50 to-orange-50 -mx-6 -mb-6 px-6 py-5 rounded-b-2xl">
                                        <button
                                            type="button"
                                            onClick={() => setShowEditModal(false)}
                                            className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all transform hover:scale-105"
                                        >
                                            <i className="fas fa-times mr-2"></i> Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white font-bold hover:from-amber-700 hover:via-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 shadow-xl transition-all transform hover:scale-105 active:scale-95"
                                        >
                                            <i className="fas fa-save mr-2"></i> {processing ? 'Menyimpan...' : 'Simpan Perubahan'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AcaraLayout>
    );
}

