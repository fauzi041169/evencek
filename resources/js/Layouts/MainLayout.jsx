import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Sidebar from '../Components/Sidebar';
import Alerts from '../Components/Alerts';
import Swal from 'sweetalert2';
import Modal from '../Components/Modal';
import { useTranslation } from 'react-i18next';

export default function MainLayout({ children, title = 'Dashboard' }) {
    const { auth, flash, errors, appSettings } = usePage().props;
    const { url } = usePage();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const { t: tOrig } = useTranslation();
    const t = tOrig || ((key) => key);

    const settings = appSettings || {};

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

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!auth || !auth.user) {
            window.location.href = route('login');
        }
    }, [auth]);

    // Render nothing while redirecting if not authenticated
    if (!auth || !auth.user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <style dangerouslySetInnerHTML={{
                __html: `
                :root {
                    --color-primary: ${settings.colors?.primary || '#7c3aed'};
                    --color-secondary: ${settings.colors?.secondary || '#db2777'};
                    --color-accent: ${settings.colors?.accent || '#f59e0b'};
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
            `}} />
            <Head title={title} />

            {/* Mobile Sidebar Modal - Now opened from Bottom Nav "Menu" */}
            <Modal show={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} maxWidth="sm">
                <div className="h-[90vh] w-[85vw] mx-auto bg-gradient-to-b from-gray-800 to-gray-900 overflow-hidden flex flex-col rounded-[2rem] shadow-2xl border border-white/10">
                    <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-black/30 backdrop-blur-md">
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

            {/* Desktop Sidebar (Permanent) */}
            <aside
                className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 shadow-xl hidden lg:block bg-[#0F172A] overflow-y-auto custom-scrollbar ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
            >
                <Sidebar collapsed={isSidebarCollapsed} showProfile={false} auth={auth} user={auth?.user} appSettings={appSettings} />
            </aside>

            {/* Main Content Wrapper */}
            <div className={`transition-all duration-300 min-h-screen flex flex-col ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>

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

                            {/* Sidebar Toggle (Desktop) */}
                            <button
                                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                                className="hidden lg:flex p-2 rounded-lg text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                            >
                                <i className={`fas ${isSidebarCollapsed ? 'fa-indent' : 'fa-outdent'} text-lg`}></i>
                            </button>

                            {/* Page Title */}
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

                            {/* Notifications (Placeholder) */}
                            <button className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors relative">
                                <i className="fas fa-bell text-lg"></i>
                                <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                            </button>

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

                                                {/* Mode Edit Toggle in Header */}
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
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
                    <div className="w-full">
                        {/* Global Alerts */}
                        <div className="mb-6">
                            <Alerts flash={flash} errors={errors} />
                        </div>

                        {/* Children Content */}
                        <div className="animate-fade-in-up">
                            {children}
                        </div>
                    </div>
                </main>

                {/* Simple Footer */}
                <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-sm text-gray-500 pb-32 md:pb-4">
                    &copy; {new Date().getFullYear()} {usePage().props.appName || 'EventCek'}. All rights reserved.
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
        </div>
    );
}
