import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';
import debounce from 'lodash/debounce';

export default function CommitteeSection({ activity, committeeStructure, refPositions, divisions, participants = [], vouchers = [], provinces = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState(null);
    const [data, setData] = useState({
        position: '',
        user_id: '',
        daerah_layanan: ''
    });
    const [processing, setProcessing] = useState(false);
    const [selectedProvinces, setSelectedProvinces] = useState([]);
    const [provinceQuery, setProvinceQuery] = useState('');
    const [showRegionPicker, setShowRegionPicker] = useState(false);
    const [isAddParticipantsModalOpen, setIsAddParticipantsModalOpen] = useState(false);
    const [userLookupQuery, setUserLookupQuery] = useState('');
    const [userLookupLoading, setUserLookupLoading] = useState(false);
    const [userLookupResults, setUserLookupResults] = useState([]);
    const [selectedUserIdsToAdd, setSelectedUserIdsToAdd] = useState([]);
    const [participationTypeToAdd, setParticipationTypeToAdd] = useState('peserta');
    const [addUsersProcessing, setAddUsersProcessing] = useState(false);
    const [participantDropdownOpen, setParticipantDropdownOpen] = useState(false);
    const [participantQuery, setParticipantQuery] = useState('');
    const participantDropdownRef = useRef(null);

    const activityUid = activity?.uid || activity?.id;

    const committeeUserIdSet = React.useMemo(() => {
        const ids = (committeeStructure || [])
            .map((m) => (m?.user_id ? String(m.user_id) : null))
            .filter(Boolean);
        return new Set(ids);
    }, [committeeStructure]);

    const participantsUnique = React.useMemo(() => {
        const seen = new Set();
        return (participants || []).filter((p) => {
            const key = p?.user_id ? String(p.user_id) : null;
            if (!key) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [participants]);

    const availableParticipants = React.useMemo(() => {
        if (editingMember) return participantsUnique;
        return participantsUnique.filter((p) => !committeeUserIdSet.has(String(p.user_id)));
    }, [participantsUnique, committeeUserIdSet, editingMember]);

    const getParticipantLabel = (p) => {
        const name = p?.user?.name || p?.name || '';
        const email = p?.user?.email || p?.email || '';
        return email ? `${name} (${email})` : name;
    };

    const selectedParticipant = participantsUnique.find((p) => String(p.user_id) === String(data.user_id));

    const searchUsersToAdd = React.useMemo(() => debounce(async (q, actId) => {
        const trimmed = String(q || '').trim();
        if (!actId || trimmed.length < 2) {
            setUserLookupResults([]);
            return;
        }
        setUserLookupLoading(true);
        try {
            const res = await axios.get(route('activity.participants.users.search', { activityId: actId }), {
                params: { q: trimmed, limit: 20 }
            });
            const list = res?.data?.data;
            setUserLookupResults(Array.isArray(list) ? list : []);
        } catch (e) {
            setUserLookupResults([]);
        } finally {
            setUserLookupLoading(false);
        }
    }, 300), []);

    useEffect(() => {
        return () => {
            searchUsersToAdd.cancel();
        };
    }, [searchUsersToAdd]);

    useEffect(() => {
        if (!participantDropdownOpen) return;
        const onMouseDown = (e) => {
            if (!participantDropdownRef.current) return;
            if (!participantDropdownRef.current.contains(e.target)) {
                setParticipantDropdownOpen(false);
                setParticipantQuery('');
            }
        };
        document.addEventListener('mousedown', onMouseDown);
        return () => document.removeEventListener('mousedown', onMouseDown);
    }, [participantDropdownOpen]);

    const normalizedProvinceQuery = (provinceQuery || '').trim().toLowerCase();
    const provincesSorted = Array.isArray(provinces)
        ? [...provinces].sort((a, b) => (a?.name || '').localeCompare(b?.name || '', 'id-ID'))
        : [];
    const provincesFiltered = normalizedProvinceQuery
        ? provincesSorted.filter((p) => (p?.name || '').toLowerCase().includes(normalizedProvinceQuery))
        : provincesSorted;

    useEffect(() => {
        if (!isPicPosition(data.position)) return;
        if (selectedProvinces.length > 0) return;
        if (!data.user_id) return;
        const p = participants.find((x) => String(x.user_id) === String(data.user_id));
        const provName = p?.user?.profile?.province?.name;
        if (provName) {
            setSelectedProvinces([provName]);
        }
    }, [data.position, data.user_id]);

    // Voucher State
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [voucherForm, setVoucherForm] = useState({
        code: '',
        usage_limit: '',
        valid_until: '',
        description: '',
        is_active: true
    });
    const [voucherProcessing, setVoucherProcessing] = useState(false);

    const openVoucherModal = (voucher = null) => {
        setEditingVoucher(voucher);
        if (voucher) {
            setVoucherForm({
                code: voucher.code,
                usage_limit: voucher.usage_limit || '',
                valid_until: voucher.valid_until ? voucher.valid_until.substring(0, 10) : '',
                description: voucher.description || '',
                is_active: Boolean(voucher.is_active)
            });
        } else {
            setVoucherForm({ code: '', usage_limit: '', valid_until: '', description: '', is_active: true });
        }
        setIsVoucherModalOpen(true);
    };

    const handleSaveVoucher = (e) => {
        e.preventDefault();
        setVoucherProcessing(true);
        const activityId = activity.uid || activity.id;

        const opts = {
            onSuccess: () => {
                setVoucherProcessing(false);
                setIsVoucherModalOpen(false);
                Swal.fire({
                    title: 'Berhasil',
                    text: editingVoucher ? 'Voucher diperbarui' : 'Voucher ditambahkan',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            },
            onError: (err) => {
                setVoucherProcessing(false);
                Swal.fire('Error', 'Gagal menyimpan voucher.', 'error');
            }
        };

        if (editingVoucher) {
            router.put(route('activity.preparation.vouchers.update', { activityId, voucherId: editingVoucher.id }), voucherForm, opts);
        } else {
            router.post(route('activity.preparation.vouchers.store', activityId), voucherForm, opts);
        }
    };

    const handleDeleteVoucher = (voucher) => {
        Swal.fire({
            title: 'Hapus Voucher?',
            text: `Kode "${voucher.code}" akan dihapus.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus'
        }).then((result) => {
            if (result.isConfirmed) {
                const activityId = activity.uid || activity.id;
                router.delete(route('activity.preparation.vouchers.destroy', { activityId, voucherId: voucher.id }), {
                    onSuccess: () => Swal.fire('Terhapus!', 'Voucher berhasil dihapus.', 'success')
                });
            }
        });
    };

    const isPicPosition = (position) => (position || '').toString().toLowerCase().includes('pic');

    const openModal = (member = null) => {
        if (member) {
            setEditingMember(member);
            setData({
                position: member.position,
                user_id: member.user_id,
                daerah_layanan: member.daerah_layanan || ''
            });
            const existing = (member.daerah_layanan || '')
                .split(',')
                .map(s => s.trim())
                .filter(Boolean);
            setSelectedProvinces(existing);
            setProvinceQuery('');
        } else {
            setEditingMember(null);
            setData({
                position: '',
                user_id: '',
                daerah_layanan: ''
            });
            setSelectedProvinces([]);
            setProvinceQuery('');
        }
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!data.position || !data.user_id) return;
        if (isPicPosition(data.position) && selectedProvinces.length === 0) return;

        setProcessing(true);
        const payload = {
            ...data,
            daerah_layanan: isPicPosition(data.position)
                ? (selectedProvinces.join(', ') || '')
                : ''
        };

        if (editingMember) {
            router.put(route('activity.preparation.update-committee', {
                activityId: activity.uid || activity.id,
                committeeId: editingMember.id
            }), payload, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    setEditingMember(null);
                    setData({ position: '', user_id: '', daerah_layanan: '' });
                    setProcessing(false);
                    setSelectedProvinces([]);
                    setProvinceQuery('');
                    Swal.fire({
                        title: 'Berhasil',
                        text: 'Data panitia berhasil diperbarui.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                },
                onError: (errors) => {
                    setProcessing(false);
                    const errorMessage = errors.user_id || errors.position || 'Gagal memperbarui panitia. Silakan periksa kembali data Anda.';
                    Swal.fire('Error', errorMessage, 'error');
                }
            });
        } else {
            router.post(route('activity.preparation.store-committee', activity.uid || activity.id), payload, {
                onSuccess: () => {
                    setIsModalOpen(false);
                    setData({ position: '', user_id: '', daerah_layanan: '' });
                    setProcessing(false);
                    setSelectedProvinces([]);
                    setProvinceQuery('');
                    Swal.fire({
                        title: 'Berhasil',
                        text: 'Panitia berhasil ditambahkan.',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                },
                onError: (errors) => {
                    setProcessing(false);
                    const errorMessage = errors.user_id || errors.position || 'Gagal menambahkan panitia. Silakan periksa kembali data Anda.';
                    Swal.fire('Error', errorMessage, 'error');
                }
            });
        }
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'Apakah Anda yakin?',
            text: "Panitia akan dihapus dari susunan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, hapus!',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('activity.preparation.destroy-committee', { activityId: activity.uid || activity.id, committeeId: id }), {
                    onSuccess: () => {
                        Swal.fire('Terhapus!', 'Panitia berhasil dihapus.', 'success');
                    }
                });
            }
        });
    };

    const openAddParticipantsModal = () => {
        setIsAddParticipantsModalOpen(true);
        setUserLookupQuery('');
        setUserLookupResults([]);
        setSelectedUserIdsToAdd([]);
        setParticipationTypeToAdd('peserta');
        setUserLookupLoading(false);
        setAddUsersProcessing(false);
    };

    const closeAddParticipantsModal = () => {
        setIsAddParticipantsModalOpen(false);
        setUserLookupQuery('');
        setUserLookupResults([]);
        setSelectedUserIdsToAdd([]);
        setParticipationTypeToAdd('peserta');
        setUserLookupLoading(false);
        setAddUsersProcessing(false);
    };

    const toggleUserToAdd = (userId) => {
        const id = String(userId || '');
        if (!id) return;
        setSelectedUserIdsToAdd(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    };

    const addSelectedUsersAsParticipants = async () => {
        if (!activityUid || selectedUserIdsToAdd.length === 0) return;
        setAddUsersProcessing(true);
        try {
            const payload = { user_ids: selectedUserIdsToAdd, participation_type: participationTypeToAdd, force_active: true };
            const res = await axios.post(route('activity.participants.users.add', { activityId: activityUid }), payload);
            const meta = res?.data?.meta || {};
            Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: `Ditambahkan: ${meta.added ?? 0}, dilewati (sudah terdaftar): ${meta.skipped_existing ?? 0}`,
                timer: 1800,
                showConfirmButton: false
            });
            closeAddParticipantsModal();
            router.reload({ only: ['participants'], preserveScroll: true });
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Gagal', text: e?.response?.data?.message || e?.message || 'Gagal menambahkan peserta.' });
        } finally {
            setAddUsersProcessing(false);
        }
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-4 sm:mb-6 transition-all hover:shadow-md duration-300">
            <div className="p-3 sm:p-6 font-primary">
                {/* Voucher Code Section */}
                <div className="mb-3 sm:mb-6 p-3 sm:p-5 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <i className="fas fa-ticket-alt text-blue-500"></i>
                                Kode Voucher Panitia
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                                Kelola kode voucher untuk pendaftaran panitia gratis.
                            </p>
                        </div>
                        <button
                            onClick={() => openVoucherModal()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 active:scale-95"
                        >
                            <i className="fas fa-plus mr-2"></i> Buat Voucher
                        </button>
                    </div>

                    <div className="space-y-3">
                        {vouchers && vouchers.length > 0 ? (
                            vouchers.map((voucher) => (
                                <div key={voucher.id} className="bg-white p-4 rounded-xl border border-blue-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:shadow-md transition-all">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-blue-600 text-lg tracking-wider">
                                                {voucher.code}
                                            </span>
                                            {!voucher.is_active && (
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">Non-Aktif</span>
                                            )}
                                        </div>
                                        {voucher.description && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-1">{voucher.description}</p>
                                        )}
                                        <div className="flex flex-wrap gap-3 mt-2">
                                            <div className="text-xs font-bold text-gray-500 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                                <i className="fas fa-users text-gray-400"></i>
                                                {voucher.usage_limit ? `${voucher.usage_count} / ${voucher.usage_limit}` : `${voucher.usage_count} (Unlimited)`}
                                            </div>
                                            {voucher.valid_until && (
                                                <div className="text-xs font-bold text-gray-500 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                                                    <i className="fas fa-calendar-alt text-gray-400"></i>
                                                    Exp: {new Date(voucher.valid_until).toLocaleDateString('id-ID')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 self-end sm:self-center">
                                        <button
                                            onClick={() => openVoucherModal(voucher)}
                                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 transition-colors"
                                            title="Edit"
                                        >
                                            <i className="fas fa-pencil-alt text-xs"></i>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteVoucher(voucher)}
                                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 transition-colors"
                                            title="Hapus"
                                        >
                                            <i className="fas fa-trash-alt text-xs"></i>
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-2 sm:py-8 bg-white/60 rounded-xl border border-dashed border-gray-300">
                                <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                                    <i className="fas fa-ticket-alt text-xl"></i>
                                </div>
                                <p className="text-sm text-gray-500 font-bold">Belum ada voucher</p>
                                <p className="text-xs text-gray-400 mt-1">Buat kode voucher untuk panitia Anda</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-3 sm:mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Susunan Panitia</h3>
                        <p className="text-sm text-gray-500 font-medium italic mt-1">Struktur organisasi dan penanggung jawab kegiatan</p>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => openModal()}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
                        >
                            <i className="fas fa-plus mr-2"></i>
                            Tambah Panitia
                        </button>
                        <button
                            type="button"
                            onClick={openAddParticipantsModal}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all active:scale-95"
                            title="Tambah peserta dari data user aplikasi"
                        >
                            <i className="fas fa-user-plus mr-2 text-primary"></i>
                            Tambah Peserta
                        </button>
                        <a
                            href={route('activity.print-cards', { id: activity.uid || activity.id, type: 'committee' })}
                            target="_blank"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50 transition-all active:scale-95"
                        >
                            <i className="fas fa-id-card mr-2 text-primary"></i>
                            Cetak ID Card
                        </a>
                    </div>
                </div>

                {(() => {
                    const picMembers = (committeeStructure || []).filter((m) => isPicPosition(m.position));
                    const otherMembers = (committeeStructure || []).filter((m) => !isPicPosition(m.position));
                    const renderMemberCard = (member) => (
                        <div key={member.id} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow transition-all group relative overflow-hidden">
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <button
                                    onClick={() => openModal(member)}
                                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/90 text-gray-400 hover:text-blue-500 hover:bg-blue-50 shadow-sm border border-gray-100 transition-all"
                                    title="Edit"
                                >
                                    <i className="fas fa-edit text-[10px]"></i>
                                </button>
                                <button
                                    onClick={() => handleDelete(member.id)}
                                    className="h-7 w-7 inline-flex items-center justify-center rounded-lg bg-white/90 text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm border border-gray-100 transition-all"
                                    title="Hapus"
                                >
                                    <i className="fas fa-trash-alt text-[10px]"></i>
                                </button>
                            </div>

                            <div className="flex items-center gap-3 mb-3">
                                <div className="relative shrink-0">
                                    <img
                                        className="h-12 w-12 rounded-xl object-cover ring-2 ring-gray-50 shadow-sm"
                                        src={member.user?.profile_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`}
                                        alt={member.name}
                                        onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-900 truncate">{member.name}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-secondary/10 text-secondary border border-secondary/20 truncate max-w-[120px]">
                                            {member.position}
                                        </span>
                                    </div>
                                    {isPicPosition(member.position) && member.daerah_layanan && (
                                        <p className="text-xs text-gray-500 mt-1 truncate" title={member.daerah_layanan}>
                                            <i className="fas fa-map-marker-alt text-primary/70 mr-1"></i>
                                            {member.daerah_layanan}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="pt-3 mt-1 border-t border-gray-50 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    {divisions.find(d => d.id === member.activity_division_id)?.name || '-'}
                                </span>
                                <a href={`https://wa.me/${member.phone}`} target="_blank" className="text-xs font-medium text-gray-500 hover:text-green-500 transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-green-50">
                                    <i className="fab fa-whatsapp text-sm"></i>
                                    <span>{member.phone || '-'}</span>
                                </a>
                            </div>
                        </div>
                    );
                    return (
                        <>
                            {picMembers.length > 0 && (
                                <div className="mb-6">
                                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <i className="fas fa-user-check text-primary"></i>
                                        PIC &amp; Daerah Layanan
                                    </h4>
                                    <p className="text-xs text-gray-500 mb-3">Person in charge beserta daerah tugas/layanan.</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                        {picMembers.map(renderMemberCard)}
                                    </div>
                                </div>
                            )}

                            <div className={picMembers.length > 0 ? '' : ''}>
                                {picMembers.length > 0 && (
                                    <h4 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <i className="fas fa-users text-gray-500"></i>
                                        Panitia Lainnya
                                    </h4>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {otherMembers.map(renderMemberCard)}
                                </div>
                            </div>

                            {committeeStructure.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-2 sm:py-6 bg-gray-50 rounded-xl border border-gray-300 border-dashed">
                                    <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 text-gray-200 shadow-sm">
                                        <i className="fas fa-users text-3xl"></i>
                                    </div>
                                    <p className="text-sm text-gray-400 font-bold">Belum ada susunan panitia</p>
                                    <p className="text-xs text-gray-400 mt-1">Klik tombol di atas untuk mulai menyusun kepanitiaan Anda</p>
                                </div>
                            )}
                        </>
                    );
                })()}
            </div>

            {/* Modal Tambah Panitia - Professional Rewrite */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsModalOpen(false)}
                    ></div>

                    <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <form onSubmit={handleSubmit}>
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-2xl font-bold text-gray-900">{editingMember ? 'Edit Panitia' : 'Tambah Panitia'}</h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="relative group">
                                        <label htmlFor="position" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Jabatan / Posisi</label>
                                        <div className="relative">
                                            <i className="fas fa-id-card absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-primary transition-colors"></i>
                                            <select
                                                id="position"
                                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary shadow-inner font-medium appearance-none"
                                                value={data.position}
                                                onChange={(e) => setData({ ...data, position: e.target.value })}
                                                required
                                            >
                                                <option value="">-- Pilih Jabatan --</option>
                                                {refPositions && refPositions.map((pos, idx) => (
                                                    <option key={idx} value={pos.name || pos}>
                                                        {pos.name || pos}
                                                    </option>
                                                ))}
                                            </select>
                                            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"></i>
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <label htmlFor="user_id" className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Pilih Personel (Peserta Terdaftar)</label>
                                        {editingMember ? (
                                            <div className="relative">
                                                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                                                <input
                                                    id="user_id"
                                                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl shadow-inner font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                                                    value={selectedParticipant ? getParticipantLabel(selectedParticipant) : (editingMember?.name || '')}
                                                    disabled
                                                />
                                            </div>
                                        ) : (
                                            <div ref={participantDropdownRef} className="relative">
                                                <i className="fas fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                                                <button
                                                    type="button"
                                                    onClick={() => setParticipantDropdownOpen((v) => !v)}
                                                    className="w-full text-left pl-12 pr-12 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-primary shadow-inner font-medium"
                                                >
                                                    {selectedParticipant ? getParticipantLabel(selectedParticipant) : '-- Pilih Peserta --'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setParticipantDropdownOpen((v) => !v)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-xl bg-white text-gray-400 hover:text-gray-800 border border-gray-200"
                                                >
                                                    <i className="fas fa-chevron-down text-xs"></i>
                                                </button>
                                                {participantDropdownOpen && (
                                                    <div className="absolute z-[120] mt-2 w-full bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden">
                                                        <div className="p-3 border-b border-gray-200">
                                                            <div className="relative">
                                                                <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                                                                <input
                                                                    type="text"
                                                                    className="w-full pl-12 pr-3 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary focus:border-primary text-sm font-medium"
                                                                    placeholder="Ketik nama / email..."
                                                                    value={participantQuery}
                                                                    onChange={(e) => setParticipantQuery(e.target.value)}
                                                                    autoFocus
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-64 overflow-y-auto">
                                                            {(() => {
                                                                const q = (participantQuery || '').trim().toLowerCase();
                                                                const list = q
                                                                    ? availableParticipants.filter((p) => {
                                                                        const name = (p?.user?.name || p?.name || '').toString().toLowerCase();
                                                                        const email = (p?.user?.email || p?.email || '').toString().toLowerCase();
                                                                        return name.includes(q) || email.includes(q);
                                                                    })
                                                                    : availableParticipants;
                                                                const sliced = list.slice(0, 80);
                                                                if (sliced.length === 0) {
                                                                    return (
                                                                        <div className="px-4 py-3 text-xs text-gray-400">
                                                                            Tidak ada hasil
                                                                        </div>
                                                                    );
                                                                }
                                                                return sliced.map((p) => (
                                                                    <button
                                                                        key={p.user_id}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setData({ ...data, user_id: p.user_id });
                                                                            setParticipantDropdownOpen(false);
                                                                            setParticipantQuery('');
                                                                        }}
                                                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        <div className="text-sm font-bold text-gray-800">{p.user?.name || p.name}</div>
                                                                        <div className="text-xs text-gray-500">{p.user?.email || ''}</div>
                                                                    </button>
                                                                ));
                                                            })()}
                                                        </div>
                                                        <div className="px-4 py-2 text-[11px] text-gray-500 border-t border-gray-200 bg-white">
                                                            Menampilkan peserta aktif yang belum menjadi panitia.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {isPicPosition(data.position) && (
                                        <div className="relative">
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Daerah Tugas / Layanan</label>
                                            <div className="flex flex-wrap gap-2 mb-3">
                                                {selectedProvinces.length > 0 ? (
                                                    selectedProvinces.map((name) => (
                                                        <span key={name} className="inline-flex items-center gap-2 px-3 py-1 rounded-2xl bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                                                            <span>{name}</span>
                                                            <button
                                                                type="button"
                                                                className="h-5 w-5 flex items-center justify-center rounded-full bg-primary text-white"
                                                                onClick={() => setSelectedProvinces(selectedProvinces.filter((n) => n !== name))}
                                                            >
                                                                <i className="fas fa-times text-[10px]"></i>
                                                            </button>
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-500">Belum ada provinsi dipilih</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRegionPicker(!showRegionPicker)}
                                                    className="px-4 py-2 rounded-xl bg-primary text-white hover:bg-primary/90 text-xs font-bold"
                                                >
                                                    {showRegionPicker ? 'Tutup pilihan daerah' : 'Tambah daerah tugas'}
                                                </button>
                                                <button
                                                    type="button"
                                                    className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold"
                                                    onClick={() => setSelectedProvinces([])}
                                                >
                                                    Hapus semua
                                                </button>
                                            </div>
                                            {showRegionPicker && (
                                                <div className="rounded-2xl bg-gray-50 border border-gray-200 overflow-hidden">
                                                    <div className="p-3 border-b border-gray-200">
                                                        <div className="relative">
                                                            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                                                            <input
                                                                type="text"
                                                                className="w-full pl-12 pr-20 py-3 bg-transparent border-none focus:ring-0 font-medium"
                                                                placeholder="Cari provinsi..."
                                                                value={provinceQuery}
                                                                onChange={(e) => setProvinceQuery(e.target.value)}
                                                            />
                                                            {provinceQuery && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setProvinceQuery('')}
                                                                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors font-bold text-xs border border-gray-200"
                                                                >
                                                                    Reset
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="max-h-64 overflow-y-auto">
                                                        {provincesFiltered.map((prov) => {
                                                            const alreadySelected = selectedProvinces.includes(prov.name);
                                                            return (
                                                                <button
                                                                    key={prov.id}
                                                                    type="button"
                                                                    disabled={alreadySelected}
                                                                    onClick={() => {
                                                                        setSelectedProvinces((prev) => (prev.includes(prov.name) ? prev : [...prev, prov.name]));
                                                                        setProvinceQuery('');
                                                                    }}
                                                                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors ${alreadySelected ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                                                                >
                                                                    <span className="font-medium">{prov.name}</span>
                                                                    {alreadySelected && <i className="fas fa-check text-gray-300"></i>}
                                                                </button>
                                                            );
                                                        })}
                                                        {normalizedProvinceQuery && provincesFiltered.length === 0 && (
                                                            <div className="px-4 py-3 text-xs text-gray-400">
                                                                Tidak ada hasil untuk "{provinceQuery}"
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="px-4 py-3 text-[11px] font-semibold text-amber-600 border-t border-gray-200">
                                                        Wajib pilih minimal 1 provinsi untuk posisi PIC.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100 flex gap-3">
                                        <i className="fas fa-info-circle text-yellow-500 mt-1"></i>
                                        <p className="text-xs text-yellow-700 font-medium">Hanya peserta yang sudah terdaftar yang dapat dipilih menjadi panitia. Jika personel belum ada di daftar, silakan tambahkan sebagai peserta terlebih dahulu.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-gray-50 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-white active:scale-95 transition-all shadow-sm"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={processing || !data.position || !data.user_id || (isPicPosition(data.position) && selectedProvinces.length === 0)}
                                    className="flex-[2] py-4 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
                                >
                                    {processing ? (
                                        <span className="flex items-center justify-center">
                                            <i className="fas fa-circle-notch fa-spin mr-2"></i> Procesing...
                                        </span>
                                    ) : (
                                        editingMember ? 'Simpan Perubahan' : 'Simpan Panitia'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Voucher Modal */}
            {isVoucherModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsVoucherModalOpen(false)}
                    ></div>

                    <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <form onSubmit={handleSaveVoucher}>
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-900">{editingVoucher ? 'Edit Voucher' : 'Tambah Voucher'}</h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsVoucherModalOpen(false)}
                                        className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
                                    >
                                        <i className="fas fa-times"></i>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Kode Voucher</label>
                                        <input
                                            type="text"
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold tracking-wider placeholder-gray-400"
                                            placeholder="Contoh: PANITIA2025"
                                            value={voucherForm.code}
                                            onChange={(e) => setVoucherForm({ ...voucherForm, code: e.target.value.toUpperCase() })}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Kuota (Opsional)</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-medium placeholder-gray-400"
                                                placeholder="Tanpa Batas"
                                                min="0"
                                                value={voucherForm.usage_limit}
                                                onChange={(e) => setVoucherForm({ ...voucherForm, usage_limit: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Berlaku Sampai</label>
                                            <input
                                                type="date"
                                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-medium text-gray-600"
                                                value={voucherForm.valid_until}
                                                onChange={(e) => setVoucherForm({ ...voucherForm, valid_until: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Deskripsi (Opsional)</label>
                                        <textarea
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-medium placeholder-gray-400"
                                            placeholder="Catatan internal..."
                                            rows="2"
                                            value={voucherForm.description}
                                            onChange={(e) => setVoucherForm({ ...voucherForm, description: e.target.value })}
                                        />
                                    </div>

                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="voucher_active"
                                            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                            checked={voucherForm.is_active}
                                            onChange={(e) => setVoucherForm({ ...voucherForm, is_active: e.target.checked })}
                                        />
                                        <label htmlFor="voucher_active" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                            Status Aktif
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-50 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsVoucherModalOpen(false)}
                                    className="flex-1 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={voucherProcessing || !voucherForm.code}
                                    className="flex-[2] py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
                                >
                                    {voucherProcessing ? (
                                        <span className="flex items-center justify-center">
                                            <i className="fas fa-circle-notch fa-spin mr-2"></i> Processing...
                                        </span>
                                    ) : (
                                        editingVoucher ? 'Simpan Perubahan' : 'Buat Voucher'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAddParticipantsModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity"
                        onClick={closeAddParticipantsModal}
                    ></div>

                    <div className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
                        <div className="p-6 sm:p-8">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">Tambah Peserta dari User</h3>
                                <button
                                    type="button"
                                    onClick={closeAddParticipantsModal}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
                                >
                                    <i className="fas fa-times"></i>
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">Role</label>
                                        <select
                                            value={participationTypeToAdd}
                                            onChange={(e) => setParticipationTypeToAdd(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/30 font-medium text-gray-700"
                                        >
                                            <option value="peserta">Peserta</option>
                                            <option value="panitia">Panitia</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="relative">
                                    <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-300"></i>
                                    <input
                                        type="text"
                                        value={userLookupQuery}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setUserLookupQuery(v);
                                            searchUsersToAdd(v, activityUid);
                                        }}
                                        placeholder="Cari nama atau email (min 2 karakter)..."
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary/30 font-medium placeholder-gray-400"
                                    />
                                </div>

                                <div className="border border-gray-200 rounded-2xl overflow-hidden">
                                    <div className="max-h-80 overflow-y-auto bg-white">
                                        {userLookupLoading && (
                                            <div className="p-4 text-sm text-gray-500">Mencari...</div>
                                        )}
                                        {!userLookupLoading && userLookupResults.length === 0 && (
                                            <div className="p-4 text-sm text-gray-500">Tidak ada hasil.</div>
                                        )}
                                        {!userLookupLoading && userLookupResults.map((u, idx) => (
                                            <label
                                                key={u.id}
                                                className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 ${idx === 0 ? '' : 'border-t border-gray-100'}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUserIdsToAdd.includes(String(u.id))}
                                                    onChange={() => toggleUserToAdd(u.id)}
                                                    className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary border-gray-300"
                                                />
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-gray-900 truncate">{u.name || '-'}</div>
                                                    <div className="text-xs text-gray-500 truncate">{u.email || '-'}</div>
                                                    {u?.profile?.instansi && (
                                                        <div className="text-xs text-gray-500 truncate">{u.profile.instansi}</div>
                                                    )}
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="text-sm text-gray-600">
                                Terpilih: <span className="font-bold text-gray-900">{selectedUserIdsToAdd.length}</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeAddParticipantsModal}
                                    className="flex-1 sm:flex-none px-5 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all"
                                >
                                    Batal
                                </button>
                                <button
                                    type="button"
                                    disabled={addUsersProcessing || selectedUserIdsToAdd.length === 0}
                                    onClick={addSelectedUsersAsParticipants}
                                    className="flex-1 sm:flex-none px-5 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
                                >
                                    {addUsersProcessing ? (
                                        <span className="flex items-center justify-center">
                                            <i className="fas fa-circle-notch fa-spin mr-2"></i> Processing...
                                        </span>
                                    ) : (
                                        'Tambah Peserta'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
