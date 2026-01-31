import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';

export default function Sidebar({ collapsed = false, showProfile = true, auth: propAuth, user: propUser, appSettings: propSettings }) {
    let inertia = { url: '', props: {} };
    try {
        inertia = usePage();
    } catch (e) {
        // Silent fail
    }
    const url = inertia.url || '';
    const pageProps = inertia.props || {};

    const [loggingOut, setLoggingOut] = useState(false);
    const [financeOpen, setFinanceOpen] = useState(false);

    // Auto-expand finance menu if current URL matches sub-items
    useEffect(() => {
        if (url && (url.startsWith('/payments') || url.startsWith('/subscriptions/manage-payments') || url.includes('/withdraw'))) {
            setFinanceOpen(true);
        }
    }, [url]);

    // Explicitly derive everything from props for maximum stability in Modals
    const auth = propAuth || pageProps.auth || { user: null };
    const appSettings = propSettings || pageProps.appSettings || {};
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

    const role = (user?.role || '').toLowerCase();
    const isAdmin = ['admin', 'superadmin'].includes(role);
    const isCreator = role === 'creator' || isAdmin;
    const isUser = !!user;

    const NavLink = ({ href, icon, label, sub = false, activeRoutes = [], exact = false }) => {
        // Strip domain and query for comparison
        const getPath = (u) => {
            try { return u.split('?')[0].replace(/^https?:\/\/[^\/]+/, ''); }
            catch (e) { return u; }
        };
        const currentPath = getPath(url);
        const linkPath = getPath(href);

        // Check if current path matches the link or any of the active routes
        let isActive = currentPath === linkPath || (!exact && linkPath !== '#' && linkPath !== '/' && currentPath.startsWith(linkPath + '/'));

        // Also check against activeRoutes array if provided
        if (!isActive && activeRoutes.length > 0) {
            isActive = activeRoutes.some(routePath => {
                const normalizedRoute = getPath(routePath);
                return currentPath === normalizedRoute || (!exact && currentPath.startsWith(normalizedRoute + '/'));
            });
        }

        return (
            <li className="mb-1 px-3">
                <Link
                    href={href}
                    className={`flex items-center py-2.5 transition-all duration-300 rounded-xl group
                        ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'}
                        ${isActive
                            ? `bg-secondary text-white shadow-lg shadow-secondary/20 font-bold ${collapsed ? '' : 'translate-x-1'}`
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    title={collapsed ? label : ''}
                >
                    <i className={`${icon} ${collapsed ? 'text-lg' : 'w-5 text-center'} transition-transform duration-300 group-hover:scale-110 
                        ${isActive ? 'text-white scale-110' : 'text-gray-500 group-hover:text-white'}`}></i>
                    <span className={`text-[13px] tracking-wide ${collapsed ? 'hidden' : 'block'}`}>{label}</span>
                    {isActive && !collapsed && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]"></div>
                    )}
                </Link>
            </li>
        );
    };

    const NavGroup = ({ icon, label, isOpen, toggle, children }) => (
        <li className="mb-0.5">
            <button
                onClick={toggle}
                className={`w-[calc(100%-1rem)] flex items-center justify-between px-4 py-1.5 text-white/70 hover:text-white hover:bg-white/5 transition-all rounded-lg mx-2`}
            >
                <div className="flex items-center gap-2.5">
                    <i className={`${icon} w-4 text-center text-sm`}></i>
                    <span className={`text-sm font-medium ${collapsed ? 'hidden' : 'block'}`}>{label}</span>
                </div>
                {!collapsed && (
                    <i className={`fas fa-chevron-${isOpen ? 'down' : 'right'} text-[9px] opacity-40`}></i>
                )}
            </button>
            {isOpen && !collapsed && (
                <ul className="mt-1 space-y-1">
                    {children}
                </ul>
            )}
        </li>
    );

    const MenuSection = ({ title }) => (
        <li className={`mt-3 mb-1 px-5 ${collapsed ? 'hidden' : 'block'}`}>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/30">{title}</h4>
        </li>
    );

    return (
        <div className="w-full flex flex-col pb-20">
            {/* Logo Section */}
            <div className={`flex items-center justify-center py-6 ${collapsed ? 'px-2' : 'px-6'}`}>
                <Link href={safeRoute('home') || '/'} className="block w-full text-center">
                    <img
                        src={appSettings.app_logo || '/assets/images/logo.png'}
                        alt="Logo"
                        className={`mx-auto transition-all duration-300 ${collapsed ? 'w-8' : 'w-24'}`}
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/assets/images/logo.png';
                        }}
                    />
                </Link>
            </div>

            {/* Menu Items */}
            <nav className="flex-1">
                <ul className="flex flex-col">
                    {isUser && (
                        <>
                            <MenuSection title="Main" />
                            <NavLink href={safeRoute('dashboard.user')} icon="fas fa-tasks" label="Aktivitas Saya" exact={true} />
                        </>
                    )}

                    {isCreator && (
                        <NavLink href={safeRoute('dashboard.index')} icon="fas fa-tachometer-alt" label="Dashboard" exact={true} />
                    )}

                    {isCreator && (
                        <>
                            <MenuSection title="Creator" />
                            <NavLink href={safeRoute('activity.list')} icon="fas fa-clipboard-list" label="Aktivitas" />
                            <NavLink href={safeRoute('news.list')} icon="fas fa-newspaper" label="Berita" />
                            {/* Show Keuangan for all creator-level users */}
                            <NavLink href={safeRoute('payments.creator.finance')} icon="fas fa-wallet" label="Keuangan" />
                        </>
                    )}

                    {isAdmin && (
                        <>
                            <MenuSection title="Admin" />
                            <NavLink href={safeRoute('partners.list')} icon="fas fa-handshake" label="Mitra" />
                            <NavLink href={safeRoute('pengurus.index')} icon="fas fa-user-tie" label="Pengurus" />
                            <NavLink href={safeRoute('user-management.index')} icon="fas fa-users-cog" label="User Management" />
                            <NavLink
                                href={safeRoute('payments.rules')}
                                icon="fas fa-money-bill-wave"
                                label="Keuangan Sistem"
                                activeRoutes={[
                                    '/payments/rules',
                                    '/payments/manage',
                                    '/subscriptions/subscriptions/manage-payments',
                                    '/payments/withdraw',
                                    '/payments/ledger'
                                ]}
                            />
                        </>
                    )}

                    {role === 'superadmin' && (
                        <>
                            <MenuSection title="System" />
                            <NavLink href={safeRoute('maintenance.index')} icon="fas fa-tools" label="Maintenance" />
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
                    className="w-full py-3 bg-red-500/10 text-red-500 rounded-xl font-bold hover:bg-red-50 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                    <i className={`fas ${loggingOut ? 'fa-spinner fa-spin' : 'fa-sign-out-alt'}`}></i>
                    {!collapsed && <span>Logout</span>}
                </Link>
            </div>
        </div>
    );
}

