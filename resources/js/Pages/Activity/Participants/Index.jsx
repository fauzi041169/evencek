import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Transition } from '@headlessui/react';
import axios from 'axios';
import MainLayout from '@/Layouts/MainLayout';
import AcaraLayout from '@/Layouts/AcaraLayout';
import {
    Search, Filter, Download, Trash2, CheckCircle, UserPlus,
    MoreHorizontal, ChevronDown, ChevronUp, X, FileSpreadsheet,
    Users, MapPin, Building, UserCog
} from 'lucide-react';
import debounce from 'lodash/debounce';
import kebabCase from 'lodash/kebabCase';
import BulkImportModal from '@/Components/Activity/BulkImportModal';
import BulkPaymentModal from '@/Components/Activity/BulkPaymentModal';
import ParticipantEditModal from './Modals/ParticipantEditModal';

import GroupAssignModal from './Modals/GroupAssignModal';
import GroupsManageModal from './Modals/GroupsManageModal';
import RoomsModal from './Modals/RoomsModal';
import PaymentValidationModal from './Modals/PaymentValidationModal';
import ColumnFilter from './ColumnFilter';
import RoomSelect from './RoomSelect';
import Swal from 'sweetalert2';

// Helper for key normalization
const normalizeCustomKey = (raw) => {
    let key = String(raw).replace(/^\d+\./, '').trim();
    key = key.replace(/\{[^}]*\}/, '').trim();

    if (key !== '' && key.endsWith('*')) {
        key = key.substring(0, key.length - 1).trim();
    }
    if (key !== '' && key.includes('|')) {
        key = key.split('|')[0].trim();
    }

    let lower = key.toLowerCase();
    if (lower.startsWith('user:')) {
        key = key.substring(5).trim();
        lower = key.toLowerCase();
    }
    if (lower.startsWith('profile:')) {
        key = key.substring(8).trim();
    }

    return key.trim();
};

const columnLabels = {
    'col-index': 'No',
    'col-name': 'Nama Lengkap',
    'col-email': 'Email',
    'col-hp': 'No. HP',
    'col-nik': 'NIK',
    'col-instansi': 'Instansi',
    'col-pekerjaan': 'Pekerjaan',
    'col-jabatan': 'Jabatan',
    'col-prov': 'Provinsi',
    'col-regency': 'Kabupaten/Kota',
    'col-district': 'Kecamatan',
    'col-alamat': 'Alamat',
    'col-gender': 'Jenis Kelamin',
    'col-birthplace': 'Tempat Lahir',
    'col-birthdate': 'Tanggal Lahir',
    'col-status': 'Status',
    'col-payment-method': 'Metode Pembayaran',
    'col-registration-method': 'Metode Daftar',
    'col-action': 'Aksi',
    'col-room': 'Kamar',
    'col-group': 'Kelompok',
    'col-created-at': 'Tanggal Daftar',
    'col-updated-at': 'Terakhir Update',
    'col-batch': 'Batch',
    'col-card-status': 'Status Kartu',
    'col-certificate-id': 'ID Sertifikat',
    'col-print-count': 'Jml Cetak',
    'col-created-by': 'Dibuat Oleh',
    'col-updated-by': 'Diupdate Oleh'
};

