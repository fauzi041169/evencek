import React, { useState, useEffect } from 'react';
import { usePage, Link, router } from '@inertiajs/react';

export default function Navbar({ auth, transparent = false, onSidebarToggle = null }) {
    const { props } = usePage();
    const user = auth?.user || props?.auth?.user;

    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navClasses = `fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b ${scrolled
        ? 'bg-[#0F172A]/90 backdrop-blur-md border-gray-800 py-3 shadow-lg'
        : transparent
            ? 'bg-transparent border-transparent py-5'
            : 'bg-[#0F172A] border-gray-800 py-3'
        }`;

    return (
        <nav className={navClasses}>
            <div className="container mx-auto px-4 flex items-center justify-between">
                {/* Logo & Sidebar Toggle */}
                <div className="flex items-center gap-4">
                    {onSidebarToggle && (
                        <button
                            className="lg:hidden p-2 text-gray-300 hover:text-white transition"
                            onClick={onSidebarToggle}
                        >
                            <i className="fas fa-bars text-xl"></i>
                        </button>
                    )}

                    <Link href="/" className="flex items-center gap-2 group">
                        <img
                            src={props.app?.logo ? (props.app.logo.startsWith('http') || props.app.logo.startsWith('/') ? props.app.logo : `/${props.app.logo}`) : "/assets/images/logo.png"}
                            alt="Logo"
                            className="h-10 w-auto object-contain"
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                            }}
                        />
                        <span className="text-xl font-bold text-white transition uppercase">
                            {props.app?.name || 'EVENTCEK'}
                        </span>
                    </Link>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-6">
                    <Link
                        href="/"
                        className={`text-sm font-medium transition py-2 ${window.location.pathname === '/'
                            ? 'text-white border-b-2 border-white'
                            : 'text-gray-300 hover:text-white'
                            }`}
                    >
                        Beranda
                    </Link>
                    <Link
                        href="/activity"
                        className={`text-sm font-medium transition py-2 ${window.location.pathname.startsWith('/activity')
                            ? 'text-white border-b-2 border-white'
                            : 'text-gray-300 hover:text-white'
                            }`}
                    >
                        Acara
                    </Link>

                    <div className="h-4 w-px bg-gray-700 mx-2"></div>

                    {user ? (
                        <div className="flex items-center gap-4">
                            <div className="relative group/user">
                                <button className="flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full hover:bg-gray-800 transition border border-transparent hover:border-gray-700">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 overflow-hidden border border-gray-600 group-hover/user:border-amber-500 transition">
                                        {user.profile_photo_url ? (
                                            <img
                                                src={user.profile_photo_url}
                                                alt={user.name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-400 bg-gray-800">
                                                {user.name?.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-sm font-medium text-gray-200 group-hover/user:text-white">
                                        {user.name?.split(' ')[0]}
                                    </span>
                                    <i className="fas fa-chevron-down text-xs text-gray-500 group-hover/user:text-white transition"></i>
                                </button>

                                {/* Dropdown Menu */}
                                <div className="absolute right-0 top-full pt-2 w-72 opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible transition-all duration-200 transform translate-y-2 group-hover/user:translate-y-0">
                                    <div className="bg-[#1a1f2e] border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
                                        {/* User Header */}
                                        <div className="px-6 py-5 bg-gradient-to-br from-[#232736] to-[#1a1f2e] border-b border-gray-700/50">
                                            <p className="font-bold text-white text-lg truncate">{user.name}</p>
                                            <p className="text-sm text-gray-400 truncate mb-3">{user.email}</p>
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                {user.role || 'User'}
                                            </span>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="p-2 space-y-1">
                                            <Link
                                                href="/dashboard"
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group/item"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-amber-500 group-hover/item:bg-amber-500 group-hover/item:text-black transition-colors">
                                                    <i className="fas fa-columns"></i>
                                                </div>
                                                <span className="font-medium">Dashboard</span>
                                            </Link>

                                            <Link
                                                href={`/profile/${user.uid || user.id}`}
                                                className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-300 hover:bg-gray-800 hover:text-white transition-colors group/item"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-blue-500 group-hover/item:bg-blue-500 group-hover/item:text-black transition-colors">
                                                    <i className="fas fa-user"></i>
                                                </div>
                                                <span className="font-medium">Profil Saya</span>
                                            </Link>

                                            <div className="h-px bg-gray-700/50 mx-2 my-1"></div>

                                            {/* Logout */}
                                            <button
                                                onClick={() => {
                                                    setLoggingOut(true);
                                                    router.post(route('logout'));
                                                }}
                                                disabled={loggingOut}
                                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors group/item text-left ${loggingOut ? 'opacity-50 cursor-wait' : ''}`}
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                                                    {loggingOut ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-sign-out-alt"></i>}
                                                </div>
                                                <span className="font-medium">{loggingOut ? 'Keluar...' : 'Keluar'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <Link
                                href="/login"
                                className="text-sm font-medium text-gray-300 hover:text-white px-4 py-2 transition"
                            >
                                Masuk
                            </Link>
                            <Link
                                href="/register"
                                className="text-sm font-bold px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-lg transition shadow-lg shadow-amber-900/20 hover:shadow-amber-600/30 transform hover:-translate-y-0.5"
                            >
                                Daftar
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Menu Button */}
                {!onSidebarToggle && (
                    <button
                        className="md:hidden p-2 text-gray-300 hover:text-white transition"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    >
                        <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-2xl`}></i>
                    </button>
                )}
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full inset-x-0 bg-[#0F172A]/95 backdrop-blur-xl border-b border-gray-800 p-4 space-y-2 shadow-2xl">
                    <Link
                        href="/"
                        className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white font-medium transition"
                    >
                        <i className="fas fa-home w-6 text-center text-gray-500 mr-2"></i> Beranda
                    </Link>
                    <Link
                        href="/activity"
                        className="block px-4 py-3 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white font-medium transition"
                    >
                        <i className="fas fa-calendar w-6 text-center text-gray-500 mr-2"></i> Acara
                    </Link>

                    {user && (
                        <>
                            <div className="border-t border-gray-800 my-2"></div>
                            <Link
                                href="/dashboard"
                                className="block px-4 py-3 rounded-lg bg-amber-600/10 text-amber-500 hover:bg-amber-600/20 font-bold transition"
                            >
                                <i className="fas fa-columns w-6 text-center mr-2"></i> Dashboard
                            </Link>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
}
