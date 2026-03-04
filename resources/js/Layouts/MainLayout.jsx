import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Head, Link, usePage, router } from '@inertiajs/react';
import Sidebar from '../Components/Sidebar';
import Alerts from '../Components/Alerts';
import Swal from 'sweetalert2';
import Modal from '../Components/Modal';
import { useTranslation } from 'react-i18next';

const FloatingAI = lazy(() => import('../Components/FloatingAI'));


export default function MainLayout({ children, title = 'Dashboard', fluid = false, noPadding = false }) {
    const { auth, flash, errors, appSettings } = usePage().props;
    const { url } = usePage();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        const stored = localStorage.getItem('sidebarCollapsed');
        // Default to collapsed (true) if not explicitly set to 'false'
        return stored !== 'false';
    });
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [editMode, setEditMode] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const { t: tOrig } = useTranslation();
    const t = tOrig || ((key) => key);

    const settings = appSettings || {};

    const dynamicStyles = useMemo(() => {
        const p = settings.colors?.primary || '#7c3aed';
        const sec = settings.colors?.secondary || '#db2777';
        const acc = settings.colors?.accent || '#f59e0b';
        return `
            :root {
                --color-primary: ${p};
                --color-secondary: ${sec};
                --color-accent: ${acc};
            }
            .bg-gradient-custom {
                background: linear-gradient(to right, var(--color-primary), var(--color-secondary));
            }
            .text-primary { color: var(--color-primary) !important; }
            .bg-primary { background-color: var(--color-primary) !important; }
            .text-secondary { color: var(--color-secondary) !important; }
            .bg-secondary { background-color: var(--color-secondary) !important; }
            .border-primary { border-color: var(--color-primary) !important; }
            .ring-primary { --tw-ring-color: var(--color-primary) !important; }
            .hover\\:bg-primary:hover { background-color: var(--color-primary) !important; }
            .hover\\:text-primary:hover { color: var(--color-primary) !important; }
            aside, aside > div, .sidebar-container {
                background-color: #1e293b !important;
                color: #f1f5f9 !important;
            }
            .sidebar-link-active {
                background-color: rgba(255, 255, 255, 0.1) !important;
                color: white !important;
            }
        `;
    }, [settings.colors?.primary, settings.colors?.secondary, settings.colors?.accent]);

    const fetchNotifications = async () => {
        try {
            const res = await fetch(route('notifications.index'));
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                // Count unread (withdrawal requests count as unread if read_at is null)
                setUnreadCount(data.filter(n => !n.read_at).length);
            }
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Poll every 60 seconds
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleNotificationClick = async (n) => {
        if (!n.read_at) {
            try {
                await fetch(route('notifications.read', n.id), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                    }
                });
                // Optimistically update
                setNotifications(prev => prev.map(item =>
                    item.id === n.id ? { ...item, read_at: new Date().toISOString() } : item
                ));
                setUnreadCount(prev => Math.max(0, prev - 1));
            } catch (e) {
                console.error(e);
            }
        }

        setIsNotificationOpen(false);

        if (n.data.url) {
            // Use Inertia router if possible, otherwise window.location
            if (n.data.url.startsWith('http')) {
                window.location.href = n.data.url;
            } else {
                router.visit(n.data.url);
            }
        }
    };

    const markAllRead = async () => {
        try {
            await fetch(route('notifications.read-all'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                }
            });
            setNotifications(prev => prev.map(item => ({ ...item, read_at: new Date().toISOString() })));
            setUnreadCount(0);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        const storedEditMode = localStorage.getItem('editMode');
        if (storedEditMode) {
            setEditMode(storedEditMode === 'true');
        }
    }, []);

    const toggleEditMode = () => {
        const newMode = !editMode;
        setEditMode(newMode);
        localStorage.setItem('editMode', String(newMode));
        window.dispatchEvent(new Event('editModeChanged'));
    };

    // Redirect to login if not authenticated (though middleware should handle this)
    if (!auth || !auth.user) {
        return (
            <>
                <Head title="Silakan Login" />
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[50]">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md text-center shadow-2xl">
                        <h3 className="text-xl font-bold mb-2 text-gray-900">Silakan Login</h3>
                        <p className="text-gray-600 mb-4">Halaman ini memerlukan login untuk diakses.</p>
                        <div className="flex items-center justify-center gap-2">
                            <Link href={route('login')} className="inline-flex items-center justify-center px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 transition">
                                Login Sekarang
                            </Link>
                            <Link href={route('auth.google.login')} className="inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition">
                                Google
                            </Link>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <style dangerouslySetInnerHTML={{ __html: dynamicStyles }} />
            <Head title={title} />

            {/* Mobile Sidebar Modal - Now opened from Bottom Nav "Menu" */}
            <Modal show={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} maxWidth="sm">
                <div className="h-[90vh] w-[85vw] mx-auto sidebar-container overflow-hidden flex flex-col rounded-[2rem] shadow-2xl border border-white/10">
                    <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-black/20 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                                <i className="fas fa-bars text-primary text-xs"></i>
                            </div>
                            <span className="text-white font-black tracking-widest text-[10px] uppercase">{t('nav.navigation')}</span>
                        </div>
                        <button
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10 transition-all font-bold"
                        >
                            <i className="fas fa-times text-lg"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                        {/* DEBUG - Check if this renders */}
                        <div className="px-6 py-2 text-white/50 text-[10px] border-b border-white/5 mb-2">
                            <i className="fas fa-info-circle mr-2"></i>
                            Menu for: {auth?.user?.name || 'Guest'} ({auth?.user?.role || 'no-role'})
                        </div>
                        <Sidebar
                            collapsed={false}
                            showProfile={true}
                            auth={auth}
                            user={auth?.user}
                            appSettings={appSettings}
                        />
                    </div>
                </div>
            </Modal>

            <aside
                className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 shadow-xl hidden lg:block ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}
                style={{ backgroundColor: '#1e293b', color: '#f1f5f9' }}
            >
                <div className="w-full h-full sidebar-container text-slate-200">
                    <Sidebar
                        collapsed={isSidebarCollapsed}
                        showProfile={false}
                        auth={auth}
                        user={auth?.user}
                        appSettings={appSettings}
                    />
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className={`transition-all duration-300 min-h-screen flex flex-col ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>

                {/* Top Navbar */}
                <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-gray-100">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Mobile Menu Button - HIDDEN because using Bottom Nav */}
                            <button
                                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                                className="hidden lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <i className="fas fa-bars text-xl"></i>
                            </button>

                            <button
                                onClick={() => {
                                    const newState = !isSidebarCollapsed;
                                    setIsSidebarCollapsed(newState);
                                    localStorage.setItem('sidebarCollapsed', String(newState));
                                }}
                                className="hidden lg:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                            >
                                <i className={`fas ${isSidebarCollapsed ? 'fa-indent' : 'fa-outdent'} text-lg`}></i>
                            </button>

                            {/* Page Title */}
                            <Link
                                href="/"
                                className="flex flex-shrink-0 items-center gap-2 cursor-pointer transition-transform hover:scale-105 mr-2"
                            >
                                <img
                                    src={settings.app_logo || '/assets/images/logo.png'}
                                    alt="Logo"
                                    className="h-9 w-auto object-contain"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = '/assets/images/logo.png';
                                    }}
                                />
                            </Link>

                            <h1 className="text-lg font-bold text-gray-800 tracking-tight hidden sm:block border-l border-gray-200 pl-4 ml-1">
                                {title}
                            </h1>
                        </div>

                        {/* Right Side */}
                        <div className="flex items-center gap-3">
                            {/* Home Link */}
                            <Link
                                href="/"
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors"
                                title="Ke Halaman Depan"
                            >
                                <i className="fas fa-home text-lg"></i>
                            </Link>

                            {/* Notifications */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors relative focus:outline-none"
                                >
                                    <i className="fas fa-bell text-lg"></i>
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse"></span>
                                    )}
                                </button>

                                {/* Notification Dropdown */}
                                {isNotificationOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-40"
                                            onClick={() => setIsNotificationOpen(false)}
                                        ></div>
                                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl ring-1 ring-black ring-opacity-5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                                <h3 className="text-sm font-bold text-gray-700">Notifikasi</h3>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={markAllRead}
                                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                                                    >
                                                        Tandai semua dibaca
                                                    </button>
                                                )}
                                            </div>
                                            <div className="max-h-96 overflow-y-auto custom-scrollbar">
                                                {notifications.length > 0 ? (
                                                    notifications.map((n) => (
                                                        <div
                                                            key={n.id}
                                                            onClick={() => handleNotificationClick(n)}
                                                            className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${!n.read_at ? 'bg-indigo-50/50' : ''}`}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${n.type === 'withdrawal_request' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                    <i className={`fas ${n.type === 'withdrawal_request' ? 'fa-money-bill-wave' : 'fa-info'}`}></i>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-sm font-medium text-gray-900 ${!n.read_at ? 'font-bold' : ''}`}>
                                                                        {n.data.message || 'Notifikasi Baru'}
                                                                    </p>
                                                                    {n.data.amount && (
                                                                        <p className="text-xs text-green-600 font-semibold mt-0.5">
                                                                            {n.data.amount}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-xs text-gray-500 mt-1">
                                                                        {n.created_at}
                                                                    </p>
                                                                </div>
                                                                {!n.read_at && (
                                                                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2"></div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-8 text-center text-gray-500">
                                                        <i className="fas fa-bell-slash text-2xl mb-2 text-gray-300"></i>
                                                        <p className="text-sm">Tidak ada notifikasi</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* User Dropdown */}
                            <div
                                className="relative ml-1 pl-3 border-l border-gray-200"
                                onMouseEnter={() => setIsProfileDropdownOpen(true)}
                                onMouseLeave={() => setIsProfileDropdownOpen(false)}
                            >
                                <button
                                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                    className="flex items-center gap-3 focus:outline-none group"
                                >
                                    <div className="text-right hidden md:block">
                                        <p className="text-sm font-semibold text-gray-700 leading-tight group-hover:text-indigo-600 transition-colors">{auth.user.name}</p>
                                        <p className="text-xs text-gray-500 capitalize">{auth.user.role}</p>
                                    </div>
                                    <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-indigo-100 shadow-sm group-hover:border-indigo-300 transition-colors bg-indigo-50 flex items-center justify-center flex-shrink-0">
                                        {auth.user.profile_photo_url ? (
                                            <img
                                                src={auth.user.profile_photo_url}
                                                alt={auth.user.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.nextSibling.classList.remove('hidden');
                                                    e.currentTarget.nextSibling.classList.add('flex');
                                                }}
                                            />
                                        ) : null}
                                        <div className={`w-full h-full items-center justify-center text-sm font-bold text-indigo-600 bg-indigo-100 ${auth.user.profile_photo_url ? 'hidden' : 'flex'}`}>
                                            {auth.user.name?.charAt(0).toUpperCase()}
                                        </div>
                                    </div>
                                    <i className={`fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200 ${isProfileDropdownOpen ? 'rotate-180' : ''}`}></i>
                                </button>

                                {/* Dropdown Menu */}
                                <div
                                    className={`
                                        absolute right-0 top-full pt-2 w-80 z-50 transition-all duration-300 ease-in-out transform origin-top-right
                                        ${isProfileDropdownOpen
                                            ? 'opacity-100 translate-y-0 scale-100 visible pointer-events-auto'
                                            : 'opacity-0 -translate-y-2 scale-95 invisible pointer-events-none'
                                        }
                                    `}
                                >
                                    <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-black ring-opacity-5 overflow-hidden">
                                        {/* Header Section */}
                                        <div className="relative bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-5">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-white shadow-md bg-white/10 flex items-center justify-center flex-shrink-0">
                                                            {auth.user.profile_photo_url ? (
                                                                <img
                                                                    src={auth.user.profile_photo_url}
                                                                    alt={auth.user.name}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        e.currentTarget.nextSibling.classList.remove('hidden');
                                                                        e.currentTarget.nextSibling.classList.add('flex');
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div className={`w-full h-full items-center justify-center text-lg font-bold text-white bg-white/20 ${auth.user.profile_photo_url ? 'hidden' : 'flex'}`}>
                                                                {auth.user.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                        </div>
                                                        <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-indigo-600"></div>
                                                    </div>
                                                    <div className="text-white">
                                                        <p className="text-sm font-bold tracking-wide">{auth.user.name}</p>
                                                        <p className="text-xs text-indigo-200 font-medium capitalize mt-0.5 bg-white/20 px-2 py-0.5 rounded-full inline-block">
                                                            {auth.user.role}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Mode Edit Toggle in Header: hanya untuk superadmin */}
                                                {(auth?.user?.role === 'superadmin' || auth?.user?.is_super_admin) && (
                                                    <button
                                                        onClick={toggleEditMode}
                                                        className={`
                                                            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all duration-300 border border-white/20
                                                            ${editMode
                                                                ? 'bg-red-500 text-white animate-pulse'
                                                                : 'bg-white/20 text-white hover:bg-white/30'
                                                            }
                                                        `}
                                                        title={editMode ? 'Matikan Mode Edit' : 'Aktifkan Mode Edit'}
                                                    >
                                                        <i className={`fas ${editMode ? 'fa-times' : 'fa-edit'}`}></i>
                                                        <span>{editMode ? 'Stop' : 'Edit'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="px-2 py-2">
                                            <div className="grid gap-1">
                                                <Link href="/dashboard" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-900 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 hover:translate-x-1 group">
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 mr-3 group-hover:bg-gray-200 group-hover:text-gray-800 transition-colors">
                                                        <i className="fas fa-tachometer-alt"></i>
                                                    </div>
                                                    Dashboard
                                                </Link>
                                                <Link href={`/profile/${auth.user.id}`} className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-900 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 hover:translate-x-1 group">
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 mr-3 group-hover:bg-gray-200 group-hover:text-gray-800 transition-colors">
                                                        <i className="fas fa-user"></i>
                                                    </div>
                                                    Profil Saya
                                                </Link>

                                                {auth.user.role === 'superadmin' && (
                                                    <Link href="/settings" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-900 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 hover:translate-x-1 group">
                                                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 mr-3 group-hover:bg-gray-200 group-hover:text-gray-800 transition-colors">
                                                            <i className="fas fa-cog"></i>
                                                        </div>
                                                        Pengaturan
                                                    </Link>
                                                )}

                                                <div className="border-t border-gray-100 my-1 mx-2"></div>

                                                <Link href="/download-apk" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-900 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 hover:translate-x-1 group">
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 mr-3 group-hover:bg-gray-200 group-hover:text-gray-800 transition-colors">
                                                        <i className="fas fa-download"></i>
                                                    </div>
                                                    Download APK
                                                </Link>
                                                <Link href="/scan-qr" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-900 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 hover:translate-x-1 group">
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 mr-3 group-hover:bg-gray-200 group-hover:text-gray-800 transition-colors">
                                                        <i className="fas fa-qrcode"></i>
                                                    </div>
                                                    Scan QR Code
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        Swal.fire({
                                                            title: 'Bersihkan Cache?',
                                                            text: 'Browser cache akan dibersihkan dan halaman akan dimuat ulang.',
                                                            icon: 'warning',
                                                            showCancelButton: true,
                                                            confirmButtonColor: '#3085d6',
                                                            cancelButtonColor: '#d33',
                                                            confirmButtonText: 'Ya, Bersihkan!',
                                                            cancelButtonText: 'Batal'
                                                        }).then((result) => {
                                                            if (result.isConfirmed) {
                                                                if ('caches' in window) {
                                                                    caches.keys().then(names => {
                                                                        names.forEach(name => caches.delete(name));
                                                                    });
                                                                }
                                                                localStorage.clear();
                                                                sessionStorage.clear();
                                                                window.location.reload(true);
                                                            }
                                                        });
                                                    }}
                                                    className="flex items-center w-full text-left px-4 py-2.5 text-sm font-medium text-gray-900 rounded-xl hover:bg-gray-100 hover:text-gray-900 transition-all duration-200 hover:translate-x-1 group"
                                                >
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 mr-3 group-hover:bg-gray-200 group-hover:text-gray-800 transition-colors">
                                                        <i className="fas fa-broom"></i>
                                                    </div>
                                                    Bersihkan Cache
                                                </button>

                                                <div className="border-t border-gray-100 my-1 mx-2"></div>

                                                <Link
                                                    as="button"
                                                    method="post"
                                                    href={route('logout')}
                                                    disabled={loggingOut}
                                                    onClick={() => setLoggingOut(true)}
                                                    className={`flex items-center w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 hover:text-red-700 transition-all duration-200 hover:translate-x-1 group ${loggingOut ? 'opacity-50 cursor-wait' : ''}`}
                                                >
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 mr-3 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                                        {loggingOut ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-out-alt"></i>}
                                                    </div>
                                                    {loggingOut ? 'Logging out...' : 'Logout'}
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                {/* Page Content */}
                <main className={`flex-1 ${noPadding ? '' : 'p-2 md:p-6 lg:p-8'}`}>
                    {/* Added slight horizontal padding for better aesthetics */}
                    <div className="w-full px-4 sm:px-6 lg:px-8">

                        {/* Global Alerts - Fixed Position, no layout space needed */}
                        <Alerts flash={flash} errors={errors} />

                        {/* Children Content */}
                        <div className="animate-fade-in-up">
                            {children}
                        </div>
                    </div>
                </main>


                {/* Simple Footer */}
                <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} {usePage().props.appName || 'EventCek'}. Developed by PT. ADZKIATEKNO EDU SOLUTION. All rights reserved.
                </footer>
            </div>

            {/* Premium Mobile Bottom Navigation Bar - Bulging Center Mode (Dashboard Version) */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none">
                {/* The Bar Background with Notch Effect */}
                <div className="relative bg-white shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] border-t border-gray-100 flex items-stretch justify-around px-2 pt-2 pb-safe-offset-2 pointer-events-auto h-20">

                    {/* Left Group */}
                    <div className="flex w-2/5 justify-around items-center">
                        <Link href="/" className="flex flex-col items-center justify-center space-y-1 text-gray-400 hover:text-primary transition-all">
                            <div className="p-2 rounded-xl">
                                <i className="fas fa-home text-lg"></i>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Web</span>
                        </Link>
                        <Link href={route('activity.list')} className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${url.startsWith('/activity') ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`p-2 rounded-xl transition-all ${url.startsWith('/activity') ? 'bg-primary/10' : ''}`}>
                                <i className="fas fa-clipboard-list text-lg"></i>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Acara</span>
                        </Link>
                    </div>

                    {/* Center Bulge - DASHBOARD */}
                    <div className="relative w-1/5 flex justify-center">
                        <div className="absolute -top-10 w-20 h-20 bg-gray-50/50 backdrop-blur-sm rounded-full flex items-center justify-center pt-2">
                            <Link
                                href="/dashboard"
                                className={`w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 transform active:scale-90
                                    ${url.startsWith('/dashboard')
                                        ? 'bg-primary text-white scale-110 shadow-primary/30'
                                        : 'bg-white text-gray-500 hover:text-primary'
                                    }
                                `}
                            >
                                <i className="fas fa-tachometer-alt text-2xl mb-0.5"></i>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${url.startsWith('/dashboard') ? 'text-white' : 'text-gray-400'}`}>Dash</span>
                            </Link>
                        </div>
                    </div>

                    {/* Right Group */}
                    <div className="flex w-2/5 justify-around items-center">
                        <Link href={route('news.list')} className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${url.startsWith('/news') ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`p-2 rounded-xl transition-all ${url.startsWith('/news') ? 'bg-primary/10' : ''}`}>
                                <i className="fas fa-newspaper text-lg"></i>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">News</span>
                        </Link>

                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${isMobileSidebarOpen ? 'text-primary' : 'text-gray-400'}`}
                        >
                            <div className={`p-2 rounded-xl transition-all ${isMobileSidebarOpen ? 'bg-primary/10' : ''}`}>
                                <i className="fas fa-th-large text-lg"></i>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Menu</span>
                        </button>
                    </div>
                </div>
                {/* Safe Area Fill */}
                <div className="h-safe bg-white"></div>
            </div>
            {/* Floating AI Robot - lazy loaded untuk mengurangi initial bundle */}
            <Suspense fallback={null}>
                <FloatingAI />
            </Suspense>
        </div>
    );
}

