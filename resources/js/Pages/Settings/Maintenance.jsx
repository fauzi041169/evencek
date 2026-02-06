import React, { useEffect, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import Swal from 'sweetalert2';
import MainLayout from '@/Layouts/MainLayout';
import Modal from '@/Components/Modal';

export default function Maintenance({ setting, apkList = [], permissionMatrix = [], roles = [] }) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const [statusActive, setStatusActive] = useState(!!setting?.is_maintenance_mode);
    const [alert, setAlert] = useState(null);
    const [logs, setLogs] = useState([]);
    const [logsUpdated, setLogsUpdated] = useState('');
    const [logLevel, setLogLevel] = useState('');
    const [logLines, setLogLines] = useState(200);
    const [artisanOutput, setArtisanOutput] = useState('');

    // Update App States
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [updateStatus, setUpdateStatus] = useState('idle'); // idle, loading, success, error
    const [updateMessage, setUpdateMessage] = useState('');
    const [updateOutput, setUpdateOutput] = useState('');

    const { data, setData, post, processing } = useForm({
        maintenance_message: setting?.maintenance_message || '',
        maintenance_start: setting?.maintenance_start ? String(setting.maintenance_start).slice(0, 16) : '',
        maintenance_end: setting?.maintenance_end ? String(setting.maintenance_end).slice(0, 16) : '',
        allowed_ips: setting?.allowed_ips || '',
    });

    const { data: apkForm, setData: setApkForm, post: postApk, processing: apkProcessing } = useForm({
        app_apk: null,
    });

    const showAlert = (type, message) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    };

    const requestJson = async (url, options = {}) => {
        const res = await fetch(url, {
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            ...options,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            const error = new Error(data?.message || 'Terjadi kesalahan');
            error.data = data;
            throw error;
        }
        return data;
    };

    const updateSettings = async () => {
        try {
            const payload = {
                maintenance_message: data.maintenance_message,
                maintenance_start: data.maintenance_start || null,
                maintenance_end: data.maintenance_end || null,
                allowed_ips: data.allowed_ips,
            };
            const res = await requestJson(route('maintenance.update'), {
                method: 'POST',
                body: JSON.stringify(payload),
            });
            showAlert('success', res.message || 'Pengaturan diperbarui');
        } catch (err) {
            showAlert('error', err.message);
        }
    };

    const enableMaintenance = async () => {
        Swal.fire({
            title: 'Aktifkan maintenance?',
            text: "Situs akan masuk ke mode maintenance.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Aktifkan!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        maintenance_message: data.maintenance_message,
                        maintenance_start: data.maintenance_start || null,
                        maintenance_end: data.maintenance_end || null,
                        allowed_ips: data.allowed_ips,
                    };
                    const res = await requestJson(route('maintenance.enable'), {
                        method: 'POST',
                        body: JSON.stringify(payload),
                    });
                    setStatusActive(true);
                    showAlert('success', res.message || 'Maintenance aktif');
                } catch (err) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: err.message,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            }
        });
    };

    const disableMaintenance = async () => {
        Swal.fire({
            title: 'Matikan maintenance?',
            text: "Situs akan kembali online.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Matikan!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await requestJson(route('maintenance.disable'), { method: 'POST' });
                    setStatusActive(false);
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: res.message || 'Maintenance nonaktif',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                } catch (err) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: err.message,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            }
        });
    };

    const uploadApk = (e) => {
        e.preventDefault();
        postApk(route('maintenance.upload-apk'), {
            forceFormData: true,
            onSuccess: () => Swal.fire({
                icon: 'success',
                title: 'Berhasil',
                text: 'APK diunggah',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000
            })
        });
    };

    const deleteApk = async (filename) => {
        Swal.fire({
            title: 'Hapus APK?',
            text: "File APK akan dihapus permanen.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await requestJson(route('maintenance.delete-apk'), {
                        method: 'POST',
                        body: JSON.stringify({ filename }),
                    });
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: res.message || 'APK dihapus',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                } catch (err) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: err.message,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            }
        });
    };

    const handleCleanupFiles = () => {
        Swal.fire({
            title: 'Bersihkan File Sampah?',
            text: "Ini akan MENGHAPUS file (foto/dokumen) yang tidak terhubung ke database. Pastikan Anda memiliki backup!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Bersihkan!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await requestJson(route('maintenance.cleanup-unused-files'), { method: 'POST' });
                    setArtisanOutput(res.output || res.message || '');
                    showAlert('success', res.message || 'Berhasil');
                } catch (err) {
                    setArtisanOutput(err.message);
                    showAlert('error', err.message);
                }
            }
        });
    };

    const runArtisan = async (url) => {
        Swal.fire({
            title: 'Jalankan perintah?',
            text: "Perintah artisan akan dieksekusi.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Jalankan!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await requestJson(url, { method: 'POST' });
                    setArtisanOutput(res.output || res.message || '');
                    showAlert('success', res.message || 'Berhasil');
                } catch (err) {
                    setArtisanOutput(err.message);
                    showAlert('error', err.message);
                }
            }
        });
    };

    const clearBrowserCache = () => {
        Swal.fire({
            title: 'Bersihkan Cache?',
            text: 'Bersihkan cache browser? Ini akan menghapus data sesi lokal.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E02424',
            cancelButtonColor: '#718096',
            confirmButtonText: 'Ya, Bersihkan',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                try {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.reload();
                } catch (e) {
                    showAlert('error', 'Gagal membersihkan browser cache');
                }
            }
        });
    };

    const fetchLogs = async () => {
        try {
            const url = new URL(route('maintenance.logs'), window.location.origin);
            url.searchParams.set('lines', String(logLines));
            if (logLevel) url.searchParams.set('level', logLevel);
            const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data?.message || 'Gagal memuat log');
            }
            setLogs(data.entries || []);
            setLogsUpdated(data.updated_at || '');
        } catch (err) {
            setLogs([err.message]);
        }
    };

    const clearLogs = async () => {
        Swal.fire({
            title: 'Hapus Log?',
            text: 'Apakah Anda yakin ingin menghapus seluruh log?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#E02424',
            cancelButtonColor: '#718096',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await requestJson(route('maintenance.logs.clear'), { method: 'POST' });
                    setLogs([]);
                    setLogsUpdated('');
                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil',
                        text: res.message || 'Log dikosongkan',
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                } catch (err) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: err.message,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            }
        });
    };

    const handleUpdateApp = async () => {
        Swal.fire({
            title: 'Update Aplikasi?',
            text: "Pastikan tidak ada perubahan lokal yang belum tersimpan.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Update!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                setShowUpdateModal(true);
                setUpdateStatus('loading');
                setUpdateMessage('Sedang melakukan update aplikasi...');
                setUpdateOutput('');

                try {
                    const res = await requestJson(route('maintenance.update-app'), { method: 'POST' });
                    setUpdateStatus('success');
                    setUpdateMessage(res.message || 'Aplikasi berhasil diupdate.');
                    setUpdateOutput(res.output || '');
                } catch (err) {
                    setUpdateStatus('error');
                    setUpdateMessage(err.message || 'Gagal melakukan update.');
                    if (err.data && err.data.output) {
                        setUpdateOutput(err.data.output);
                    }
                }
            }
        });
    };

    const closeUpdateModal = () => {
        if (updateStatus === 'loading') return;
        setShowUpdateModal(false);
        if (updateStatus === 'success') {
            window.location.reload();
        }
    };

    const togglePermission = async (role, permission, currentStatus) => {
        if (role === 'superadmin') return;

        Swal.fire({
            title: currentStatus ? 'Cabut Izin?' : 'Berikan Izin?',
            text: `${currentStatus ? 'Menonaktifkan' : 'Mengaktifkan'} izin '${permission}' untuk role '${role}'.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: currentStatus ? '#d33' : '#10b981',
            cancelButtonColor: '#718096',
            confirmButtonText: 'Ya, Ubah!',
            cancelButtonText: 'Batal'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await requestJson(route('maintenance.update-permission'), {
                        method: 'POST',
                        body: JSON.stringify({
                            role: role,
                            permission: permission,
                            allowed: !currentStatus
                        }),
                    });

                    if (res.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Berhasil',
                            text: res.message,
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 2000
                        }).then(() => {
                            window.location.reload();
                        });
                    }
                } catch (err) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal',
                        text: err.message,
                        toast: true,
                        position: 'top-end',
                        showConfirmButton: false,
                        timer: 3000
                    });
                }
            }
        });
    };

    useEffect(() => {
        fetchLogs();
    }, [logLevel, logLines]);


    return (
        <MainLayout>
            <Head title="Maintenance" />
            <div className="min-h-screen bg-gray-100 py-6 px-4">
                <div className="w-full space-y-6">

                    {alert && (
                        <div className={`px-4 py-3 rounded border ${alert.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                            {alert.message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-blue-50 rounded-xl shadow p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Konfigurasi Maintenance</h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusActive ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
                                    {statusActive ? 'AKTIF' : 'NONAKTIF'}
                                </span>
                            </div>
                            <div className="space-y-4">
                                <textarea
                                    rows="4"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                    value={data.maintenance_message}
                                    onChange={(e) => setData('maintenance_message', e.target.value)}
                                    placeholder="Pesan maintenance"
                                />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        type="datetime-local"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        value={data.maintenance_start}
                                        onChange={(e) => setData('maintenance_start', e.target.value)}
                                    />
                                    <input
                                        type="datetime-local"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        value={data.maintenance_end}
                                        onChange={(e) => setData('maintenance_end', e.target.value)}
                                    />
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                        value={data.allowed_ips}
                                        onChange={(e) => setData('allowed_ips', e.target.value)}
                                        placeholder="Whitelist IP"
                                    />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={updateSettings}
                                        disabled={processing}
                                        className="px-4 py-2 bg-primary text-white rounded-md"
                                    >
                                        Simpan Perubahan
                                    </button>
                                    {!statusActive ? (
                                        <button type="button" onClick={enableMaintenance} className="px-4 py-2 bg-rose-600 text-white rounded-md">
                                            Aktifkan Mode
                                        </button>
                                    ) : (
                                        <button type="button" onClick={disableMaintenance} className="px-4 py-2 bg-emerald-600 text-white rounded-md">
                                            Matikan Mode
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-purple-50 rounded-xl shadow p-6">
                            <h3 className="text-sm font-semibold text-gray-700 mb-2">Preview Pesan</h3>
                            <div className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4 text-sm">
                                {data.maintenance_message || 'Kami sedang melakukan pemeliharaan sistem.'}
                                {data.maintenance_start && (
                                    <div className="mt-2 text-xs">
                                        Mulai: {data.maintenance_start}
                                    </div>
                                )}
                                {data.maintenance_end && (
                                    <div className="text-xs">Selesai: {data.maintenance_end}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-50 rounded-xl shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload APK Android</h3>
                        <form onSubmit={uploadApk} className="flex flex-wrap items-center gap-3">
                            <input type="file" accept=".apk" onChange={(e) => setApkForm('app_apk', e.target.files[0])} />
                            <button type="submit" className="px-4 py-2 bg-secondary text-white rounded-md" disabled={apkProcessing}>
                                Upload
                            </button>
                        </form>
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {apkList.length === 0 && <p className="text-sm text-gray-500">Belum ada APK.</p>}
                            {apkList.map((apk) => (
                                <div key={apk.name} className="border rounded-lg p-3 flex items-center justify-between">
                                    <div>
                                        <div className="font-semibold text-gray-800">v{apk.version}</div>
                                        <div className="text-xs text-gray-500">{apk.name}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={`/${apk.path}`} className="text-sm text-secondary" download>
                                            Download
                                        </a>
                                        <button type="button" onClick={() => deleteApk(apk.name)} className="text-sm text-red-600">
                                            Hapus
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-orange-50 rounded-xl shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Tools</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <button onClick={handleUpdateApp} className="px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded hover:bg-emerald-100 font-medium col-span-2 md:col-span-1">Update App (Git Pull)</button>
                            <button onClick={() => runArtisan(route('maintenance.artisan.migrate'))} className="px-3 py-2 bg-gray-100 rounded">Migrate</button>
                            <button onClick={() => runArtisan(route('maintenance.artisan.seed'))} className="px-3 py-2 bg-gray-100 rounded">Seed</button>
                            <button onClick={() => runArtisan(route('maintenance.artisan.optimize-clear'))} className="px-3 py-2 bg-gray-100 rounded">Optimize Clear</button>
                            <button onClick={() => runArtisan(route('maintenance.artisan.cache-clear'))} className="px-3 py-2 bg-gray-100 rounded">Cache Clear</button>
                            <button onClick={() => runArtisan(route('maintenance.artisan.config-clear'))} className="px-3 py-2 bg-gray-100 rounded">Config Clear</button>
                            <button onClick={() => runArtisan(route('maintenance.artisan.route-clear'))} className="px-3 py-2 bg-gray-100 rounded">Route Clear</button>
                            <button onClick={() => runArtisan(route('maintenance.artisan.view-clear'))} className="px-3 py-2 bg-gray-100 rounded">View Clear</button>
                            <button onClick={() => runArtisan(route('maintenance.cleanup-storage'))} className="px-3 py-2 bg-gray-100 rounded">Cleanup Runtime</button>
                            <button onClick={handleCleanupFiles} className="px-3 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded hover:bg-rose-100 font-medium font-bold">Bersihkan File</button>
                            <button onClick={() => runArtisan(route('maintenance.cleanup-clockwork'))} className="px-3 py-2 bg-gray-100 rounded">Clean Clockwork</button>
                            <button onClick={clearBrowserCache} className="px-3 py-2 bg-yellow-50 text-yellow-600 border border-yellow-200 rounded hover:bg-yellow-100">Clean Browser Cache</button>
                            <button onClick={() => runArtisan(route('maintenance.artisan.clear-all'))} className="px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded hover:bg-red-100">Clear All</button>
                            <button onClick={() => runArtisan(route('maintenance.npm-run-build'))} className="px-3 py-2 bg-blue-50 text-secondary border border-blue-200 rounded hover:bg-secondary/10">NPM Run Build</button>
                        </div>
                        {artisanOutput && (
                            <pre className="mt-4 p-3 bg-gray-50 border rounded text-xs overflow-auto">{artisanOutput}</pre>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow p-6 overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Laporan Izin Akses (Permission Matrix)</h3>
                            <span className="text-xs text-gray-500">Menampilkan hak akses per tipe user</span>
                        </div>

                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Permission / Object
                                        </th>
                                        {roles.map(role => (
                                            <th key={role} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {role.toUpperCase()}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {permissionMatrix.length === 0 ? (
                                        <tr>
                                            <td colSpan={roles.length + 1} className="px-6 py-4 text-center text-gray-500">
                                                Data permission tidak tersedia
                                            </td>
                                        </tr>
                                    ) : (
                                        permissionMatrix.map((row, idx) => (
                                            <tr key={row.permission} className={idx % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                                                <td className="px-6 py-2 whitespace-nowrap font-mono text-gray-700 text-xs">
                                                    {row.permission}
                                                </td>
                                                {roles.map(role => (
                                                    <td
                                                        key={role}
                                                        className={`px-6 py-2 whitespace-nowrap text-center ${role !== 'superadmin' ? 'cursor-pointer hover:bg-gray-100' : 'cursor-not-allowed opacity-50'}`}
                                                        onClick={() => togglePermission(role, row.permission, row[role])}
                                                        title={role === 'superadmin' ? 'Superadmin permissions cannot be changed' : 'Click to toggle permission'}
                                                    >
                                                        {row[role] ? (
                                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-600">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-100 text-rose-600">
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            </span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl shadow p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-lg font-semibold text-gray-900">Log Aplikasi</h3>
                            <div className="flex gap-2">
                                <button type="button" onClick={fetchLogs} className="px-3 py-1.5 bg-gray-700 text-white rounded text-sm">
                                    Refresh
                                </button>
                                <a href={route('maintenance.logs.download')} className="px-3 py-1.5 bg-primary text-white rounded text-sm">
                                    Download
                                </a>
                                <button type="button" onClick={clearLogs} className="px-3 py-1.5 bg-rose-600 text-white rounded text-sm">
                                    Clear
                                </button>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3 mb-3">
                            <select value={logLevel} onChange={(e) => setLogLevel(e.target.value)} className="border rounded px-3 py-2 text-sm">
                                <option value="">Semua</option>
                                <option value="error">Error</option>
                                <option value="warning">Warning</option>
                                <option value="info">Info</option>
                                <option value="debug">Debug</option>
                            </select>
                            <input
                                type="number"
                                min="50"
                                max="2000"
                                step="50"
                                value={logLines}
                                onChange={(e) => setLogLines(Number(e.target.value))}
                                className="border rounded px-3 py-2 text-sm w-28"
                            />
                            <span className="text-xs text-gray-500">{logsUpdated && `Update: ${logsUpdated}`}</span>
                        </div>
                        <pre className="p-3 bg-gray-50 border rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                            {logs.join('\n')}
                        </pre>
                    </div>
                </div>
            </div>

            {/* Update App Modal */}
            <Modal show={showUpdateModal} onClose={closeUpdateModal} maxWidth="md">
                <div className="p-6 text-center">
                    {updateStatus === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-8">
                            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">Sedang Mengupdate Aplikasi...</h3>
                            <p className="text-gray-500 text-sm">Mohon tunggu, proses ini mungkin memakan waktu beberapa saat.</p>
                            <div className="mt-4 px-4 py-2 bg-gray-50 rounded text-xs text-gray-400 font-mono">
                                git pull origin main && php artisan migrate
                            </div>
                        </div>
                    )}

                    {updateStatus === 'success' && (
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Update Berhasil!</h3>
                            <p className="text-gray-600 mb-6">Silahkan akses aplikasi baru Anda.</p>

                            {updateOutput && (
                                <details className="w-full text-left mb-6 border rounded-lg overflow-hidden">
                                    <summary className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-100">
                                        Lihat Log Detail
                                    </summary>
                                    <pre className="p-4 bg-gray-900 text-gray-100 text-xs overflow-auto max-h-48 whitespace-pre-wrap font-mono">
                                        {updateOutput}
                                    </pre>
                                </details>
                            )}

                            <button
                                onClick={closeUpdateModal}
                                className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700 transition-colors w-full"
                            >
                                Akses Aplikasi Baru
                            </button>
                        </div>
                    )}

                    {updateStatus === 'error' && (
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Update Gagal</h3>
                            <p className="text-red-600 mb-6">{updateMessage}</p>

                            <button
                                onClick={closeUpdateModal}
                                className="px-6 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    )}
                </div>
            </Modal>
        </MainLayout>
    );
}

