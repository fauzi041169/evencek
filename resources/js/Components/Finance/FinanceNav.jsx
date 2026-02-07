import React from 'react';
import { Link } from '@inertiajs/react';

export default function FinanceNav() {
    return (
        <div className="flex flex-wrap gap-2 mb-0 p-1.5 bg-gray-100/50 rounded-t-2xl border-x border-t border-gray-200">
            <Link
                href={route('payments.rules')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('payments.rules') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className={`fas fa-sliders-h transition-transform duration-500 ${route().current('payments.rules') ? 'rotate-180' : ''}`}></i>
                <span>Administrasi</span>
            </Link>
            <Link
                href={route('payments.channels')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('payments.channels') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className="fas fa-credit-card"></i>
                <span>Channel Midtrans</span>
            </Link>
            <Link
                href={route('payments.manage')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('payments.manage') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className={`fas fa-wallet transition-bounce ${route().current('payments.manage') ? 'animate-bounce' : ''}`}></i>
                <span>Kegiatan</span>
            </Link>
            <Link
                href={route('subscriptions.payments.manage')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('subscriptions.payments.manage') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className={`fas fa-file-invoice transition-pulse ${route().current('subscriptions.payments.manage') ? 'animate-pulse' : ''}`}></i>
                <span>Langganan</span>
            </Link>
            <Link
                href={route('payments.admin.withdraw.history')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('payments.admin.withdraw.history') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className="fas fa-money-bill-transfer"></i>
                <span>Penarikan</span>
            </Link>
            <Link
                href={route('payments.ledger')}
                className={`flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${route().current('payments.ledger') ? 'bg-secondary text-white shadow-lg shadow-secondary/30 scale-105' : 'text-gray-600 hover:bg-white hover:text-secondary hover:shadow-md'}`}
            >
                <i className={`fas fa-balance-scale transition-tilt ${route().current('payments.ledger') ? 'rotate-12' : ''}`}></i>
                <span>Neraca</span>
            </Link>
        </div>
    );
}
