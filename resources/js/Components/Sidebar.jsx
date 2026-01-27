import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function Sidebar({ collapsed = false }) {
    const { auth, url, appSettings } = usePage().props;
    const user = auth?.user;
    const [loggingOut, setLoggingOut] = useState(false);

    if (!user) return null;

    const isSuperAdmin = user.role === 'superadmin';
    const isAdmin = user.role === 'admin' || isSuperAdmin;
    const isCreator = user.role === 'creator' || isAdmin;
    const isUser = ['guest', 'user', 'creator', 'admin', 'superadmin'].includes(user.role);



    const isActive = (routeName) => {
        try {
            return route().current(routeName);
        } catch (e) {
            return false;
        }
    };

    const NavLink = ({ href, icon, label, active }) => (
        <li className="nav-item">
            <Link
                href={href}
                className={`nav-link flex items-center gap-2 px-4 py-2 rounded-lg text-white/85 hover:text-white hover:bg-white/10 transition-all ${active ? 'bg-gradient-to-r from-primary to-secondary text-white border-l-4 border-white' : ''
                    } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? label : ''}
            >
                <i className={`${icon} w-4 text-center ${collapsed ? 'text-lg' : ''}`}></i>
                {!collapsed && <span>{label}</span>}
            </Link>
        </li>
    );

    const MenuSection = ({ title }) => (
        <li className="nav-item mt-4 mb-2">
            {collapsed ? (
                <div className="h-px bg-white/20 mx-4"></div>
            ) : (
                <h4 className="text-xs font-semibold uppercase tracking-wide text-white/60 px-4">{title}</h4>
            )}
        </li>
    );

    return (
        <div className="sidebar bg-gradient-to-b from-gray-800 to-gray-900 h-full w-full flex flex-col">
            {/* Logo Panel */}
            <div className={`logo-panel px-4 py-6 border-b border-white/10 flex justify-center items-center`}>
                <Link href="/" className="flex justify-center items-center w-full">
                    <img
                        src={appSettings?.app_logo ? (appSettings.app_logo.startsWith('http') ? appSettings.app_logo : `/${appSettings.app_logo}`) : '/assets/images/logo.png'}
                        alt="Logo"
                        className={`object-contain transition-all duration-300 ${collapsed ? 'h-10 w-10' : 'h-24 w-auto max-w-full'}`}
                        onError={(e) => { e.target.src = '/assets/images/logo.png'; }}
                    />
                </Link>
            </div>

            {/* Sidebar Menu */}
            <nav className="flex-1 overflow-y-auto py-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.3) transparent' }}>
                <ul className="nav flex flex-col">
                    {/* Main Menu */}
                    {isUser && (
                        <>
                            <MenuSection title="Menu Utama" />
                            {/* Home button removed as per request, use Logo to go home */}
                            <NavLink href={route('dashboard.user')} icon="fas fa-tasks" label="Aktivitas Saya" active={isActive('dashboard.user')} />
                        </>
                    )}

                    {isCreator && (
                        <NavLink href={route('dashboard.index')} icon="fas fa-tachometer-alt" label="Dashboard" active={isActive('dashboard.index')} />
                    )}

                    {/* Creator/Admin Area */}
                    {isCreator && (
                        <>
                            <MenuSection title={user.role === 'creator' ? 'Creator Area' : 'Admin Area'} />
                            <NavLink href={route('activity.list')} icon="fas fa-clipboard-list" label="Aktivitas" active={isActive('activity.*')} />
                            <NavLink href={route('news.list')} icon="fas fa-newspaper" label="Berita" active={isActive('news.*')} />
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <NavLink href={route('partners.list')} icon="fas fa-handshake" label="Mitra" active={isActive('partners.*')} />
                            <NavLink href={route('pengurus.index')} icon="fas fa-user-tie" label="Pengurus" active={isActive('pengurus.*')} />
                            {/* <NavLink href="/kategori" icon="fas fa-tags" label="Kategori" active={isActive('kategori*')} /> */}
                        </>
                    )}

                    {/* Management */}
                    {isAdmin && (
                        <>
                            <MenuSection title="Manajemen" />
                            <NavLink href={route('user-management.index')} icon="fas fa-users-cog" label="Manajemen User" active={isActive('user-management.*')} />
                            <NavLink href={route('subscriptions.payments.manage')} icon="fas fa-money-bill-wave" label="Keuangan" active={isActive('payments.manage') || isActive('subscriptions.payments.*')} />

                            {isSuperAdmin && (
                                <>
                                    <NavLink href={route('api-monitor.index')} icon="fas fa-network-wired" label="API" active={isActive('api-monitor.*')} />
                                    <NavLink href={route('maintenance.index')} icon="fas fa-tools" label="Maintenance" active={isActive('maintenance.*')} />
                                </>
                            )}
                        </>
                    )}

                    {/* Creator Payment Management */}
                    {!isAdmin && isCreator && (
                        <>
                            <MenuSection title="Manajemen" />
                            <NavLink href={route('subscriptions.payments.manage')} icon="fas fa-money-bill-wave" label="Keuangan" active={isActive('payments.manage') || isActive('subscriptions.payments.*')} />
                        </>
                    )}

                    {/* Settings */}
                    {user && (
                        <>
                            <MenuSection title="Pengaturan" />
                            <NavLink href={route('profile.show', user.id)} icon="fas fa-user-circle" label="Profil" active={isActive('profile.show')} />
                            <NavLink href={route('settings.index')} icon="fas fa-cog" label="Settings" active={isActive('settings.*')} />
                        </>
                    )}
                </ul>
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t border-white/10">
                <Link
                    as="button"
                    method="post"
                    href={route('logout')}
                    disabled={loggingOut}
                    onClick={() => setLoggingOut(true)}
                    className={`w-full flex items-center bg-danger hover:bg-danger/90 text-white rounded-lg font-semibold transition-all shadow-sm hover:shadow-md py-2 ${collapsed ? 'justify-center' : 'justify-center gap-2 px-4'} ${loggingOut ? 'opacity-50 cursor-wait' : ''}`}
                    title={collapsed ? 'Logout' : ''}
                >
                    <i className={`fas ${loggingOut ? 'fa-spinner fa-spin' : 'fa-sign-out-alt'}`}></i>
                    {!collapsed && <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>}
                </Link>
            </div>
        </div>
    );
}
