import React from 'react';
import { Head, Link } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';

export default function Edit({ payment }) {
    return (
        <MainLayout>
            <Head title="Edit Pembayaran" />
            <div className="min-h-screen bg-white py-6 px-4">
                <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Edit Pembayaran</h2>
                        <Link href={route('payments.index')} className="text-sm text-secondary">
                            Kembali
                        </Link>
                    </div>
                    <p className="text-sm text-gray-600">
                        Halaman edit pembayaran sedang dalam migrasi. Detail pembayaran:
                    </p>
                    <pre className="mt-4 bg-gray-50 border rounded p-3 text-xs overflow-x-auto">
                        {JSON.stringify(payment, null, 2)}
                    </pre>
                </div>
            </div>
        </MainLayout>
    );
}

