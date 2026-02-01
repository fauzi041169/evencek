import React from 'react';
import { Head } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import FinanceNav from './FinanceNav';

export default function FinanceContainer({ title, stats, children, withNav = true }) {
    return (
        <MainLayout title="Keuangan Sistem">
            <Head title={title} />
            <div className="min-h-screen bg-white py-3 sm:py-6 px-2 sm:px-4">
                <div className="max-w-full mx-auto">
                    {stats && (
                        <div className="mb-6">
                            {stats}
                        </div>
                    )}

                    {withNav && <FinanceNav />}

                    <div className={`bg-white shadow-xl overflow-hidden border border-gray-200 p-0 ${withNav ? 'rounded-b-xl' : 'rounded-xl'}`}>
                        {children}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
