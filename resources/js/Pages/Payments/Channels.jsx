import React, { useMemo, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

const typeLabels = {
    bank_transfer: 'Bank Transfer (Virtual Account)',
    e_wallet: 'E-Wallet / QRIS',
    cstore: 'Convenience Store',
    cardless_credit: 'Cicilan Tanpa Kartu',
    credit_card: 'Kartu Kredit / Debit',
    other: 'Lainnya',
};

export default function Channels({ channels = [] }) {
    const { flash } = usePage().props;
    const [items, setItems] = useState(channels);

    const grouped = useMemo(() => {
        const map = {};
        items.forEach((ch) => {
            const key = ch.type || 'other';
            if (!map[key]) {
                map[key] = [];
            }
            map[key].push(ch);
        });
        return map;
    }, [items]);

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

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
        if (!res.ok) {
            throw new Error('Gagal memperbarui channel');
        }
        return res.json();
    };

    const toggleChannel = async (id) => {
        const res = await fetch(route('payments.channels.toggle', id), {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': csrfToken,
                Accept: 'application/json',
            },
        });
        if (!res.ok) {
            throw new Error('Gagal memperbarui status channel');
        }
        return res.json();
    };

    const handleToggle = async (channel) => {
        const next = items.map((item) => (item.id === channel.id ? { ...item, is_active: !item.is_active } : item));
        setItems(next);
        try {
            const data = await toggleChannel(channel.id);
            if (!data?.success) {
                throw new Error(data?.message || 'Gagal memperbarui status');
            }
        } catch (err) {
            setItems(items);
            alert(err.message);
        }
    };

    const handleFeeChange = (channel, field, value) => {
        setItems((prev) =>
            prev.map((item) => (item.id === channel.id ? { ...item, [field]: value } : item))
        );
    };

    const handleFeeSave = async (channel) => {
        try {
            const payload = { fee: channel.fee ?? 0, fee_type: channel.fee_type || 'fixed' };
            const data = await updateChannel(channel.id, payload);
            if (!data?.success) {
                throw new Error(data?.message || 'Gagal menyimpan');
            }
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <MainLayout>
            <Head title="Manajemen Channel Pembayaran" />
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-6xl mx-auto px-4">
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
                            <form
                                action={route('payments.channels.sync')}
                                method="post"
                                onSubmit={(e) => {
                                    if (!window.confirm('Apakah Anda yakin ingin mereset/sinkronisasi data channel?')) {
                                        e.preventDefault();
                                    }
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

                        <div className="p-6 space-y-6">
                            {Object.keys(grouped).length === 0 ? (
                                <p className="text-sm text-gray-500">Tidak ada channel tersedia.</p>
                            ) : (
                                Object.entries(grouped).map(([type, list]) => (
                                    <div key={type} className="border rounded-lg overflow-hidden">
                                        <div className="bg-gray-100 px-4 py-3 text-sm font-semibold text-gray-700">
                                            {typeLabels[type] || type}
                                        </div>
                                        <div className="divide-y divide-gray-200">
                                            {list.map((channel) => (
                                                <div key={channel.id} className="px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-lg bg-gray-50 border flex items-center justify-center">
                                                            {channel.icon_url ? (
                                                                <img src={channel.icon_url} alt={channel.name} className="h-8 w-8 object-contain" />
                                                            ) : (
                                                                <i className="fas fa-university text-gray-400"></i>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-gray-900">{channel.name}</div>
                                                            <div className="text-xs text-gray-500 font-mono">{channel.code}</div>
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <select
                                                            className="text-xs border-gray-300 rounded-md"
                                                            value={channel.fee_type || 'fixed'}
                                                            onChange={(e) => handleFeeChange(channel, 'fee_type', e.target.value)}
                                                        >
                                                            <option value="fixed">Rp</option>
                                                            <option value="percent">%</option>
                                                        </select>
                                                        <input
                                                            type="number"
                                                            className="w-24 text-sm border-gray-300 rounded-md"
                                                            value={channel.fee ?? 0}
                                                            min="0"
                                                            onChange={(e) => handleFeeChange(channel, 'fee', e.target.value)}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleFeeSave(channel)}
                                                            className="px-3 py-1.5 text-xs rounded-md bg-secondary text-white hover:bg-blue-700"
                                                        >
                                                            Simpan
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggle(channel)}
                                                            className={`px-3 py-1.5 text-xs rounded-md ${channel.is_active ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                                                        >
                                                            {channel.is_active ? 'Aktif' : 'Nonaktif'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}

