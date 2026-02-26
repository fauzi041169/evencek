import React, { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Swal from 'sweetalert2';
import axios from 'axios';

export default function BlockedRegionsSection({ activity, blockedRegions = [], provinces = [] }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ province_id: '', regency_id: '', district_id: '', keterangan: '' });
    const [regencies, setRegencies] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [loadingRegencies, setLoadingRegencies] = useState(false);
    const [loadingDistricts, setLoadingDistricts] = useState(false);
    const [saving, setSaving] = useState(false);

    const activityId = activity?.uid || activity?.id;

    useEffect(() => {
        if (!form.province_id) {
            setRegencies([]);
            setDistricts([]);
            setForm(f => ({ ...f, regency_id: '', district_id: '' }));
            return;
        }
        setLoadingRegencies(true);
        axios.get(route('region.regencies', form.province_id))
            .then(res => {
                setRegencies(res.data?.data ?? res.data ?? []);
                setForm(f => ({ ...f, regency_id: '', district_id: '' }));
                setDistricts([]);
            })
            .catch(() => setRegencies([]))
            .finally(() => setLoadingRegencies(false));
    }, [form.province_id]);

    useEffect(() => {
        if (!form.regency_id) {
            setDistricts([]);
            setForm(f => ({ ...f, district_id: '' }));
            return;
        }
        setLoadingDistricts(true);
        axios.get(route('region.districts', form.regency_id))
            .then(res => {
                setDistricts(res.data?.data ?? res.data ?? []);
                setForm(f => ({ ...f, district_id: '' }));
            })
            .catch(() => setDistricts([]))
            .finally(() => setLoadingDistricts(false));
    }, [form.regency_id]);

    const openModal = () => {
        setForm({ province_id: '', regency_id: '', district_id: '', keterangan: '' });
        setRegencies([]);
        setDistricts([]);
        setIsModalOpen(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.province_id) return;
        setSaving(true);
        router.post(route('activity.preparation.blocked-regions.store', activityId), {
            province_id: form.province_id,
            regency_id: form.regency_id || null,
            district_id: form.district_id || null,
            keterangan: form.keterangan?.trim() || null,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setSaving(false);
                setIsModalOpen(false);
                Swal.fire({ title: 'Berhasil', text: 'Daerah blokir ditambahkan.', icon: 'success', timer: 1500, showConfirmButton: false });
            },
            onError: () => setSaving(false),
        });
    };

    const handleDelete = (blocked) => {
        Swal.fire({
            title: 'Hapus aturan blokir?',
            text: `${blocked.province?.name || '-'}${blocked.regency ? ' - ' + blocked.regency.name : ''}${blocked.district ? ' - ' + blocked.district.name : ''}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus',
        }).then((result) => {
            if (result.isConfirmed) {
                router.delete(route('activity.preparation.blocked-regions.destroy', { activityId, blockedRegionId: blocked.id }), {
                    preserveScroll: true,
                    onSuccess: () => Swal.fire('Terhapus', 'Daerah blokir dihapus.', 'success'),
                });
            }
        });
    };

    const label = (blocked) => {
        const p = blocked.province?.name || 'Provinsi';
        const r = blocked.regency?.name;
        const d = blocked.district?.name;
        if (d) return `${p} - ${r} - ${d}`;
        if (r) return `${p} - ${r}`;
        return p;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md duration-300">
            <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Daerah yang Tidak Boleh Daftar</h3>
                        <p className="text-sm text-gray-500 font-medium italic mt-1">Blokir pendaftaran berdasarkan provinsi, kabupaten/kota, atau kecamatan</p>
                    </div>
                    <button
                        type="button"
                        onClick={openModal}
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-amber-500 text-white font-bold text-sm shadow-lg hover:bg-amber-600 transition-all active:scale-95"
                    >
                        <i className="fas fa-ban mr-2"></i>
                        Tambah Daerah Blokir
                    </button>
                </div>

                {blockedRegions.length === 0 ? (
                    <div className="text-center py-8 rounded-xl bg-gray-50 border border-dashed border-gray-200">
                        <i className="fas fa-map-marker-alt text-4xl text-gray-300 mb-3"></i>
                        <p className="text-gray-500 font-medium">Belum ada daerah yang diblokir</p>
                        <p className="text-sm text-gray-400 mt-1">User dari daerah yang ditambahkan di sini tidak dapat mendaftar kegiatan ini.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {blockedRegions.map((blocked) => (
                            <div key={blocked.id} className="flex items-start justify-between gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 group">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-800 truncate" title={label(blocked)}>
                                        <i className="fas fa-lock text-amber-500 mr-1.5 text-xs"></i>
                                        {label(blocked)}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        {blocked.district_id ? 'Kecamatan' : blocked.regency_id ? 'Kab/Kota' : 'Seluruh provinsi'}
                                    </p>
                                    {blocked.keterangan && (
                                        <p className="text-xs text-amber-700 mt-1.5 line-clamp-2" title={blocked.keterangan}>
                                            <i className="fas fa-comment-alt text-amber-500/70 mr-1"></i>
                                            {blocked.keterangan}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(blocked)}
                                    className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                    title="Hapus"
                                >
                                    <i className="fas fa-trash-alt text-xs"></i>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Tambah Daerah Blokir */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !saving && setIsModalOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Tambah Daerah Blokir</h3>
                        <p className="text-sm text-gray-500 mb-4">User dari daerah yang dipilih tidak dapat mendaftar kegiatan ini.</p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Provinsi <span className="text-red-500">*</span></label>
                                <select
                                    value={form.province_id}
                                    onChange={e => setForm(f => ({ ...f, province_id: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    required
                                >
                                    <option value="">Pilih Provinsi</option>
                                    {(provinces || []).map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Kabupaten/Kota (opsional)</label>
                                <select
                                    value={form.regency_id}
                                    onChange={e => setForm(f => ({ ...f, regency_id: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    disabled={!form.province_id || loadingRegencies}
                                >
                                    <option value="">Semua kab/kota</option>
                                    {regencies.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Kecamatan (opsional)</label>
                                <select
                                    value={form.district_id}
                                    onChange={e => setForm(f => ({ ...f, district_id: e.target.value }))}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    disabled={!form.regency_id || loadingDistricts}
                                >
                                    <option value="">Semua kecamatan</option>
                                    {districts.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Keterangan / Alasan blok (tampil ke user saat diblok)</label>
                                <textarea
                                    value={form.keterangan}
                                    onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
                                    placeholder="Contoh: Kuota peserta dari daerah ini sudah terpenuhi. Hubungi panitia untuk informasi."
                                    rows={3}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-gray-800 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                    maxLength={2000}
                                />
                                <p className="text-xs text-gray-500 mt-0.5">Teks ini akan ditampilkan ke user ketika pendaftaran mereka diblokir.</p>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50"
                                    disabled={saving}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 disabled:opacity-50"
                                    disabled={saving || !form.province_id}
                                >
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
