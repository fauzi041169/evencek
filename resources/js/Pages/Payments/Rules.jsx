import React, { useState } from 'react';
import { Head, usePage, router } from '@inertiajs/react';
import FinanceContainer from '@/Components/Finance/FinanceContainer';

export default function Rules({ settings, financial, vouchers = [], activities = [], specialOverrides = {}, subscription_service_enabled }) {
    const { flash } = usePage().props;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
    const [subscriptionEnabled, setSubscriptionEnabled] = useState(subscription_service_enabled === '1');

    const handleSubscriptionToggle = () => {
        const next = !subscriptionEnabled;
        setSubscriptionEnabled(next);
        router.post(route('payments.rules.subscription.visibility'), { enabled: next ? '1' : '0' }, { preserveScroll: true });
    };

    return (
        <FinanceContainer title="Aturan Keuangan">
            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white rounded-lg border shadow-sm">
                            <div className="px-6 py-4 border-b">
                                <h5 className="text-gray-900 font-semibold flex items-center">
                                    <i className="fas fa-sliders-h mr-2 text-secondary"></i> Biaya Admin
                                </h5>
                            </div>
                            <div className="p-6">
                                <form method="post" action={route('payments.rules.store')}>
                                    <input type="hidden" name="_token" value={csrfToken} />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Fee (%)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                max="100"
                                                name="admin_fee_percent"
                                                defaultValue={financial?.admin_fee_percent ?? 0}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Auto Fixed Deduction</label>
                                            <input
                                                type="number"
                                                min="0"
                                                name="auto_fixed_deduction"
                                                defaultValue={financial?.auto_fixed_deduction ?? 0}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Min Auto Price</label>
                                            <input
                                                type="number"
                                                min="0"
                                                name="min_auto_price"
                                                defaultValue={financial?.min_auto_price ?? 0}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <button type="submit" className="px-4 py-2 bg-secondary text-white rounded-md">
                                            Simpan
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>

                        <div className="bg-white rounded-lg border shadow-sm">
                            <div className="px-6 py-4 border-b">
                                <h5 className="text-gray-900 font-semibold flex items-center">
                                    <i className="fas fa-toggle-on mr-2 text-emerald-600"></i> Visibilitas Langganan
                                </h5>
                            </div>
                            <div className="p-6 flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-gray-600">Menu langganan aktif</div>
                                    <div className="text-base font-semibold">{subscriptionEnabled ? 'Aktif' : 'Nonaktif'}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSubscriptionToggle}
                                    className={`px-4 py-2 rounded-md ${subscriptionEnabled ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                                >
                                    {subscriptionEnabled ? 'Matikan' : 'Aktifkan'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 bg-white rounded-lg border shadow-sm">
                        <div className="px-6 py-4 border-b">
                            <h5 className="text-gray-900 font-semibold flex items-center">
                                <i className="fas fa-ticket-alt mr-2 text-pink-600"></i> Voucher Diskon
                            </h5>
                        </div>
                        <div className="p-6">
                            <form method="post" action={route('payments.rules.vouchers.create')} className="grid grid-cols-1 md:grid-cols-7 gap-3 mb-4">
                                <input type="hidden" name="_token" value={csrfToken} />
                                <input name="code" placeholder="Kode" className="px-3 py-2 border rounded-md" required />
                                <select name="type" className="px-3 py-2 border rounded-md" required>
                                    <option value="percent">Percent</option>
                                    <option value="fixed">Fixed</option>
                                </select>
                                <input name="amount" type="number" min="1" placeholder="Nilai" className="px-3 py-2 border rounded-md" required />
                                <select name="applicable" className="px-3 py-2 border rounded-md" required>
                                    <option value="activity">Kegiatan</option>
                                    <option value="subscription">Langganan</option>
                                    <option value="both">Keduanya</option>
                                </select>
                                <input name="start_date" type="date" className="px-3 py-2 border rounded-md" />
                                <input name="end_date" type="date" className="px-3 py-2 border rounded-md" />
                                <input name="max_uses" type="number" min="1" placeholder="Max" className="px-3 py-2 border rounded-md" />
                                <label className="flex items-center gap-2 text-sm">
                                    <input name="is_active" type="checkbox" defaultChecked /> Aktif
                                </label>
                                <button type="submit" className="px-3 py-2 bg-pink-600 text-white rounded-md">
                                    Buat
                                </button>
                            </form>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-3 py-2 text-left uppercase text-xs">Kode</th>
                                            <th className="px-3 py-2 text-left uppercase text-xs">Tipe</th>
                                            <th className="px-3 py-2 text-left uppercase text-xs">Nilai</th>
                                            <th className="px-3 py-2 text-left uppercase text-xs">Berlaku</th>
                                            <th className="px-3 py-2 text-left uppercase text-xs">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {vouchers.length > 0 ? (
                                            vouchers.map((v) => (
                                                <tr key={v.code}>
                                                    <td className="px-3 py-2 font-semibold">{v.code}</td>
                                                    <td className="px-3 py-2">{v.type === 'percent' ? 'Persen' : 'Nominal'}</td>
                                                    <td className="px-3 py-2">
                                                        {v.type === 'percent' ? `${v.amount}%` : `Rp ${Number(v.amount || 0).toLocaleString('id-ID')}`}
                                                    </td>
                                                    <td className="px-3 py-2">{v.applicable || '-'}</td>
                                                    <td className="px-3 py-2">{v.is_active ? 'Aktif' : 'Nonaktif'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="px-3 py-6 text-center text-gray-500">
                                                    Belum ada voucher.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 bg-white rounded-lg border shadow-sm">
                        <div className="px-6 py-4 border-b">
                            <h5 className="text-gray-900 font-semibold flex items-center">
                                <i className="fas fa-bolt mr-2 text-orange-500"></i> Override Biaya Otomatis
                            </h5>
                        </div>
                        <div className="p-6">
                            <form method="post" action={route('payments.rules.auto-override.save')} className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                                <input type="hidden" name="_token" value={csrfToken} />
                                <select name="activity_id" className="px-3 py-2 border rounded-md" required>
                                    <option value="">Pilih Kegiatan</option>
                                    {activities.map((act) => (
                                        <option key={act.id} value={act.id}>
                                            {act.name || `#${act.id}`}
                                        </option>
                                    ))}
                                </select>
                                <select name="type" className="px-3 py-2 border rounded-md">
                                    <option value="fixed">Fixed</option>
                                    <option value="percent">Percent</option>
                                </select>
                                <input name="amount" type="number" min="0" placeholder="Nilai" className="px-3 py-2 border rounded-md" />
                                <button type="submit" className="px-3 py-2 bg-orange-500 text-white rounded-md">
                                    Simpan
                                </button>
                            </form>

                            <div className="space-y-2">
                                {Object.keys(specialOverrides || {}).length === 0 ? (
                                    <p className="text-sm text-gray-500">Belum ada override khusus.</p>
                                ) : (
                                    Object.entries(specialOverrides).map(([activityId, rule]) => (
                                        <div key={activityId} className="flex items-center justify-between border rounded-md px-3 py-2">
                                            <div className="text-sm text-gray-700">
                                                Activity #{activityId} â€¢ {rule.type} â€¢ {rule.amount}
                                            </div>
                                            <form method="post" action={route('payments.rules.auto-override.delete', activityId)}>
                                                <input type="hidden" name="_token" value={csrfToken} />
                                                <input type="hidden" name="_method" value="DELETE" />
                                                <button type="submit" className="text-xs text-red-600">
                                                    Hapus
                                                </button>
                                            </form>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
        </FinanceContainer>
    );
}

