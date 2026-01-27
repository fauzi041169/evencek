import React, { useState, useEffect } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import AcaraLayout from '@/Layouts/AcaraLayout';
import Swal from 'sweetalert2';

export default function Management({
    selectedActivity,
    participants,
    activities,
    attendances,
    presentCount,
    selectedAttendanceId,
    selectedAttendance,
    totalParticipantsForStats
}) {
    const [search, setSearch] = useState(new URLSearchParams(window.location.search).get('search') || '');
    const [perPage, setPerPage] = useState(parseInt(new URLSearchParams(window.location.search).get('per_page') || '20'));
    const [statusFilter, setStatusFilter] = useState(new URLSearchParams(window.location.search).get('status_filter') || '');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrData, setQrData] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        jenis_absen: [],
        description: '',
        activity_batch_id: '',
    });

    // Calculate stats
    const totalParticipants = participants?.total || participants?.length || 0;
    const attendancePercentage = totalParticipants > 0 ? (presentCount / totalParticipants) * 100 : 0;

    // Search handler with debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            if (search !== (new URLSearchParams(window.location.search).get('search') || '')) {
                const params = new URLSearchParams(window.location.search);
                if (search) {
                    params.set('search', search);
                } else {
                    params.delete('search');
                }
                params.delete('page');
                router.visit(`${window.location.pathname}?${params.toString()}`, { preserveState: true });
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Handle attendance selection
    const handleAttendanceClick = (attendanceId) => {
        const params = new URLSearchParams(window.location.search);
        params.set('attendance_filter', attendanceId);
        params.delete('page');
        router.visit(`${window.location.pathname}?${params.toString()}`);
    };

    // Handle per page change
    const handlePerPageChange = (value) => {
        setPerPage(value);
        const params = new URLSearchParams(window.location.search);
        params.set('per_page', value);
        params.delete('page');
        router.visit(`${window.location.pathname}?${params.toString()}`);
    };

    // Handle status filter change
    const handleStatusFilter = (filter) => {
        const params = new URLSearchParams(window.location.search);
        if (filter) {
            params.set('status_filter', filter);
        } else {
            params.delete('status_filter');
        }
        params.delete('page');
        router.visit(`${window.location.pathname}?${params.toString()}`);
    };

    // Submit new attendance
    const submitAttendance = (e) => {
        e.preventDefault();
        post(route('attendance.store', selectedActivity.id), {
            onSuccess: () => {
                setShowAddModal(false);
                reset();
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil',
                    text: 'Jenis absen berhasil ditambahkan',
                    timer: 1500,
                    showConfirmButton: false
                });
            }
        });
    };

    // Toggle attendance checkbox
    const handleAttendanceCheckbox = async (userId, isPresent) => {
        try {
            const response = await fetch('/attendance/record-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                },
                body: JSON.stringify({
                    user_id: userId,
                    activity_id: selectedActivity.id,
                    attendance_id: selectedAttendanceId,
                    status: isPresent ? 1 : 0
                })
            });

            const result = await response.json();
            if (!result.success) {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal',
                    text: result.message || 'Gagal mengupdate status kehadiran'
                });
            } else {
                router.reload({ preserveScroll: true });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Terjadi kesalahan saat mengupdate status'
            });
        }
    };

    // Mark all present
    const handleMarkAllPresent = async (attendanceId) => {
        const result = await Swal.fire({
            title: 'Absen Semua Peserta?',
            text: 'Anda yakin ingin mengabsensi semua peserta yang belum hadir?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#28a745',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Absen Semua',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            try {
                const response = await fetch('/attendance/mark-all-present', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    },
                    body: JSON.stringify({
                        attendance_id: attendanceId,
                        activity_id: selectedActivity.id
                    })
                });

                const responseData = await response.json();
                if (responseData.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: responseData.message || 'Semua peserta berhasil diabsensi',
                        timer: 1500,
                        showConfirmButton: false
                    }).then(() => router.reload());
                }
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Gagal mengabsensi semua peserta'
                });
            }
        }
    };

    // Delete attendance
    const handleDeleteAttendance = async (attendanceId, attendanceName) => {
        const result = await Swal.fire({
            title: 'Hapus Jenis Absen?',
            text: `Yakin ingin menghapus "${attendanceName}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (result.isConfirmed) {
            router.delete(route('attendance.destroy', { activity: selectedActivity.id, attendance: attendanceId }), {
                onSuccess: () => {
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: 'Jenis absen berhasil dihapus',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            });
        }
    };

    // Show QR Code
    const showQRCode = (attendanceId, activityName, attendanceName) => {
        const qrDataStr = JSON.stringify({
            type: 'attendance',
            activity_id: selectedActivity.id,
            attendance_id: attendanceId,
            timestamp: Date.now()
        });
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrDataStr)}`;
        setQrData({ url: qrUrl, activityName, attendanceName });
        setShowQRModal(true);
    };

    // Check if user can manage attendance
    const canManageAttendance = selectedActivity && true; // Simplified - actual logic would check auth

    // Get attendance status for a participant
    const getAttendanceStatus = (participant) => {
        if (!selectedAttendanceId || !participant.attendance_records) return null;
        return participant.attendance_records.find(r => r.attendance_id === selectedAttendanceId);
    };

    const hasType = (attendance, type) => {
        if (!attendance?.jenis_absen) return false;
        return attendance.jenis_absen.split(',').includes(type);
    };

    const isManualType = hasType(selectedAttendance, 'Manual');
    const isQRMandiriType = hasType(selectedAttendance, 'QR Mandiri');

    if (!selectedActivity) {
        return (
            <AcaraLayout title="Manajemen Absensi">
                <div className="min-h-screen bg-gray-50 py-8 px-4">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                            <p className="text-secondary">Silakan pilih aktivitas untuk melihat data peserta.</p>
                        </div>
                    </div>
                </div>
            </AcaraLayout>
        );
    }

    return (
        <AcaraLayout
            title={`Manajemen Absensi - ${selectedActivity.name}`}
            activity={selectedActivity}
            fluid={true}
            noPadding={true}
        >
            <div className="bg-gray-50 min-h-screen">
                <div className="w-full mx-auto px-4 py-4">
                    {/* Activity Header */}
                    <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">{selectedActivity.name}</h2>
                        <div className="text-gray-600 text-sm mt-1">
                            {selectedActivity.date && (
                                <span className="mr-4">
                                    <i className="fas fa-clock mr-1"></i>
                                    {new Date(selectedActivity.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            )}
                            {selectedActivity.location && (
                                <span>
                                    <i className="fas fa-map-marker-alt mr-1"></i>
                                    {selectedActivity.location}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-500 rounded-xl p-4 text-white shadow-lg">
                            <h3 className="text-3xl font-bold">{totalParticipants}</h3>
                            <p className="text-blue-100">Total Peserta</p>
                        </div>
                        <div className="bg-green-500 rounded-xl p-4 text-white shadow-lg">
                            <h3 className="text-3xl font-bold">{attendances?.length || 0}</h3>
                            <p className="text-green-100">Total Jenis Absen</p>
                        </div>
                        <div className="bg-yellow-500 rounded-xl p-4 text-white shadow-lg">
                            <h3 className="text-3xl font-bold">{presentCount || 0}</h3>
                            <p className="text-yellow-100">Peserta Hadir</p>
                        </div>
                        <div className="bg-red-500 rounded-xl p-4 text-white shadow-lg">
                            <h3 className="text-3xl font-bold">{Math.max(0, totalParticipants - (presentCount || 0))}</h3>
                            <p className="text-red-100">Tidak Hadir</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {selectedAttendanceId && totalParticipants > 0 && (
                        <div className="bg-white rounded-xl p-4 mb-6 shadow">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-semibold">Progres Kehadiran: {attendancePercentage.toFixed(1)}%</span>
                                <span className="text-sm text-gray-600">{presentCount} dari {totalParticipants} peserta</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-green-500 h-3 rounded-full transition-all duration-300"
                                    style={{ width: `${attendancePercentage}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Attendance List */}
                        <div className="lg:col-span-1">
                            <div className="bg-white rounded-xl shadow overflow-hidden">
                                <div className="bg-blue-500 px-4 py-3 flex justify-between items-center">
                                    <h3 className="text-white font-bold">List Absen</h3>
                                    {canManageAttendance && (
                                        <button
                                            onClick={() => setShowAddModal(true)}
                                            className="bg-white text-secondary px-3 py-1 rounded-lg text-sm font-semibold hover:bg-gray-100"
                                        >
                                            <i className="fas fa-plus mr-1"></i> Tambah
                                        </button>
                                    )}
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {attendances && attendances.length > 0 ? (
                                        attendances.map((attendance, index) => (
                                            <div
                                                key={attendance.id}
                                                className={`p-3 cursor-pointer hover:bg-gray-50 transition-all ${selectedAttendanceId === attendance.id
                                                    ? 'bg-red-50 border-l-4 border-red-500'
                                                    : 'border-l-4 border-transparent'
                                                    }`}
                                                onClick={() => handleAttendanceClick(attendance.id)}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                                        <span className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold text-white mt-1 ${selectedAttendanceId === attendance.id ? 'bg-red-500' : 'bg-gray-500'
                                                            }`}>
                                                            {index + 1}
                                                        </span>
                                                        <div className="flex flex-col min-w-0 w-full">
                                                            <span className={`break-words whitespace-normal leading-tight ${selectedAttendanceId === attendance.id ? 'font-semibold text-red-700' : ''}`}>
                                                                {attendance.name}
                                                            </span>
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {attendance.jenis_absen.split(',').map((type, i) => (
                                                                    <span key={i} className="px-2 py-0.5 bg-secondary/10 text-blue-700 text-xs rounded">
                                                                        {type}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                        {hasType(attendance, 'QR Mandiri') && (
                                                            <button
                                                                onClick={() => showQRCode(attendance.id, selectedActivity.name, attendance.name)}
                                                                className="p-1.5 bg-blue-500 text-white rounded hover:bg-secondary"
                                                                title="Tampilkan QR Code"
                                                            >
                                                                <i className="fas fa-qrcode text-xs"></i>
                                                            </button>
                                                        )}
                                                        {hasType(attendance, 'Manual') && (
                                                            <button
                                                                onClick={() => handleMarkAllPresent(attendance.id)}
                                                                className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600"
                                                                title="Absen Semua"
                                                            >
                                                                <i className="fas fa-check-double text-xs"></i>
                                                            </button>
                                                        )}
                                                        {hasType(attendance, 'QR Manual') && (
                                                            <Link
                                                                href={route('attendance.scan', { activity: selectedActivity.id, attendance: attendance.id })}
                                                                className="p-1.5 bg-blue-500 text-white rounded hover:bg-secondary"
                                                                title="Scan QR"
                                                            >
                                                                <i className="fas fa-camera text-xs"></i>
                                                            </Link>
                                                        )}
                                                        <Link
                                                            href={route('attendance.results', { attendance: attendance.id, activity_id: selectedActivity.id })}
                                                            className="p-1.5 bg-cyan-500 text-white rounded hover:bg-cyan-600"
                                                            title="Hasil Absensi"
                                                        >
                                                            <i className="fas fa-chart-bar text-xs"></i>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteAttendance(attendance.id, attendance.name)}
                                                            className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600"
                                                            title="Hapus"
                                                        >
                                                            <i className="fas fa-trash text-xs"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 text-center text-gray-500">
                                            Belum ada jenis absen yang ditambahkan.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Participants List */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl shadow overflow-hidden">
                                <div className="p-4 border-b">
                                    <div className="flex flex-col gap-4">
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-lg">
                                                {selectedAttendance
                                                    ? `Daftar Absen: ${selectedAttendance.name}`
                                                    : 'Daftar Peserta Aktivitas'
                                                }
                                            </h3>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                                            {selectedAttendanceId && (
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={() => handleStatusFilter('')}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${!statusFilter ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                                                    >
                                                        Semua
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusFilter('present')}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'present' ? 'bg-green-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                                                    >
                                                        Hadir
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusFilter('absent')}
                                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${statusFilter === 'absent' ? 'bg-red-600 text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                                                    >
                                                        Tidak Hadir
                                                    </button>
                                                </div>
                                            )}
                                            <a
                                                href={route('attendance.download', {
                                                    activity_id: selectedActivity.id,
                                                    attendance_id: selectedAttendanceId,
                                                    batch_id: selectedAttendance?.activity_batch_id
                                                })}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 shadow-sm transition-all ml-auto"
                                            >
                                                <i className="fas fa-file-excel"></i>
                                                <span className="hidden sm:inline">Download Excel</span>
                                                <span className="sm:hidden">Excel</span>
                                            </a>
                                        </div>
                                    </div>

                                    {/* Search */}
                                    <div className="mt-4 flex gap-4">
                                        <div className="flex-1">
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                                    <i className="fas fa-search"></i>
                                                </span>
                                                <input
                                                    type="search"
                                                    value={search}
                                                    onChange={(e) => setSearch(e.target.value)}
                                                    placeholder="Cari berdasarkan nama, provinsi, atau kabupaten..."
                                                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                        </div>
                                        <select
                                            value={perPage}
                                            onChange={(e) => handlePerPageChange(e.target.value)}
                                            className="px-3 py-2 border rounded-lg"
                                        >
                                            <option value="10">10</option>
                                            <option value="20">20</option>
                                            <option value="50">50</option>
                                            <option value="100">100</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nama</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Provinsi</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Kabupaten</th>
                                                {selectedAttendanceId && (
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Status</th>
                                                )}
                                                {selectedAttendanceId && isManualType && (
                                                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Aksi</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {participants?.data?.length > 0 ? (
                                                participants.data.map((participant) => {
                                                    const status = getAttendanceStatus(participant);
                                                    const isPresent = status?.status === 1;

                                                    return (
                                                        <tr key={participant.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 align-top">
                                                                <strong>{participant.user?.name || '-'}</strong>
                                                            </td>
                                                            <td className="px-4 py-3 hidden md:table-cell text-gray-600 align-top">
                                                                {participant.user?.profile?.province?.name || '-'}
                                                            </td>
                                                            <td className="px-4 py-3 hidden md:table-cell text-gray-600 align-top">
                                                                {participant.user?.profile?.regency?.name || '-'}
                                                            </td>
                                                            {selectedAttendanceId && (
                                                                <td className="px-4 py-3 text-center whitespace-nowrap align-top">
                                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isPresent
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-red-100 text-red-800'
                                                                        }`}>
                                                                        <i className={`fas ${isPresent ? 'fa-check-circle' : 'fa-times-circle'} mr-1`}></i>
                                                                        {isPresent ? 'Hadir' : 'Tidak Hadir'}
                                                                    </span>
                                                                </td>
                                                            )}
                                                            {selectedAttendanceId && isManualType && (
                                                                <td className="px-4 py-3 text-center whitespace-nowrap align-top">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isPresent}
                                                                        onChange={(e) => handleAttendanceCheckbox(participant.user_id, e.target.checked)}
                                                                        className="w-6 h-6 rounded border-gray-300 text-green-600 focus:ring-green-500 cursor-pointer"
                                                                    />
                                                                </td>
                                                            )}
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan={selectedAttendanceId ? (isManualType ? 5 : 4) : 3} className="px-4 py-8 text-center text-gray-500">
                                                        Tidak ada peserta ditemukan.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {participants?.links && participants.links.length > 3 && (
                                    <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-3">
                                        <span className="text-sm text-gray-600">
                                            Menampilkan {participants.from || 0} - {participants.to || 0} dari {participants.total} peserta
                                        </span>
                                        <div className="flex gap-1">
                                            {participants.links.map((link, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => link.url && router.visit(link.url)}
                                                    disabled={!link.url}
                                                    className={`px-3 py-1 rounded text-sm ${link.active
                                                        ? 'bg-blue-500 text-white'
                                                        : link.url
                                                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Attendance Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg">Tambah Jenis Absen</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-white hover:text-gray-200">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <form onSubmit={submitAttendance} className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                                        Nama Absen <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        placeholder="Masukkan nama absen"
                                        required
                                    />
                                    {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Jenis Absen <span className="text-red-500">*</span>
                                    </label>
                                    <div className="space-y-2 border p-3 rounded-lg bg-gray-50">
                                        {['Mandiri', 'Manual', 'QR Mandiri', 'QR Manual'].map((type) => (
                                            <label key={type} className="flex items-center space-x-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    value={type}
                                                    checked={data.jenis_absen.includes(type)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        if (checked) {
                                                            setData('jenis_absen', [...data.jenis_absen, type]);
                                                        } else {
                                                            setData('jenis_absen', data.jenis_absen.filter(t => t !== type));
                                                        }
                                                    }}
                                                    className="rounded text-secondary focus:ring-blue-500 w-4 h-4"
                                                />
                                                <span className="text-gray-700">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.jenis_absen && <p className="text-red-500 text-sm mt-1">{errors.jenis_absen}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Deskripsi</label>
                                    <textarea
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                        rows="3"
                                        placeholder="Deskripsi (opsional)"
                                    ></textarea>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="px-6 py-2 bg-secondary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {processing ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && qrData && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl max-w-md w-full shadow-2xl">
                        <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg">QR Code Absensi</h3>
                            <button onClick={() => setShowQRModal(false)} className="text-white hover:text-gray-200">
                                <i className="fas fa-times"></i>
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <p className="font-semibold text-gray-800">{qrData.activityName}</p>
                            <p className="text-sm text-gray-500 mb-4">{qrData.attendanceName}</p>
                            <div className="flex justify-center mb-4">
                                <img src={qrData.url} alt="QR Code" className="rounded-lg shadow-md" />
                            </div>
                            <p className="text-sm text-gray-500">Tampilkan QR code ini kepada peserta untuk di-scan</p>
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3">
                            <button
                                onClick={() => setShowQRModal(false)}
                                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                            >
                                Tutup
                            </button>
                            <a
                                href={qrData.url}
                                download="qr-code-absensi.png"
                                className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-blue-700"
                            >
                                <i className="fas fa-download mr-2"></i> Download
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </AcaraLayout>
    );
}

