import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Sidebar from '../Components/Sidebar';
import Alerts from '../Components/Alerts';
import Swal from 'sweetalert2';

export default function MainLayout({ children, title = 'Dashboard' }) {
    const { auth, flash, errors, appSettings } = usePage().props;
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    
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
            <style dangerouslySetInnerHTML={{ __html: `
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

            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 shadow-xl ${isSidebarCollapsed ? 'w-20' : 'w-64'
                    } ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                <Sidebar collapsed={isSidebarCollapsed} />
            </aside>

            {/* Main Content Wrapper */}
            <div className={`transition-all duration-300 min-h-screen flex flex-col ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>

                {/* Top Navbar */}
                <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-gray-100">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
                                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                                                    className="flex items-center w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 hover:text-red-700 transition-all duration-200 hover:translate-x-1 group"
                                                >
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 mr-3 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                                        <i className="fas fa-sign-out-alt"></i>
                                                    </div>
                                                    Logout
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
                <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} {usePage().props.appName || 'EventCek'}. All rights reserved.
                </footer>
            </div>
        </div>
    );
}
