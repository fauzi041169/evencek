import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import Footer from '../Components/Footer';
import Alerts from '../Components/Alerts';
import LoginDropdown from '../Components/LoginDropdown';

export default function WebLayout({ children, hasHeaderSpacer = true, transparentNavbar = false }) {
    const { props, url } = usePage();
    const { auth, flash, errors, appSettings } = props;
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        const storedEditMode = localStorage.getItem('editMode');
        if (storedEditMode) {
            setEditMode(storedEditMode === 'true');
        }

        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };

        if (transparentNavbar) {
            window.addEventListener('scroll', handleScroll);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [transparentNavbar]);

    const toggleEditMode = () => {
        const newMode = !editMode;
        setEditMode(newMode);
        localStorage.setItem('editMode', String(newMode));
        window.dispatchEvent(new Event('editModeChanged'));
    };

    const settings = appSettings || {};

    const getLogoUrl = (logoPath) => {
        if (!logoPath) return '/assets/images/logo.png';
        if (logoPath.startsWith('http')) return logoPath;

        // Remove leading / if any
        let cleanPath = logoPath.startsWith('/') ? logoPath.substring(1) : logoPath;

        // Handle double storage/ if it somehow got in
        if (cleanPath.startsWith('storage/storage/')) {
            cleanPath = cleanPath.substring(8);
        }

        // Fix for missing storage symlink: map storage/assets to assets
        if (cleanPath.startsWith('storage/assets/')) {
            return '/' + cleanPath.replace('storage/', '');
        }

        // If it starts with storage/, return as is with leading /
        if (cleanPath.startsWith('storage/')) {
            return '/' + cleanPath;
        }

        // If it starts with assets/, return as is with leading /
        if (cleanPath.startsWith('assets/')) {
            return '/' + cleanPath;
        }

        // Default: try storage prefix
        return '/storage/' + cleanPath;
    };

    const navClasses = `fixed top-0 left-0 right-0 z-[9999] transition-all duration-300 ${transparentNavbar && !scrolled
        ? 'bg-transparent py-4'
        : 'navbar-gradient shadow-md bg-gradient-to-r from-primary to-secondary backdrop-blur-md bg-opacity-95'
        }`;

    // Helper untuk warna text navbar
    const getNavbarTextColor = () => {
        if (transparentNavbar && !scrolled) return 'text-white hover:bg-white/10 border-white/20';
        return 'text-navbar-link-text hover:bg-navbar-link-hover-bg border-white/10';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Global Styles from AppSettings */}
            <style dangerouslySetInnerHTML={{
                __html: `
                :root {
                    --color-primary: ${settings.colors?.primary || '#7c3aed'};
                    --color-secondary: ${settings.colors?.secondary || '#db2777'};
                    --color-accent: ${settings.colors?.accent || '#f59e0b'};
                    --color-navbar-bg: ${settings.colors?.navbar_bg || '#1e293b'};
                    --color-navbar-text: ${settings.colors?.navbar_text || '#f8fafc'};
                }
                .navbar-gradient {
                    background: linear-gradient(to right, var(--color-primary), var(--color-secondary));
                }
                .text-primary { color: var(--color-primary); }
                .bg-primary { background-color: var(--color-primary); }
                .text-secondary { color: var(--color-secondary); }
                .bg-secondary { background-color: var(--color-secondary); }
                .hover\\:bg-primary:hover { background-color: var(--color-primary); }
                .hover\\:text-primary:hover { color: var(--color-primary); }
                
                /* Custom scrollbar */
                ::-webkit-scrollbar { width: 8px; height: 8px; }
                ::-webkit-scrollbar-track { background: #f1f5f9; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `}} />

            {/* Flash Messages */}
            <div className="fixed top-16 right-4 z-[10000] max-w-sm">
                <Alerts flash={flash} errors={errors} />
            </div>

            {/* Navbar */}
            <nav id="mainNavbar" className={navClasses}>
                <div className="w-full px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Left Side */}
                        <div className="flex items-center flex-1 min-w-0">
                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="md:hidden mr-3 p-2 text-white hover:bg-white/10 rounded-full focus:outline-none transition-colors"
                            >
                                <i className="fas fa-bars"></i>
                            </button>

                            {/* Logo */}
                            <div className="flex-shrink-0 flex items-center mr-8">
                                <Link href="/" className="flex items-center space-x-3 group">
                                    <div className="flex items-center justify-center h-10 transition-transform group-hover:scale-105">
                                        <img
                                            src={getLogoUrl(settings.app_logo)}
                                            alt="Logo"
                                            className="h-full w-auto object-contain"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.style.display = 'none';
                                                e.target.parentNode.innerHTML = '<i class="fas fa-shield-alt text-xl text-white"></i>';
                                            }}
                                        />
                                    </div>
                                    <span className="font-bold text-xl text-white tracking-wide uppercase hidden sm:inline group-hover:text-warning transition-colors">
                                        {settings.app_name || 'EVENTCEK'}
                                    </span>
                                </Link>
                            </div>

                            {/* Desktop Navigation */}
                            <nav className="hidden md:flex items-center space-x-3">
                                {[
                                    { name: 'Beranda', href: '/' },
                                    { name: 'Tentang Kami', href: '/about' },
                                    { name: 'Berita', href: '/news' },
                                    { name: 'Kegiatan', href: '/activity' },
                                ].map((link) => {
                                    const isActive = url === link.href || (link.href !== '/' && url.startsWith(link.href));
                                    return (
                                        <Link
                                            key={link.name}
                                            href={link.href}
                                            className={`
                                                relative px-6 py-2.5 rounded-tl-2xl rounded-br-2xl text-sm font-bold transition-all duration-300 transform group overflow-hidden
                                                ${isActive
                                                    ? 'bg-navbar-link-active-card text-navbar-link-active-border shadow-xl scale-105 -translate-y-0.5 ring-2 ring-navbar-link-active-border/50'
                                                    : 'bg-white/10 text-navbar-link-text hover:bg-navbar-link-hover-bg hover:shadow-lg hover:scale-105 hover:-translate-y-0.5 backdrop-blur-sm border border-white/10'
                                                }
                                            `}
                                        >
                                            <span className="relative z-10 flex items-center gap-2">
                                                {link.name === 'Beranda' && <i className="fas fa-home opacity-80"></i>}
                                                {link.name === 'Tentang Kami' && <i className="fas fa-info-circle opacity-80"></i>}
                                                {link.name === 'Berita' && <i className="fas fa-newspaper opacity-80"></i>}
                                                {link.name === 'Kegiatan' && <i className="fas fa-calendar-alt opacity-80"></i>}
                                                {link.name}
                                            </span>
                                            {isActive && (
                                                <div className="absolute inset-0 bg-warning blur-md opacity-40 rounded-tl-2xl rounded-br-2xl -z-10"></div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Right Side */}
                        <div className="flex items-center space-x-2 lg:space-x-3 flex-shrink-0">
                            {auth && auth.user ? (
                                <div className="flex items-center gap-3">
                                    <div
                                        className="relative"
                                        onMouseEnter={() => setIsProfileDropdownOpen(true)}
                                        onMouseLeave={() => setIsProfileDropdownOpen(false)}
                                    >
                                        <button
                                            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                            className="flex items-center focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-full p-0.5 transition-transform duration-200 hover:scale-105"
                                        >
                                            <img
                                                src={auth.user.profile_photo_url || '/assets/images/profilefoto/default-profile.png'}
                                                alt={auth.user.name}
                                                className="h-9 w-9 rounded-full object-cover border-2 border-white border-opacity-30"
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
                                                <div className="relative navbar-gradient px-6 py-5">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative">
                                                                <img
                                                                    src={auth.user.profile_photo_url || '/assets/images/profilefoto/default-profile.png'}
                                                                    alt={auth.user.name}
                                                                    className="h-12 w-12 rounded-full object-cover border-2 border-white shadow-md"
                                                                    onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                                                />
                                                                <div className="absolute bottom-0 right-0 h-3 w-3 bg-success rounded-full border-2 border-primary"></div>
                                                            </div>
                                                            <div className="text-white">
                                                                <p className="text-sm font-bold tracking-wide">{auth.user.name}</p>
                                                                <p className="text-xs text-white/80 font-medium capitalize mt-0.5 bg-white/20 px-2 py-0.5 rounded-full inline-block">
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
                                                                    ? 'bg-danger text-white animate-pulse'
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
                                                        <Link href="/dashboard" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group">
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
                                                                <i className="fas fa-tachometer-alt"></i>
                                                            </div>
                                                            Dashboard
                                                        </Link>
                                                        <Link href={`/profile/${auth.user.id}`} className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group">
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
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

                                                        <Link href="/download-apk" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group">
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-success/10 text-success mr-3 group-hover:bg-success group-hover:text-white transition-colors">
                                                                <i className="fas fa-download"></i>
                                                            </div>
                                                            Download APK
                                                        </Link>
                                                        <Link href="/scan-qr" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group">
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-info/10 text-info mr-3 group-hover:bg-info group-hover:text-white transition-colors">
                                                                <i className="fas fa-qrcode"></i>
                                                            </div>
                                                            Scan QR Code
                                                        </Link>
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
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-warning/10 text-warning mr-3 group-hover:bg-warning group-hover:text-white transition-colors">
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
                                                            className={`flex items-center w-full text-left px-4 py-2.5 text-sm font-medium text-danger rounded-xl hover:bg-danger/10 hover:text-danger transition-colors group ${loggingOut ? 'opacity-50 cursor-wait' : ''}`}
                                                        >
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-danger/10 text-danger mr-3 group-hover:bg-danger group-hover:text-white transition-colors">
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
                            ) : (
                                <LoginDropdown />
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white shadow-lg rounded-b-xl border-t border-gray-100 absolute w-full z-50">
                        <div className="px-2 pt-2 pb-3 space-y-1">
                            <Link href="/" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Beranda</Link>
                            <Link href="/about" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Tentang Kami</Link>
                            <Link href="/news" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Berita</Link>
                            <Link href="/activity" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Kegiatan</Link>

                            {auth && auth.user && (
                                <>
                                    <div className="border-t border-gray-200 my-2"></div>
                                    <div className="px-3 py-2">
                                        <p className="text-sm font-semibold text-gray-800">{auth.user.name}</p>
                                        <p className="text-xs text-purple-600 font-medium capitalize">{auth.user.role}</p>
                                    </div>
                                    <Link href="/dashboard" className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                                        <i className="fas fa-tachometer-alt w-5 text-gray-500"></i>
                                        <span className="ml-3">Dashboard</span>
                                    </Link>
                                    <Link href={`/profile/${auth.user.id}`} className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                                        <i className="fas fa-user w-5 text-gray-500"></i>
                                        <span className="ml-3">Profil Saya</span>
                                    </Link>

                                    {/* Mode Edit Switch */}
                                    <div className="flex items-center justify-between px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleEditMode(); }}>
                                        <div className="flex items-center">
                                            <i className="fas fa-edit w-5 text-gray-500"></i>
                                            <span className="ml-3">Mode Edit</span>
                                        </div>
                                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${editMode ? 'bg-secondary' : 'bg-gray-200'}`}>
                                            <span className={`${editMode ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                                        </div>
                                    </div>

                                    {auth.user.role === 'superadmin' && (
                                        <Link href="/settings" className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                                            <i className="fas fa-cog w-5 text-gray-500"></i>
                                            <span className="ml-3">Pengaturan</span>
                                        </Link>
                                    )}
                                    <Link href="/download-apk" className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                                        <i className="fas fa-download w-5 text-gray-500"></i>
                                        <span className="ml-3">Download APK</span>
                                    </Link>
                                    <Link href="/scan-qr" className="flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">
                                        <i className="fas fa-qrcode w-5 text-gray-500"></i>
                                        <span className="ml-3">Scan QR Code</span>
                                    </Link>
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
                                        className="flex items-center w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                                    >
                                        <i className="fas fa-broom w-5 text-gray-500"></i>
                                        <span className="ml-3">Bersihkan Cache Browser</span>
                                    </button>
                                    <Link
                                        as="button"
                                        method="post"
                                        href={route('logout')}
                                        disabled={loggingOut}
                                        onClick={() => setLoggingOut(true)}
                                        className={`flex items-center w-full text-left px-3 py-2 rounded-md text-base font-medium text-danger hover:bg-danger/10 ${loggingOut ? 'opacity-50 cursor-wait' : ''}`}
                                    >
                                        <i className={`fas ${loggingOut ? 'fa-spinner fa-spin' : 'fa-sign-out-alt'} w-5 text-danger`}></i>
                                        <span className="ml-3">{loggingOut ? 'Logging out...' : 'Logout'}</span>
                                    </Link>
                                </>
                            )}

                            {(!auth || !auth.user) && (
                                <>
                                    <div className="border-t border-gray-200 my-2"></div>
                                    <a href="/login" className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50">Masuk</a>
                                    <a href="/register" className="block px-3 py-2 rounded-md text-base font-medium text-primary hover:text-primary/90 hover:bg-primary/10">Daftar</a>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Content Spacer for Fixed Navbar */}
            <div className={hasHeaderSpacer ? "pt-14" : ""}>
                {children}
            </div>

            {/* Footer */}
            <Footer
                appName={settings.app_name || 'ADZKIATEKNO'}
                appLogo={getLogoUrl(settings.app_logo)}
            />
        </div>
    );
}