export default function Index({
    activity,
    participants = { data: [], links: [], total: 0, from: 0, to: 0, per_page: 15 },
    filters = {},
    batches,
    provinces = [],
    regencies = [],
    districts = [],
    instansiOptions,
    pekerjaanOptions,
    jabatanOptions,
    genderOptions,
    birthPlaceOptions,
    birthYearOptions,
    nameOptions,
    emailOptions,
    provinceOptions,
    regencyNameOptions,
    districtNameOptions,
    statusOptions,
    paymentMethodOptions,
    registrationMethodOptions,
    hpOptions,
    nikOptions,
    addressOptions,
    roomOptions,
    participantGroups,
    columnSettings = {},
    customKeys = [],
    rooms = [],
    hotels = [],
    unassignedParticipants = [],
    roomOccupants = [],
    totalProvinces = 0,
    totalRegencies = 0,
    totalDistricts = 0,
    unverifiedEmailCount = 0,
    participationTypes = []
}) {
    const { auth } = usePage().props;
    const currentUser = auth?.user;
    const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'superadmin';

    // Ensure props are safe to use (handle null explicity)
    const safeParticipants = participants || { data: [], links: [], total: 0, from: 0, to: 0, per_page: 15 };
    const safeProvinces = provinces || [];
    const safeRegencies = regencies || [];
    const safeDistricts = districts || [];

    const [search, setSearch] = useState(filters.search || '');
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAllMatching, setSelectAllMatching] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    // Modal states
    const [showImportModals, setShowImportModals] = useState(false);

    const [showGroupAssignModal, setShowGroupAssignModal] = useState(false);
    const [showGroupsManageModal, setShowGroupsManageModal] = useState(false);
    const [showRoomsModal, setShowRoomsModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPaymentParticipant, setSelectedPaymentParticipant] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingParticipant, setEditingParticipant] = useState(null);
    const [isBulkPaymentModalOpen, setIsBulkPaymentModalOpen] = useState(false);
    const [bulkImportResult, setBulkImportResult] = useState(null);

    // Filter states
    const [selectedBatch, setSelectedBatch] = useState(filters.batch_id || '');
    const [selectedProvince, setSelectedProvince] = useState(filters.province_id || '');
    const [selectedRegency, setSelectedRegency] = useState(filters.regency_id || '');
    const [selectedStatus, setSelectedStatus] = useState(filters.participant_status || '');
    const [perPage, setPerPage] = useState(filters.per_page || 15);

    // Calculate selected unverified count
    const selectedUnverifiedCount = React.useMemo(() => {
        if (!safeParticipants?.data) return 0;
        return safeParticipants.data.filter(p => selectedIds.includes(p.id) && !p.user?.email_verified_at).length;
    }, [selectedIds, safeParticipants]);

    // Get Selected User IDs (mapped from ActivityUser IDs)
    const selectedUserIds = React.useMemo(() => {
        if (!safeParticipants?.data) return [];
        return safeParticipants.data
            .filter(p => selectedIds.includes(p.id))
            .map(p => p.user?.id || p.user_id)
            .filter(id => id); // Remove null/undefined
    }, [selectedIds, safeParticipants]);

    // Derived custom keys
    const [availableCustomKeys] = useState(() => {
        if (customKeys && customKeys.length > 0) return customKeys;

        const extracted = new Map(); // Use Map to store lower->display
        if (safeParticipants && safeParticipants.data) {
            safeParticipants.data.forEach(p => {
                if (p.custom_data) {
                    Object.keys(p.custom_data).forEach(k => {
                        const nk = normalizeCustomKey(k);
                        if (nk) {
                            extracted.set(nk.toLowerCase(), nk);
                        }
                    });
                }
            });
        }
        return Array.from(extracted.values()).sort((a, b) => a.localeCompare(b));
    });

    // Calculate custom options for filters
    const customOptions = React.useMemo(() => {
        const options = {};
        if (availableCustomKeys.length === 0) return options;

        // Initialize all keys with empty Sets
        availableCustomKeys.forEach(key => {
            options[key] = new Set();
        });

        if (safeParticipants && safeParticipants.data) {
            safeParticipants.data.forEach(p => {
                if (p.custom_data) {
                    Object.keys(p.custom_data).forEach(dataKey => {
                        const normalizedDataKey = normalizeCustomKey(dataKey);
                        const matchedKey = availableCustomKeys.find(k => k.toLowerCase() === normalizedDataKey.toLowerCase());

                        if (matchedKey) {
                            const val = p.custom_data[dataKey];
                            if (val) {
                                options[matchedKey].add(val);
                            }
                        }
                    });
                }
            });
        }

        // Convert Sets to Arrays and ensure all keys are present
        const result = {};
        availableCustomKeys.forEach(key => {
            result[key] = options[key] ? Array.from(options[key]).sort((a, b) => String(a).localeCompare(String(b))) : [];
        });

        return result;
    }, [safeParticipants, availableCustomKeys]);

    const handleStatusClick = (participant) => {
        // Prioritize the directly loaded payment for this activity
        let payment = participant.payment;

        // Fallback to user payments list if available (legacy support)
        if (!payment && participant.user?.payments?.length > 0) {
            const payments = participant.user.payments;
            const pendingPayment = payments.find(p => p.status === 'pending');
            payment = pendingPayment || payments[0];
        }

        if (payment) {
            setSelectedPaymentParticipant({
                payment: payment,
                participant: participant
            });
            setShowPaymentModal(true);
        }
    };

    // Sync selectedPaymentParticipant when participants data updates (e.g. after upload)
    useEffect(() => {
        if (selectedPaymentParticipant && safeParticipants?.data) {
            const updatedParticipant = safeParticipants.data.find(p => p.id === selectedPaymentParticipant.participant.id);
            if (updatedParticipant) {
                // Try to get payment from direct relationship first, then fallback to user payments
                const updatedPayment = updatedParticipant.payment ||
                    (updatedParticipant.user?.payments || []).find(p => p.id === selectedPaymentParticipant.payment.id);

                if (updatedPayment) {
                    // Only update if there are actual changes to avoid loops (though setting same object structure is fine)
                    setSelectedPaymentParticipant(prev => ({
                        ...prev,
                        payment: updatedPayment,
                        participant: updatedParticipant
                    }));
                }
            }
        }
    }, [safeParticipants]);


    // Helper to get custom value by normalized key
    const getCustomValue = (participant, normalizedKey) => {
        if (!participant.custom_data) return '-';
        // Try direct match first
        if (participant.custom_data[normalizedKey]) return participant.custom_data[normalizedKey];

        // Try finding a key that normalizes to the requested key (case-insensitive)
        const lowerNormalizedKey = normalizedKey.toLowerCase();
        const foundKey = Object.keys(participant.custom_data).find(k =>
            normalizeCustomKey(k).toLowerCase() === lowerNormalizedKey
        );
        return foundKey ? participant.custom_data[foundKey] : '-';
    };

    // Column settings
    const [visibleColumns, setVisibleColumns] = useState(() => {
        // Default settings
        const defaults = {
            'col-index': true,
            'col-name': true,
            'col-email': true,
            'col-hp': false,
            'col-nik': false,
            'col-instansi': true,
            'col-pekerjaan': false,
            'col-jabatan': false,
            'col-prov': true,
            'col-regency': true,
            'col-district': true,
            'col-alamat': false,
            'col-gender': false,
            'col-birthplace': false,
            'col-birthdate': false,
            'col-status': true,
            'col-payment-method': true,
            'col-registration-method': true,
            'col-action': true,
            'col-room': false,
            'col-group': true,
            'col-created-at': false,
            'col-updated-at': false,
            'col-batch': false,
            'col-card-status': false,
            'col-certificate-id': false,
            'col-print-count': false,
            'col-created-by': false,
            'col-updated-by': false
        };

        // Add custom keys to defaults (default hidden)
        if (availableCustomKeys && availableCustomKeys.length > 0) {
            availableCustomKeys.forEach(key => {
                defaults[`col-custom-${kebabCase(key)}`] = false;
            });
        }

        // Merge with saved settings if available
        if (columnSettings && Object.keys(columnSettings).length > 0) {

            const merged = { ...defaults, ...columnSettings };

            // Remove obsolete keys to prevent them from showing in the dropdown
            delete merged['col-method'];

            return merged;
        }

        return defaults;
    });

    // Update columns when prop changes (e.g. after refresh)
    useEffect(() => {
        if (columnSettings && Object.keys(columnSettings).length > 0) {

            setVisibleColumns(prev => {
                const merged = { ...prev, ...columnSettings };
                delete merged['col-method'];
                return merged;
            });
            setLocalColumnCache(prev => {
                const merged = { ...prev, ...columnSettings };
                delete merged['col-method'];
                return merged;
            });
        }
    }, [columnSettings]);

    const [showColumnMenu, setShowColumnMenu] = useState(false);
    const [showBulkMenu, setShowBulkMenu] = useState(false);

    // Click outside handler for column menu
    const columnMenuRef = useRef(null);
    useEffect(() => {
        function handleClickOutside(event) {
            if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) {
                setShowColumnMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, []);

    const openEditModal = (participant) => {
        setEditingParticipant(participant.user);
        setShowEditModal(true);
    };

    // Bulk actions
    const handleBulkVerify = () => {
        if (!selectedIds.length) return;

        const activityId = activity?.uid || activity?.id;

        // Map selected ActivityUser IDs to User IDs
        const userIdsToVerify = safeParticipants.data
            .filter(p => selectedIds.includes(p.id))
            .map(p => p.user?.id || p.user_id)
            .filter(id => id); // Remove null/undefined

        if (!selectAllMatching && userIdsToVerify.length === 0) {
            Swal.fire('Info', 'Tidak ada peserta terpilih yang dapat diverifikasi atau data user tidak ditemukan.', 'info');
            return;
        }

        Swal.fire({
            title: 'Verifikasi Email?',
            text: selectAllMatching
                ? `Apakah Anda yakin ingin memverifikasi SEMUA ${safeParticipants.total} peserta?`
                : `Apakah Anda yakin ingin memverifikasi email ${userIdsToVerify.length} peserta terpilih?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Verifikasi',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('activity.participants.verify-email-bulk', { activityId }), {
                    user_ids: selectAllMatching ? [] : userIdsToVerify,
                    select_all: selectAllMatching,
                    batch_id: filters.batch_id
                }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedIds([]);
                        setSelectAllMatching(false);
                        Swal.fire('Berhasil!', 'Email peserta telah diverifikasi.', 'success');
                    }
                });
            }
        });
    };

    const handleBulkDelete = () => {
        if (!selectedIds.length) return;

        const activityId = activity?.uid || activity?.id;

        if (!activityId) {
            console.error('Activity ID not found for bulk delete', activity);
            Swal.fire('Error', 'ID aktivitas tidak ditemukan.', 'error');
            return;
        }

        Swal.fire({
            title: 'Hapus Peserta?',
            text: selectAllMatching
                ? `Apakah Anda yakin ingin menghapus SEMUA ${safeParticipants.total} peserta? Data yang dihapus tidak dapat dikembalikan.`
                : `Apakah Anda yakin ingin menghapus ${selectedIds.length} peserta terpilih? Data yang dihapus tidak dapat dikembalikan.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('activity.removeParticipants', { activity: activityId }), {
                    ...filters,
                    user_ids: selectAllMatching ? [] : selectedIds,
                    select_all: selectAllMatching,
                    batch_id: filters.batch_id
                }, {
                    preserveScroll: true,
                    onSuccess: (page) => {
                        setSelectedIds([]);
                        setSelectAllMatching(false);
                        if (!page.props.flash?.error) {
                            Swal.fire('Terhapus!', 'Peserta berhasil dihapus.', 'success');
                        }
                    }
                });
            }
        });
    };

    const handleBulkFillGender = () => {
        if (!selectedIds.length) return;

        const activityId = activity?.uid || activity?.id;

        // Map selected ActivityUser IDs to User IDs
        const userIdsToProcess = safeParticipants.data
            .filter(p => selectedIds.includes(p.id))
            .map(p => p.user?.id || p.user_id)
            .filter(id => id);

        Swal.fire({
            title: 'Isi Jenis Kelamin Otomatis?',
            text: selectAllMatching
                ? `Sistem akan mencoba mengisi jenis kelamin SEMUA ${safeParticipants.total} peserta yang kosong menggunakan AI.`
                : `Sistem akan mencoba mengisi jenis kelamin ${selectedIds.length} peserta terpilih yang kosong menggunakan AI.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Proses',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                // Show loading state
                Swal.fire({
                    title: 'Sedang Memproses...',
                    text: 'Mohon tunggu sebentar, AI sedang menganalisis nama peserta.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                axios.post(route('activity.participants.fill-gender', { activityId }), {
                    user_ids: selectAllMatching ? [] : userIdsToProcess,
                    select_all: selectAllMatching
                })
                    .then(response => {
                        if (response.data.success) {
                            Swal.fire({
                                title: 'Berhasil!',
                                text: response.data.message,
                                icon: 'success'
                            }).then(() => {
                                // Refresh page to show updated data
                                router.reload();
                            });
                        } else {
                            Swal.fire('Gagal', response.data.message || 'Terjadi kesalahan.', 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Error filling gender:', error);
                        Swal.fire('Error', 'Terjadi kesalahan saat memproses permintaan.', 'error');
                    });
            }
        });
        setShowBulkMenu(false);
    };

    const handleBulkChangeRole = (targetType) => {
        if (!selectedIds.length) return;

        const activityId = activity?.uid || activity?.id;

        Swal.fire({
            title: `Jadikan ${targetType.name}?`,
            text: selectAllMatching
                ? `Apakah Anda yakin ingin mengubah peran SEMUA ${safeParticipants.total} peserta menjadi ${targetType.name}?`
                : `Apakah Anda yakin ingin mengubah peran ${selectedIds.length} peserta terpilih menjadi ${targetType.name}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Ubah',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                router.post(route('activity.participants.change-role-bulk', { activityId }), {
                    user_ids: selectAllMatching ? [] : selectedIds,
                    select_all: selectAllMatching,
                    participation_type_id: targetType.id,
                    ...filters
                }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        setSelectedIds([]);
                        setSelectAllMatching(false);
                        setShowBulkMenu(false);
                        Swal.fire('Berhasil!', `Peran peserta telah diubah menjadi ${targetType.name}.`, 'success');
                    }
                });
            }
        });
    };

    // Column settings with local cache for stability
    const [localColumnCache, setLocalColumnCache] = useState(visibleColumns);
    const [isSavingColumns, setIsSavingColumns] = useState(false);

    const toggleColumn = (key) => {
        // Hapus blokir isSavingColumns agar UI tetap responsif
        // if (isSavingColumns) return;

        const newSettings = {
            ...visibleColumns,
            [key]: !visibleColumns[key]
        };

        // Optimistic update
        setVisibleColumns(newSettings);
        // setIsSavingColumns(true); // Hapus indikator loading global untuk mencegah blocking

        // Save to server
        const actId = activity?.uid || activity?.id;
        if (!actId) {
            console.error('Activity ID/UID missing', activity);
            return;
        }

        try {
            const routeUrl = route('activity.participants.save-column-settings', { activityId: actId });

            axios.post(routeUrl, {
                activity_id: activity.id,
                settings: newSettings
            }).then(response => {
                if (response.data.success) {
                    // Confirm save by updating cache
                    setLocalColumnCache(response.data.settings || newSettings);
                    // Ensure visibleColumns matches saved state (optional, can skip to avoid flicker)
                    // setVisibleColumns(response.data.settings || newSettings);
                }
            }).catch(err => {
                console.error('Failed to save column settings', err);
                // Revert to last known good state if save fails
                setVisibleColumns(localColumnCache);
            });
        } catch (error) {
            console.error('Error generating route or saving:', error);
        }
    };

    const handleBulkAssignGroup = () => {
        setShowGroupAssignModal(true);
        setShowBulkMenu(false);
    };

    // Sync search state with filters prop
    useEffect(() => {
        setSearch(filters.search || '');
    }, [filters.search]);

    // Sync perPage state with filters prop
    useEffect(() => {
        if (filters.per_page) {
            setPerPage(filters.per_page);
        }
    }, [filters.per_page]);

    // Helper to get activity ID param
    const activityIdParam = activity?.uid || activity?.id;

    // Clear filters on page load (refresh)
    useEffect(() => {
        const hasActiveFilters = Object.keys(filters).some(key => {
            if (key === 'per_page' || key === 'page') return false;
            return !!filters[key];
        });

        if (hasActiveFilters && activityIdParam) {
            router.get(
                route('activity.participants.index', activityIdParam),
                {},
                { replace: true }
            );
        }
    }, []);

    // Debounced search
    const debouncedSearch = React.useMemo(
        () => debounce((value, currentFilters, currentPerPage, currentUid) => {
            const params = { ...currentFilters, search: value, per_page: currentPerPage };
            delete params.page; // Reset to page 1 for search results

            router.get(
                route('activity.participants.index', currentUid),
                params,
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['participants', 'filters']
                }
            );
        }, 300),
        []
    );

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearch(value);
        debouncedSearch(value, filters, perPage, activityIdParam);
    };

    const clearSearch = () => {
        setSearch('');
        debouncedSearch('', filters, perPage, activityIdParam);
    };

    const handlePerPageChange = (e) => {
        const value = e.target.value;
        setPerPage(value);
        router.get(
            route('activity.participants.index', activityIdParam),
            { ...filters, per_page: value },
            { preserveState: true, preserveScroll: true, replace: true }
        );
    };

    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        // Reset child location filters if parent changes
        if (key === 'province_id') {
            newFilters.regency_id = '';
            setSelectedRegency('');
        }

        router.get(
            route('activity.participants.index', activityIdParam),
            newFilters,
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['participants', 'filters']
            }
        );
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            // Select ALL matching data (across all pages) unconditionally
            setSelectAllMatching(true);
            setSelectedIds(safeParticipants.data.map(p => p.id));
        } else {
            setSelectedIds([]);
            setSelectAllMatching(false);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
            setSelectAllMatching(false); // Deselecting one breaks the "Select All Matching" state
        } else {
            const newSelected = [...selectedIds, id];
            setSelectedIds(newSelected);

            // If all items on the current page are selected, and there's only 1 page, we are "All Matching"
            if (safeParticipants.total <= safeParticipants.per_page && newSelected.length === safeParticipants.total) {
                setSelectAllMatching(true);
            }
        }
    };

    // Auto-select items on page change if selectAllMatching is active
    useEffect(() => {
        if (selectAllMatching && safeParticipants.data) {
            setSelectedIds(safeParticipants.data.map(p => p.id));
        }
    }, [safeParticipants.data, selectAllMatching]);

    const filteredRegencies = selectedProvince
        ? safeRegencies.filter(r => r.province_id === selectedProvince)
        : safeRegencies;

    const localStatusOptions = [
        { value: '0', label: 'Menunggu Verifikasi' },
        { value: '1', label: 'Aktif' },
        { value: '2', label: 'Ditolak' },
        { value: '3', label: 'Menunggu Pembayaran' },
    ];

    return (
        <AcaraLayout
            title={`Peserta - ${activity.name}`}
            activity={activity}
            fluid={true}
        >
            <div className="">
                {/* Stats & Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="w-24 h-24 transform translate-x-4 -translate-y-4" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Users className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <div className="text-sm text-white/90 font-medium">Total Peserta</div>
                                <div className="text-3xl font-bold tracking-tight">{safeParticipants.total}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl shadow-lg text-white transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <MapPin className="w-24 h-24 transform translate-x-4 -translate-y-4" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <MapPin className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <div className="text-sm text-white/90 font-medium">Total Provinsi</div>
                                <div className="text-3xl font-bold tracking-tight">{totalProvinces}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-6 rounded-2xl shadow-lg text-white transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Building className="w-24 h-24 transform translate-x-4 -translate-y-4" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <Building className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <div className="text-sm text-white/90 font-medium">Total Kab/Kota</div>
                                <div className="text-3xl font-bold tracking-tight">{totalRegencies}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-6 rounded-2xl shadow-lg text-white transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <MapPin className="w-24 h-24 transform translate-x-4 -translate-y-4" />
                        </div>
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                <MapPin className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <div className="text-sm text-rose-100 font-medium">Total Kecamatan</div>
                                <div className="text-3xl font-bold tracking-tight">{totalDistricts}</div>
                            </div>
                        </div>
                    </div>
                    {/* Add more stats if needed */}
                </div>

                {/* Filters & Toolbar */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-3 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 w-5 h-5 transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari nama, email, instansi..."
                                value={search}
                                onChange={handleSearchChange}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                            />
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <div className="relative">
                                <select
                                    value={perPage}
                                    onChange={handlePerPageChange}
                                    className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer text-sm shadow-sm hover:bg-slate-50 transition-colors"
                                    title="Jumlah data per halaman"
                                >
                                    {[10, 15, 25, 50, 100, 250, 500, 10000].map(val => (
                                        <option key={val} value={val}>{val === 10000 ? 'Semua' : val}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative" ref={columnMenuRef}>
                                <button
                                    onClick={() => setShowColumnMenu(!showColumnMenu)}
                                    className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                    Kolom
                                </button>
                                {showColumnMenu && (
                                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 max-h-96 overflow-y-auto p-2 animate-in fade-in zoom-in-95 duration-200">
                                        <div className="space-y-0.5">
                                            {Object.keys(visibleColumns).map(key => (
                                                <label key={key} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleColumns[key]}
                                                        onChange={() => toggleColumn(key)}
                                                        className="rounded border-slate-300 text-primary focus:ring-indigo-500 w-4 h-4"
                                                    />
                                                    <span className="text-sm text-slate-700 font-medium">
                                                        {columnLabels[key] || key.replace('col-', '').replace(/^\w/, c => c.toUpperCase()).replace(/-/g, ' ')}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Bulk Actions Button */}
                            {selectedIds.length > 0 && (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowBulkMenu(!showBulkMenu)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95 animate-in fade-in zoom-in-95 duration-200"
                                    >
                                        <span className="hidden md:inline">
                                            {selectAllMatching ? `${participants.total} Terpilih (Semua)` : `${selectedIds.length} Terpilih`}
                                        </span>
                                        <ChevronDown className="w-3 h-3 ml-1" />
                                    </button>

                                    <Transition
                                        show={showBulkMenu}
                                        enter="transition ease-out duration-200"
                                        enterFrom="opacity-0 scale-95"
                                        enterTo="opacity-100 scale-100"
                                        leave="transition ease-in duration-150"
                                        leaveFrom="opacity-100 scale-100"
                                        leaveTo="opacity-0 scale-95"
                                    >
                                        <div className="absolute right-0 mt-2 w-60 bg-white rounded-xl shadow-xl border border-slate-100 z-50">
                                            <div className="p-1.5">
                                                {/* Dynamic Role Change Buttons */}
                                                {participationTypes.length > 0 && participationTypes
                                                    .filter(type => type.code !== 'peserta') // Exclude 'peserta' as it is default
                                                    .map(type => (
                                                        <button
                                                            key={type.id}
                                                            onClick={() => handleBulkChangeRole(type)}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors"
                                                        >
                                                            <UserCog className="w-4 h-4 text-indigo-500" />
                                                            Jadikan {type.name}
                                                        </button>
                                                    ))
                                                }
                                                {participationTypes.some(t => t.code !== 'peserta') && (
                                                    <div className="border-t border-slate-100 my-1"></div>
                                                )}

                                                <button
                                                    onClick={handleBulkAssignGroup}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors"
                                                >
                                                    <Users className="w-4 h-4 text-orange-500" /> Masuk Kelompok
                                                </button>
                                                <button
                                                    onClick={handleBulkFillGender}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors"
                                                >
                                                    <UserCog className="w-4 h-4 text-purple-500" />
                                                    Isi Jenis Kelamin (AI)
                                                </button>
                                                <button
                                                    onClick={handleBulkVerify}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center justify-between gap-3 transition-colors group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle className="w-4 h-4 text-emerald-600" /> Verifikasi Email
                                                    </div>
                                                    {selectedUnverifiedCount > 0 && (
                                                        <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full shadow-sm group-hover:bg-red-600 transition-colors" title="Peserta terpilih belum verifikasi email">
                                                            {selectedUnverifiedCount}
                                                        </span>
                                                    )}
                                                </button>
                                                <div className="border-t border-slate-100 my-1"></div>
                                                <button
                                                    onClick={handleBulkDelete}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Hapus Peserta
                                                </button>
                                            </div>
                                        </div>
                                    </Transition>
                                </div>
                            )}

                            <button
                                onClick={() => setShowRoomsModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
                            >
                                <Building className="w-4 h-4 text-indigo-500" />
                                <span className="hidden md:inline">Manajemen Kamar</span>
                            </button>

                            <button
                                onClick={() => setShowImportModals(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg active:scale-95"
                            >
                                <UserPlus className="w-4 h-4" />
                                <span className="hidden md:inline">Input Peserta</span>
                            </button>

                            <a
                                href={route('activity.export', {
                                    id: activity.id,
                                    format: 'excel',
                                    ...filters,
                                    visible_columns: JSON.stringify(visibleColumns)
                                })}
                                target="_blank"
                                className="flex items-center gap-2 px-4 py-2.5 border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-all shadow-sm"
                            >
                                <FileSpreadsheet className="w-4 h-4" />
                                Export
                            </a>
                        </div>
                    </div>
                </div>



                {/* Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-max text-sm text-left">
                            <thead className="bg-slate-50/80 backdrop-blur border-b border-slate-200">
                                <tr>
                                    {visibleColumns['col-index'] && <th className="px-4 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs whitespace-nowrap w-12">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={selectAllMatching || (participants.data.length > 0 && selectedIds.length === participants.data.length)}
                                                className="rounded border-slate-300 text-primary focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                            />
                                        </div>
                                    </th>}
                                    {visibleColumns['col-name'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Nama Lengkap"
                                                options={nameOptions}
                                                value={filters.name}
                                                onChange={(val) => handleFilterChange('name', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-email'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Email"
                                                options={emailOptions}
                                                value={filters.email}
                                                onChange={(val) => handleFilterChange('email', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-hp'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="No. HP"
                                                options={hpOptions}
                                                value={filters.no_hp}
                                                onChange={(val) => handleFilterChange('no_hp', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-nik'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="NIK"
                                                options={nikOptions}
                                                value={filters.nik}
                                                onChange={(val) => handleFilterChange('nik', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-instansi'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Instansi"
                                                options={instansiOptions}
                                                value={filters.instansi}
                                                onChange={(val) => handleFilterChange('instansi', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-pekerjaan'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Pekerjaan"
                                                options={pekerjaanOptions}
                                                value={filters.pekerjaan}
                                                onChange={(val) => handleFilterChange('pekerjaan', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-jabatan'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Jabatan"
                                                options={jabatanOptions}
                                                value={filters.jabatan}
                                                onChange={(val) => handleFilterChange('jabatan', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-prov'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Provinsi"
                                                options={provinceOptions}
                                                value={filters.province_name}
                                                onChange={(val) => handleFilterChange('province_name', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-regency'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Kabupaten/Kota"
                                                options={regencyNameOptions}
                                                value={filters.regency_name}
                                                onChange={(val) => handleFilterChange('regency_name', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-district'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Kecamatan"
                                                options={districtNameOptions}
                                                value={filters.district_name}
                                                onChange={(val) => handleFilterChange('district_name', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-alamat'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Alamat"
                                                options={addressOptions}
                                                value={filters.address}
                                                onChange={(val) => handleFilterChange('address', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-gender'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Jenis Kelamin"
                                                options={genderOptions}
                                                value={filters.gender}
                                                onChange={(val) => handleFilterChange('gender', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-birthplace'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Tempat Lahir"
                                                options={birthPlaceOptions}
                                                value={filters.birth_place}
                                                onChange={(val) => handleFilterChange('birth_place', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-birthdate'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Tanggal Lahir"
                                                options={birthYearOptions}
                                                value={filters.birth_year}
                                                onChange={(val) => handleFilterChange('birth_year', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-room'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Kamar"
                                                options={roomOptions}
                                                value={filters.room_number}
                                                onChange={(val) => handleFilterChange('room_number', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-group'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Kelompok"
                                                options={participantGroups}
                                                value={filters.group_id}
                                                onChange={(val) => handleFilterChange('group_id', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-created-at'] && <th className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700 uppercase tracking-wider text-xs">Tanggal Daftar</th>}
                                    {visibleColumns['col-updated-at'] && <th className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700 uppercase tracking-wider text-xs">Terakhir Update</th>}
                                    {visibleColumns['col-batch'] && <th className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700 uppercase tracking-wider text-xs">Batch</th>}
                                    {visibleColumns['col-card-status'] && <th className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700 uppercase tracking-wider text-xs">Status Kartu</th>}
                                    {visibleColumns['col-certificate-id'] && <th className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700 uppercase tracking-wider text-xs">ID Sertifikat</th>}
                                    {visibleColumns['col-print-count'] && <th className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700 uppercase tracking-wider text-xs">Jml Cetak</th>}
                                    {visibleColumns['col-created-by'] && <th className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700 uppercase tracking-wider text-xs">Dibuat Oleh</th>}
                                    {visibleColumns['col-updated-by'] && <th className="px-6 py-4 whitespace-nowrap font-semibold text-slate-700 uppercase tracking-wider text-xs">Diupdate Oleh</th>}
                                    {availableCustomKeys.map(key => (
                                        visibleColumns[`col-custom-${kebabCase(key)}`] && (
                                            <th key={key} className="px-6 py-4 whitespace-nowrap">
                                                <ColumnFilter
                                                    label={key.replace(/_/g, ' ')}
                                                    options={customOptions[key] || []}
                                                    value={filters[`custom_${key}`]}
                                                    onChange={(val) => handleFilterChange(`custom_${key}`, val)}
                                                />
                                            </th>
                                        )
                                    ))}
                                    {visibleColumns['col-status'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Status"
                                                options={statusOptions}
                                                value={filters.participant_status}
                                                onChange={(val) => handleFilterChange('participant_status', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-payment-method'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Metode Pembayaran"
                                                options={paymentMethodOptions}
                                                value={filters.payment_method}
                                                onChange={(val) => handleFilterChange('payment_method', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-registration-method'] && (
                                        <th className="px-6 py-4 whitespace-nowrap">
                                            <ColumnFilter
                                                label="Metode Daftar"
                                                options={registrationMethodOptions}
                                                value={filters.registration_method}
                                                onChange={(val) => handleFilterChange('registration_method', val)}
                                            />
                                        </th>
                                    )}
                                    {visibleColumns['col-action'] && <th className="px-6 py-4 font-semibold text-slate-700 uppercase tracking-wider text-xs text-right whitespace-nowrap">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {safeParticipants.data.length > 0 ? (
                                    safeParticipants.data.map((participant) => (
                                        <tr key={participant.id} className="hover:bg-slate-50/80 transition-colors group">
                                            {visibleColumns['col-index'] && (
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(participant.id)}
                                                            onChange={() => handleSelectOne(participant.id)}
                                                            className="rounded border-slate-300 text-primary focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                                                        />
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns['col-name'] && (
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-slate-900">{participant.user?.name}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        Daftar: {new Date(participant.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </td>
                                            )}
                                            {visibleColumns['col-email'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{participant.user?.email}</td>
                                            )}
                                            {visibleColumns['col-hp'] && (
                                                <td className="px-6 py-4 text-slate-600 font-mono text-xs whitespace-nowrap">{participant.user?.profile?.no_hp || '-'}</td>
                                            )}
                                            {visibleColumns['col-nik'] && (
                                                <td className="px-6 py-4 text-slate-600 font-mono text-xs whitespace-nowrap">{participant.user?.profile?.nik || '-'}</td>
                                            )}
                                            {visibleColumns['col-instansi'] && (
                                                <td className="px-6 py-4 text-slate-900 font-medium whitespace-nowrap">{participant.user?.profile?.instansi || '-'}</td>
                                            )}
                                            {visibleColumns['col-pekerjaan'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{participant.user?.profile?.pekerjaan || '-'}</td>
                                            )}
                                            {visibleColumns['col-jabatan'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{participant.user?.profile?.jabatan || '-'}</td>
                                            )}
                                            {visibleColumns['col-prov'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {(() => {
                                                        const p = participant.user?.profile;
                                                        if (!p) return '-';
                                                        return p.province?.name
                                                            || safeProvinces.find(ref => String(ref.id) === String(p.province_id))?.name
                                                            || p.other_province
                                                            || '-';
                                                    })()}
                                                </td>
                                            )}
                                            {visibleColumns['col-regency'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {(() => {
                                                        const p = participant.user?.profile;
                                                        if (!p) return '-';
                                                        return p.regency?.name
                                                            || safeRegencies.find(ref => String(ref.id) === String(p.regency_id))?.name
                                                            || p.other_regency
                                                            || '-';
                                                    })()}
                                                </td>
                                            )}
                                            {visibleColumns['col-district'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {(() => {
                                                        const p = participant.user?.profile;
                                                        if (!p) return '-';
                                                        return p.district?.name
                                                            || safeDistricts.find(ref => String(ref.id) === String(p.district_id))?.name
                                                            || p.other_district
                                                            || '-';
                                                    })()}
                                                </td>
                                            )}
                                            {visibleColumns['col-alamat'] && (
                                                <td className="px-6 py-4 text-slate-600 truncate max-w-xs" title={participant.user?.profile?.alamat}>
                                                    {participant.user?.profile?.alamat || '-'}
                                                </td>
                                            )}
                                            {visibleColumns['col-gender'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {participant.user?.profile?.jenis_kelamin === 'L' ? (
                                                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">L</span>
                                                    ) : participant.user?.profile?.jenis_kelamin === 'P' ? (
                                                        <span className="inline-flex items-center gap-1 bg-pink-50 text-pink-700 px-2 py-0.5 rounded text-xs font-medium">P</span>
                                                    ) : '-'}
                                                </td>
                                            )}
                                            {visibleColumns['col-birthplace'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{participant.user?.profile?.birth_place || '-'}</td>
                                            )}
                                            {visibleColumns['col-birthdate'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {participant.user?.profile?.birth_date ? new Date(participant.user.profile.birth_date).toLocaleDateString('id-ID') : '-'}
                                                </td>
                                            )}
                                            {visibleColumns['col-room'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    <RoomSelect
                                                        activity={activity}
                                                        participant={participant}
                                                        rooms={rooms}
                                                        roomOccupants={roomOccupants}
                                                    />
                                                </td>
                                            )}
                                            {visibleColumns['col-group'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {participant.participantGroup ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                            {participant.participantGroup.name}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                            )}
                                            {visibleColumns['col-created-at'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {participant.created_at ? new Date(participant.created_at).toLocaleString('id-ID') : '-'}
                                                </td>
                                            )}
                                            {visibleColumns['col-updated-at'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {participant.updated_at ? new Date(participant.updated_at).toLocaleString('id-ID') : '-'}
                                                </td>
                                            )}
                                            {visibleColumns['col-batch'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {participant.batch?.name || '-'}
                                                </td>
                                            )}
                                            {visibleColumns['col-card-status'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {participant.card_status || '-'}
                                                </td>
                                            )}
                                            {visibleColumns['col-certificate-id'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {participant.certificate_id || '-'}
                                                </td>
                                            )}
                                            {visibleColumns['col-print-count'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {participant.print_count || 0}
                                                </td>
                                            )}
                                            {visibleColumns['col-created-by'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {participant.creator?.name || '-'}
                                                </td>
                                            )}
                                            {visibleColumns['col-updated-by'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {participant.updater?.name || '-'}
                                                </td>
                                            )}
                                            {availableCustomKeys.map(key => (
                                                visibleColumns[`col-custom-${kebabCase(key)}`] && (
                                                    <td key={key} className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                        {getCustomValue(participant, key)}
                                                    </td>
                                                )
                                            ))}
                                            {visibleColumns['col-status'] && (
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleStatusClick(participant)}
                                                        className="hover:opacity-80 transition-opacity text-left focus:outline-none"
                                                    >
                                                        <StatusBadge status={participant.status} />
                                                    </button>
                                                </td>
                                            )}
                                            {visibleColumns['col-payment-method'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {(() => {
                                                        // Prioritize directly attached payment relation, fallback to user payments list
                                                        const payment = participant.payment || participant.user?.payments?.[0];
                                                        if (!payment) return '-';
                                                        return payment.payment_method?.name || (payment.midtrans_transaction_id ? 'Payment Gateway (Otomatis)' : 'Transfer Bank (Manual)');
                                                    })()}
                                                </td>
                                            )}
                                            {visibleColumns['col-registration-method'] && (
                                                <td className="px-6 py-4 text-slate-600 whitespace-nowrap">
                                                    {(() => {
                                                        const payment = participant.payment;

                                                        // Only consider the specifically assigned payment for this participant
                                                        // The backend now correctly filters this to be either their individual payment
                                                        // or a group payment ONLY IF they are a member of that group.
                                                        const isGroupPayment = payment && (payment.is_group_payment || (payment.group_members && payment.group_members.length > 0));

                                                        const isGroup = participant.participantGroup || isGroupPayment;

                                                        return isGroup ? (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                                Kelompok
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                                                                Mandiri
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                            )}
                                            {visibleColumns['col-action'] && (
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isAdmin && (
                                                            <button
                                                                onClick={() => openEditModal(participant)}
                                                                className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-primary transition-colors"
                                                                title="Edit Profil Peserta"
                                                            >
                                                                <UserCog className="w-5 h-5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Search className="w-8 h-8 text-slate-300" />
                                                <p>Tidak ada data peserta ditemukan.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {participants.links && participants.links.length > 3 && (
                        <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/50">
                            <div className="text-sm text-slate-500">
                                Menampilkan <span className="font-medium text-slate-900">{participants.from || 0}</span> sampai <span className="font-medium text-slate-900">{participants.to || 0}</span> dari <span className="font-medium text-slate-900">{participants.total || 0}</span> data
                            </div>
                            <div className="flex gap-1.5 flex-wrap justify-center">
                                {participants.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${link.active
                                            ? 'bg-primary text-white shadow-md shadow-indigo-200'
                                            : link.url
                                                ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary hover:border-indigo-200'
                                                : 'text-slate-400 cursor-not-allowed bg-slate-50'
                                            }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        preserveState
                                        preserveScroll
                                        only={['participants', 'filters']}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <BulkImportModal
                isOpen={showImportModals}
                onClose={() => setShowImportModals(false)}
                activityId={activity.uid || activity.id}
                activity={activity}
                onSuccess={() => {
                    setShowImportModals(false);
                    router.reload({ only: ['participants', 'participantsStats', 'filters'] });
                }}
                onPaymentRequest={(result) => {
                    setBulkImportResult(result);
                    setShowImportModals(false);
                    setIsBulkPaymentModalOpen(true);
                }}
                return_to="participants"
            />

            <BulkPaymentModal
                show={isBulkPaymentModalOpen}
                onClose={() => setIsBulkPaymentModalOpen(false)}
                activity={activity}
                importResult={bulkImportResult}
                return_to="participants"
            />



            <GroupAssignModal
                show={showGroupAssignModal}
                onClose={() => setShowGroupAssignModal(false)}
                activity={activity}
                selectedUserIds={selectedIds}
                groups={participantGroups}
                onSuccess={() => {
                    setSelectedIds([]);
                    // Optional: refresh data
                }}
            />

            <GroupsManageModal
                isOpen={showGroupsManageModal}
                onClose={() => setShowGroupsManageModal(false)}
                activity={activity}
                participantGroups={participantGroups}
            />

            <RoomsModal
                isOpen={showRoomsModal}
                onClose={() => setShowRoomsModal(false)}
                activity={activity}
                rooms={rooms}
                hotels={hotels}
                roomOccupants={roomOccupants}
                unassignedParticipants={unassignedParticipants}
            />

            <PaymentValidationModal
                show={showPaymentModal}
                onClose={() => {
                    setShowPaymentModal(false);
                    setSelectedPaymentParticipant(null);
                }}
                payment={selectedPaymentParticipant?.payment}
                participant={selectedPaymentParticipant?.participant}
                activity={activity}
                paymentMethods={paymentMethodOptions}
            />

            <ParticipantEditModal
                show={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingParticipant(null);
                }}
                user={editingParticipant}
                activity={activity}
                provinces={safeProvinces}
            />
        </AcaraLayout>
    );
}

function StatusBadge({ status }) {
    const styles = {
        1: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Aktif' },
        0: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'Menunggu Verifikasi' },
        2: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500', label: 'Ditolak' },
        3: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500', label: 'Menunggu Pembayaran' },
    };

    const style = styles[status] || { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500', label: 'Unknown' };

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {style.label}
        </span>
    );
}

