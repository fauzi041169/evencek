import React, { useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import FinanceContainer from '@/Components/Finance/FinanceContainer';
import Swal from 'sweetalert2';

export const typeLabels = {
    bank_transfer: 'Bank Transfer (Virtual Account)',
    e_wallet: 'E-Wallet / QRIS',
    cstore: 'Convenience Store',
    cardless_credit: 'Cicilan Tanpa Kartu',
    credit_card: 'Kartu Kredit / Debit',
    other: 'Lainnya',
};

export function ChannelList({
    channels = [],
    setItems = () => {},
    isSelectionMode = false,
    onSelect = null,
    selectedId = null,
    manualMethods = [] // For selecting manual banks in the same list
}) {
    const items = channels;
    const csrfToken = typeof document !== 'undefined' ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') : '';

    const grouped = useMemo(() => {
        const map = {};
        // Midtrans Channels
        items.forEach((ch) => {
            const key = ch.type || 'other';
            if (!map[key]) map[key] = [];
            map[key].push({ ...ch, is_manual: false });
        });
        // Inject Manual Methods into bank_transfer or separate
        if (manualMethods.length > 0) {
            const key = 'bank_transfer';
            if (!map[key]) map[key] = [];
            manualMethods.forEach(m => {
                map[key].push({ ...m, is_manual: true, type: 'bank_transfer' });
            });
        }
        return map;
    }, [items, manualMethods]);

    const updateChannel = async (id, payload) => {
        const res = await fetch(route('payments.channels.update', id), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Gagal memperbarui channel');
        return res.json();
    };

    const toggleChannel = async (id) => {
        const res = await fetch(route('payments.channels.toggle', id), {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrfToken, Accept: 'application/json' },
        });
        if (!res.ok) throw new Error('Gagal memperbarui status channel');
        return res.json();
    };

    const handleToggle = async (channel) => {
        const next = items.map((item) => (item.id === channel.id ? { ...item, is_active: !item.is_active } : item));
        setItems(next);
        try {
            const data = await toggleChannel(channel.id);
            if (!data?.success) throw new Error(data?.message || 'Gagal memperbarui status');
        } catch (err) {
            setItems(items);
            Swal.fire({ title: 'Gagal', text: err.message, icon: 'error', confirmButtonColor: '#E02424' });
        }
    };

    const handleFeeChange = (channel, field, value) => {
        setItems((prev) => prev.map((item) => (item.id === channel.id ? { ...item, [field]: value } : item)));
    };

    const handleFeeSave = async (channel) => {
        try {
            const payload = { fee: channel.fee ?? 0, fee_type: channel.fee_type || 'fixed' };
            const data = await updateChannel(channel.id, payload);
            if (!data?.success) throw new Error(data?.message || 'Gagal menyimpan');
        } catch (err) {
            Swal.fire({ title: 'Gagal', text: err.message, icon: 'error', confirmButtonColor: '#E02424' });
        }
    };

    const saveAll = async (original) => {
        const changes = [];
        items.forEach((item) => {
            const prev = original.find((c) => c.id === item.id);
            if (!prev) return;
            const feeChanged = Number(prev.fee ?? 0) !== Number(item.fee ?? 0);
            const typeChanged = (prev.fee_type || 'fixed') !== (item.fee_type || 'fixed');
            if (feeChanged || typeChanged) {
                changes.push({ id: item.id, payload: { fee: item.fee ?? 0, fee_type: item.fee_type || 'fixed' } });
            }
        });
        if (changes.length === 0) {
            Swal.fire({ title: 'Tidak ada perubahan', text: 'Semua pengaturan sudah tersimpan.', icon: 'info', confirmButtonColor: '#2563eb' });
            return;
        }
        let ok = 0;
        let fail = 0;
        for (const ch of changes) {
            try {
                const data = await updateChannel(ch.id, ch.payload);
                if (data?.success) ok++; else fail++;
            } catch (e) {
                fail++;
            }
        }
        if (fail === 0) {
            Swal.fire({ title: 'Berhasil', text: `Tersimpan ${ok} perubahan.`, icon: 'success', confirmButtonColor: '#16a34a' });
        } else {
            Swal.fire({ title: 'Sebagian gagal', text: `Berhasil ${ok}, gagal ${fail}.`, icon: 'warning', confirmButtonColor: '#eab308' });
        }
    };

    return (
        <div className="space-y-8">
            {Object.keys(grouped).length === 0 ? (
                <p className="text-sm text-gray-500">Tidak ada channel tersedia.</p>
            ) : (
                Object.entries(grouped).map(([type, list]) => (
                    <div key={type} className="space-y-4">
                        {/* Category Header matching image: Gray, Uppercase, Tracking-widest */}
                        <div className="flex items-center gap-4 px-1">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] whitespace-nowrap">
                                {typeLabels[type] || type}
                            </p>
                            <div className="h-px bg-gray-100 flex-1"></div>
                        </div>

                        {/* Grid 2 Columns matching image */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {list.map((channel) => (
                                <div
                                    key={channel.is_manual ? `manual-${channel.id}` : channel.code}
                                    onClick={() => isSelectionMode && onSelect && onSelect(channel)}
                                    className={`group relative flex flex-col p-4 bg-white border border-gray-100 rounded-2xl transition-all duration-300 ${isSelectionMode
                                            ? 'cursor-pointer hover:border-secondary hover:shadow-lg hover:-translate-y-0.5'
                                            : 'shadow-sm'
                                        } ${selectedId === (channel.is_manual ? channel.id : channel.code) ? 'border-secondary ring-2 ring-secondary/10 bg-blue-50/30' : ''}`}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Logo Box - Styled to match image proportions */}
                                        <div className="w-20 h-14 bg-white rounded-xl flex items-center justify-center p-2 shrink-0 border border-transparent group-hover:border-gray-50 transition-colors">
                                            {channel.is_manual ? (
                                                <i className="fas fa-university text-orange-400 text-3xl"></i>
                                            ) : channel.icon_url ? (
                                                <img
                                                    src={channel.icon_url.startsWith('http') ? channel.icon_url : `/${channel.icon_url}`}
                                                    alt={channel.name}
                                                    className="max-h-full max-w-full object-contain"
                                                />
                                            ) : (
                                                <i className="fas fa-university text-gray-200 text-3xl"></i>
                                            )}
                                        </div>

                                        {/* Info Box - matching typography from image */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-gray-800 leading-tight">
                                                {channel.name}
                                                {channel.is_manual && <span className="ml-2 text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-black uppercase tracking-tighter">Manual</span>}
                                            </div>
                                            <div className="text-[11px] text-gray-500 mt-1 uppercase font-semibold tracking-wide">
                                                {channel.is_manual ? (
                                                    <span className="text-orange-500">Verifikasi Manual</span>
                                                ) : (
                                                    <span>Biaya: {channel.fee > 0 ? (channel.fee_type === 'percent' ? `${channel.fee}%` : `Rp ${Number(channel.fee).toLocaleString('id-ID')}`) : 'Rp 0'}</span>
                                                )}
                                            </div>
                                        </div>

                                        {isSelectionMode && (
                                            <div className="text-gray-300 group-hover:text-secondary transition-colors">
                                                <i className="fas fa-chevron-right text-xs"></i>
                                            </div>
                                        )}
                                    </div>

                                    {/* Admin Controls - Positioned neatly inside the card */}
                                    {!isSelectionMode && (
                                        <div className="mt-4 pt-4 border-t border-gray-50 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                                    <select
                                                        className="text-[10px] py-1 pl-2 border-none bg-transparent focus:ring-0 cursor-pointer font-bold text-gray-600"
                                                        value={channel.fee_type || 'fixed'}
                                                        onChange={(e) => handleFeeChange(channel, 'fee_type', e.target.value)}
                                                    >
                                                        <option value="fixed">Rp</option>
                                                        <option value="percent">%</option>
                                                    </select>
                                                    <input
                                                        type="number"
                                                        className="w-20 text-[10px] py-1 border-none focus:ring-0 font-bold"
                                                        value={channel.fee ?? 0}
                                                        onChange={(e) => handleFeeChange(channel, 'fee', e.target.value)}
                                                    />
                                                </div>
                                                <button
                                                    onClick={() => handleFeeSave(channel)}
                                                    className="w-8 h-8 flex items-center justify-center bg-secondary text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                                    title="Simpan"
                                                >
                                                    <i className="fas fa-save text-xs"></i>
                                                </button>
                                            </div>

                                            <button
                                                onClick={() => handleToggle(channel)}
                                                className={`px-4 py-1.5 text-[10px] font-black rounded-full transition-all flex items-center gap-2 ${channel.is_active
                                                        ? 'bg-green-50 text-green-600 border border-green-100'
                                                        : 'bg-gray-50 text-gray-400 border border-gray-200'
                                                    }`}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full ${channel.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                                                {channel.is_active ? 'ACTIVE' : 'DISABLED'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

export default function Channels({ channels = [] }) {
    const { flash } = usePage().props;
    const csrfToken = typeof document !== 'undefined' ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') : '';
    const [items, setItems] = useState(channels || []);

    const updateChannel = async (id, payload) => {
        const res = await fetch(route('payments.channels.update', id), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Gagal memperbarui channel');
        return res.json();
    };

    const saveAll = async () => {
        const original = channels || [];
        const changes = [];
        items.forEach((item) => {
            const prev = original.find((c) => c.id === item.id);
            if (!prev) return;
            const feeChanged = Number(prev.fee ?? 0) !== Number(item.fee ?? 0);
            const typeChanged = (prev.fee_type || 'fixed') !== (item.fee_type || 'fixed');
            if (feeChanged || typeChanged) {
                changes.push({ id: item.id, payload: { fee: item.fee ?? 0, fee_type: item.fee_type || 'fixed' } });
            }
        });
        if (changes.length === 0) {
            Swal.fire({ title: 'Tidak ada perubahan', text: 'Semua pengaturan sudah tersimpan.', icon: 'info', confirmButtonColor: '#2563eb' });
            return;
        }
        let ok = 0;
        let fail = 0;
        for (const ch of changes) {
            try {
                const data = await updateChannel(ch.id, ch.payload);
                if (data?.success) ok++; else fail++;
            } catch (e) {
                fail++;
            }
        }
        if (fail === 0) {
            Swal.fire({ title: 'Berhasil', text: `Tersimpan ${ok} perubahan.`, icon: 'success', confirmButtonColor: '#16a34a' });
        } else {
            Swal.fire({ title: 'Sebagian gagal', text: `Berhasil ${ok}, gagal ${fail}.`, icon: 'warning', confirmButtonColor: '#eab308' });
        }
    };
 
    return (
        <FinanceContainer title="Manajemen Channel Pembayaran">
            <Head title="Manajemen Channel Pembayaran" />
            <div className="p-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Channel Pembayaran</h1>
                    <p className="text-sm text-gray-600">Atur metode pembayaran yang tersedia untuk peserta.</p>
                </div>
 
                {flash?.success && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-sm">
                        <p className="text-sm text-green-700">{flash.success}</p>
                    </div>
                )}
 
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-800">Daftar Channel Pembayaran</h2>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={saveAll}
                                className="text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-medium"
                            >
                                <i className="fas fa-save mr-1"></i> Simpan Semua Perubahan
                            </button>
                            <form
                            action={route('payments.channels.sync')}
                            method="post"
                            onSubmit={(e) => {
                                e.preventDefault();
                                Swal.fire({
                                    title: 'Reset & Sinkronisasi?',
                                    text: 'Apakah Anda yakin ingin mereset/sinkronisasi data channel?',
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonColor: '#E02424',
                                    cancelButtonColor: '#718096',
                                    confirmButtonText: 'Ya, Sinkronisasi',
                                    cancelButtonText: 'Batal'
                                }).then((result) => {
                                    if (result.isConfirmed) {
                                        e.target.submit();
                                    }
                                });
                            }}
                        >
                            <input type="hidden" name="_token" value={csrfToken} />
                            <button
                                type="submit"
                                className="text-xs px-3 py-1.5 rounded-lg bg-secondary/10 text-blue-700 hover:bg-blue-200 transition font-medium"
                            >
                                <i className="fas fa-sync-alt mr-1"></i> Reset / Sync Data
                            </button>
                        </form>
                        </div>
                    </div>
 
                    <div className="p-6">
                        <ChannelList channels={items} setItems={setItems} />
                    </div>
                </div>
            </div>
        </FinanceContainer>
    );
}

