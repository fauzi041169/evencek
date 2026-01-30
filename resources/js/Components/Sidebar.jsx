import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function Sidebar({ collapsed = false, showProfile = true, auth: propAuth, user: propUser, appSettings: propSettings }) {
    // No hooks except the ones we absolutely need
    const [loggingOut, setLoggingOut] = useState(false);

    // Explicitly derive everything from props for maximum stability in Modals
    const auth = propAuth || { user: null };
    const appSettings = propSettings || {};
    const user = propUser || auth?.user;

    // Safe route helper
    const safeRoute = (name, params) => {
        try {
            if (typeof route !== 'function') return '#';
            return route(name, params);
        } catch (e) {
            return '#';
        }
    };

    if (!user) return (
        <div className="p-10 text-center text-white/50">
            <i className="fas fa-user-slash text-4xl mb-4 block"></i>
            <p>Sesi tidak ditemukan. Silakan login kembali.</p>
        </div>
    );

    const role = (user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'superadmin'].includes(role);
    const isCreator = role === 'creator' || isAdmin;
    const isUser = !!user;

    const NavLink = ({ href, icon, label }) => (
        <li className="mb-1">
            <Link
                href={href}
                className="flex items-center gap-3 px-6 py-3 text-white/70 hover:text-white hover:bg-white/5 transition-all rounded-lg mx-2"
            >
                <i className={`${icon} w-5 text-center`}></i>
                <span className="font-medium">{label}</span>
            </Link>
        </li>
    );

    const MenuSection = ({ title }) => (
        <li className="mt-6 mb-2 px-6">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/20">{title}</h4>
        </li>
    );

    return (
        <div className="w-full flex flex-col pb-20">
            {/* Logo Section */}
            <div className="px-6 py-6 mb-4 flex justify-center border-b border-white/5">
                <div className="text-white font-bold opacity-30 text-[10px]">MENU LOADED OK</div>
            </div>

            {/* Menu Items */}
            <nav className="flex-1">
                <ul className="flex flex-col">
                    {isUser && (
                        <>
                            <MenuSection title="Main" />
                            <NavLink href={safeRoute('dashboard.user')} icon="fas fa-tasks" label="Aktivitas Saya" />
                        </>
                    )}

                    {isCreator && (
                        <NavLink href={safeRoute('dashboard.index')} icon="fas fa-tachometer-alt" label="Dashboard" />
                    )}

                    {isCreator && (
                        <>
                            <MenuSection title="Creator" />
                            <NavLink href={safeRoute('activity.list')} icon="fas fa-clipboard-list" label="Aktivitas" />
                            <NavLink href={safeRoute('news.list')} icon="fas fa-newspaper" label="Berita" />
                            <NavLink href={safeRoute('payments.manage')} icon="fas fa-money-bill-wave" label="Keuangan" />
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <MenuSection title="Admin" />
                            <NavLink href={safeRoute('partners.list')} icon="fas fa-handshake" label="Mitra" />
                            <NavLink href={safeRoute('pengurus.index')} icon="fas fa-user-tie" label="Pengurus" />
                            <NavLink href={safeRoute('user-management.index')} icon="fas fa-users-cog" label="User Management" />
                            <NavLink href={safeRoute('maintenance')} icon="fas fa-wrench" label="Maintenance" />

                            <MenuSection title="Keuangan Aplikasi" />
                            <NavLink href={safeRoute('subscriptions.payments.manage')} icon="fas fa-file-invoice-dollar" label="Langganan" />
                            <NavLink href={safeRoute('payments.manage')} icon="fas fa-wallet" label="Kegiatan" />
                            <NavLink href={safeRoute('payments.rules')} icon="fas fa-sliders-h" label="Administrasi" />
                            <NavLink href={safeRoute('payments.ledger')} icon="fas fa-balance-scale" label="Neraca" />
                        </>
                    )}

                    {showProfile && (
                        <>
                            <MenuSection title="Account" />
                            <NavLink href={safeRoute('profile.show', user.id)} icon="fas fa-user-circle" label="Profil" />
                            <NavLink href={safeRoute('settings.index')} icon="fas fa-cog" label="Settings" />
                        </>
                    )}
                </ul>
            </nav>

            {/* Bottom Button */}
            <div className="p-4 mt-10">
                <Link
                    as="button"
                    method="post"
                    href={safeRoute('logout')}
                    disabled={loggingOut}
                    onClick={() => setLoggingOut(true)}
                    className="w-full py-3 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                    <i className={`fas ${loggingOut ? 'fa-spinner fa-spin' : 'fa-sign-out-alt'}`}></i>
                    <span>Logout</span>
                </Link>
            </div>
        </div>
    );
}
