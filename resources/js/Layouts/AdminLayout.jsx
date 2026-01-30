import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import Sidebar from '../Components/Sidebar';
import Alerts from '../Components/Alerts';
import Modal from '../Components/Modal';

export default function AdminLayout({ children, title = '' }) {
    const { auth, flash, errors, appSettings } = usePage().props;
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const settings = appSettings || {};

    return (
        <div className="min-h-screen bg-gray-100">
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
            {/* Mobile Sidebar Modal */}
            <Modal show={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} maxWidth="sm">
                <div className="h-[90vh] w-[85vw] mx-auto bg-gradient-to-b from-gray-800 to-gray-900 overflow-hidden flex flex-col rounded-[2.5rem] shadow-2xl border border-white/10">
                    <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between bg-black/30 backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30">
                                <i className="fas fa-user-shield text-primary text-xs"></i>
                            </div>
                            <span className="text-white font-black tracking-widest text-[10px] uppercase">Menu Pentadbir</span>
                        </div>
                        <button
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/10 transition-all"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pt-2" onClick={() => setIsMobileSidebarOpen(false)}>
                        <Sidebar collapsed={false} showProfile={false} />
                    </div>
                </div>
            </Modal>

            {/* Desktop Sidebar (Permanent) */}
            <aside
                className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 hidden lg:block ${isSidebarCollapsed ? 'w-16' : 'w-64'}`}
            >
                <Sidebar collapsed={isSidebarCollapsed} showProfile={false} />
            </aside>

            {/* Main Content */}
            <div className={`transition-all duration-300 min-h-screen flex flex-col ${isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
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
                            {title && (
                                <h1 className="text-lg font-bold text-gray-800 tracking-tight hidden sm:block border-l border-gray-200 pl-4 ml-1">{title}</h1>
                            )}
                        </div>

                        {/* Right Side */}
                        <div className="flex items-center gap-3">
                            {/* Home Link */}
                            <Link
                                href="/"
                                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-primary transition-colors"
                                title="Beranda"
                            >
                                <i className="fas fa-home text-lg"></i>
                            </Link>

                            {/* User Info & Dropdown */}
                            {auth && auth.user && (
                                <div className="flex items-center gap-3 pl-3 border-l border-gray-200 ml-1 relative">
                                    <div
                                        className="relative"
                                        onMouseEnter={() => setIsProfileDropdownOpen(true)}
                                        onMouseLeave={() => setIsProfileDropdownOpen(false)}
                                    >
                                        <button
                                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                            className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 rounded-full p-0.5 transition-transform duration-200 hover:scale-105"
                                        >
                                            <div className="text-right hidden sm:block mr-2">
                                                <p className="text-sm font-semibold text-gray-700 leading-tight">{auth.user.name}</p>
                                                <p className="text-xs text-gray-500 capitalize">{auth.user.role}</p>
                                            </div>
                                            <img
                                                src={auth.user.profile_photo_url || '/assets/images/profilefoto/default-profile.png'}
                                                alt={auth.user.name}
                                                className="h-9 w-9 rounded-full object-cover border-2 border-indigo-100 shadow-sm"
                                                onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                            />
                                        </button>

                                        {/* Profile Dropdown */}
                                        <div
                                            className={`
                                                absolute right-0 pt-4 w-80 z-50 transition-all duration-300 ease-in-out transform origin-top-right
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
                                                                <img
                                                                    src={auth.user.profile_photo_url || '/assets/images/profilefoto/default-profile.png'}
                                                                    alt={auth.user.name}
                                                                    className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md"
                                                                    onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                                                />
                                                                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-400 rounded-full border-2 border-indigo-600"></div>
                                                            </div>
                                                            <div className="text-white">
                                                                <p className="text-sm font-bold tracking-wide">{auth.user.name}</p>
                                                                <p className="text-xs text-indigo-200 font-medium capitalize mt-0.5 bg-white/20 px-2 py-0.5 rounded-full inline-block">
                                                                    {auth.user.role}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Menu Items */}
                                                <div className="px-2 py-2">
                                                    <div className="grid gap-1">
                                                        <Link href="/" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group">
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
                                                                <i className="fas fa-home"></i>
                                                            </div>
                                                            Halaman Depan
                                                        </Link>
                                                        <Link href={`/profile/${auth.user.id}`} className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group">
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary/10 text-secondary mr-3 group-hover:bg-secondary group-hover:text-white transition-colors">
                                                                <i className="fas fa-user"></i>
                                                            </div>
                                                            Profil Saya
                                                        </Link>

                                                        {auth.user.role === 'superadmin' && (
                                                            <Link href="/settings" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group">
                                                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 mr-3 group-hover:bg-gray-600 group-hover:text-white transition-colors">
                                                                    <i className="fas fa-cog"></i>
                                                                </div>
                                                                Pengaturan
                                                            </Link>
                                                        )}

                                                        <div className="border-t border-gray-100 my-1 mx-2"></div>

                                                        <button
                                                            onClick={() => {
                                                                Swal.fire({
                                                                    title: 'Bersihkan Cache?',
                                                                    text: "Halaman akan dimuat ulang setelah cache dibersihkan.",
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
                                                            className="flex items-center w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group"
                                                        >
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-100 text-orange-600 mr-3 group-hover:bg-orange-600 group-hover:text-white transition-colors">
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
                                                            className={`flex items-center w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 hover:text-red-700 transition-colors group ${loggingOut ? 'opacity-50 cursor-wait' : ''}`}
                                                        >
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 mr-3 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                                                {loggingOut ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-out-alt"></i>}
                                                            </div>
                                                            {loggingOut ? 'Keluar...' : 'Logout'}
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Page Content */}
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
                    <div className="w-full">
                        {/* Flash Messages */}
                        <div className="mb-6">
                            <Alerts flash={flash} errors={errors} />
                        </div>

                        {/* Main Content */}
                        <div className="animate-fade-in-up">
                            {children}
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} {usePage().props.appName || 'EventCek'}. All rights reserved.
                </footer>
            </div>
        </div>
    );
}
