import React, { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import Sidebar from '../Components/Sidebar';
import Alerts from '../Components/Alerts';

export default function AdminLayout({ children, title = '' }) {
    const { auth, flash, errors } = usePage().props;
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Mobile Sidebar Overlay */}
            {isMobileSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside 
                className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ${
                    isSidebarCollapsed ? 'w-16' : 'w-64'
                } ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                <Sidebar collapsed={isSidebarCollapsed} />
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
                                                                if (confirm('Apakah Anda yakin ingin membersihkan cache browser? Halaman akan dimuat ulang.')) {
                                                                    if ('caches' in window) {
                                                                        caches.keys().then(names => {
                                                                            names.forEach(name => caches.delete(name));
                                                                        });
                                                                    }
                                                                    localStorage.clear();
                                                                    sessionStorage.clear();
                                                                    window.location.reload(true);
                                                                }
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
                                                            className="flex items-center w-full text-left px-4 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 hover:text-red-700 transition-colors group"
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
