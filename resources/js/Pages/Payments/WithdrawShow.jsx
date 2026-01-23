import React from 'react';
import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function WithdrawShow({ withdrawal }) {
    return (
        <MainLayout>
            <Head title="Detail Penarikan" />
            <div className="min-h-screen bg-white py-6 px-4">
                <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Detail Penarikan</h2>
                        <Link href={route('payments.withdraw.history')} className="text-sm text-secondary">
                            Kembali
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <div className="text-gray-500">User</div>
                            <div className="font-medium text-gray-900">{withdrawal?.user?.name || '-'}</div>
                        </div>
                        <div>
                            <div className="text-gray-500">Nominal</div>
                            <div className="font-medium text-gray-900">
                                Rp {Number(withdrawal?.amount || 0).toLocaleString('id-ID')}
                            </div>
                        </div>
                        <div>
                            <div className="text-gray-500">Status</div>
                            <div className="font-medium text-gray-900">{withdrawal?.status || '-'}</div>
                        </div>
                        <div>
                            <div className="text-gray-500">Tanggal</div>
                            <div className="font-medium text-gray-900">{withdrawal?.created_at || '-'}</div>
                        </div>
                    </div>
                    {withdrawal?.notes && (
                        <div className="text-sm">
                            <div className="text-gray-500">Catatan</div>
                            <div className="text-gray-800">{withdrawal.notes}</div>
                        </div>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}

