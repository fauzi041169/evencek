import React, { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import Footer from '../Components/Footer';
import Alerts from '../Components/Alerts';
import LoginDropdown from '../Components/LoginDropdown';
import Modal from '../Components/Modal';

export default function WebLayout({ children, hasHeaderSpacer = true, transparentNavbar = false, noPadding = false, fluid = false }) {
    const { props, url } = usePage();
    const { t: tOrig, i18n } = useTranslation();
    const t = tOrig || ((key) => key); // Fallback to avoid crash
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

                /* Bottom Nav Animations */
                .nav-item-active i {
                    animation: nav-bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                @keyframes nav-bounce {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.4) translateY(-4px); }
                    100% { transform: scale(1.2) translateY(-2px); }
                }
                .active-indicator {
                    transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
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
                            {/* Mobile Menu Button - HIDDEN because using Bottom Nav */}
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="hidden md:hidden mr-3 p-2 text-white hover:bg-white/10 rounded-full focus:outline-none transition-colors"
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
                                    { name: t('nav.home'), href: '/', icon: 'fa-home' },
                                    { name: t('nav.about'), href: '/about', icon: 'fa-info-circle' },
                                    { name: t('nav.news'), href: '/news', icon: 'fa-newspaper' },
                                    { name: t('nav.activities'), href: '/activity', icon: 'fa-calendar-alt' },
                                    ...(settings.subscription_service_enabled ? [{ name: 'Langganan', href: '/subscriptions/pricing', icon: 'fa-crown' }] : [])
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
                                                <i className={`fas ${link.icon} opacity-80`}></i>
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
                            {/* Language Switcher Desktop */}
                            <div className="hidden md:flex items-center mr-2">
                                <button
                                    onClick={() => i18n.changeLanguage('id')}
                                    className={`px-2 py-1 text-xs font-bold rounded-l-md border border-r-0 border-white/30 transition-colors ${i18n.language === 'id' ? 'bg-white text-primary' : 'bg-transparent text-white hover:bg-white/10'}`}
                                >
                                    ID
                                </button>
                                <button
                                    onClick={() => i18n.changeLanguage('en')}
                                    className={`px-2 py-1 text-xs font-bold rounded-r-md border border-white/30 transition-colors ${i18n.language === 'en' ? 'bg-white text-primary' : 'bg-transparent text-white hover:bg-white/10'}`}
                                >
                                    EN
                                </button>
                            </div>
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
                                                            title={editMode ? t('nav.stop') : t('nav.edit')}
                                                        >
                                                            <i className={`fas ${editMode ? 'fa-times' : 'fa-edit'}`}></i>
                                                            <span>{editMode ? t('nav.stop') : t('nav.edit')}</span>
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
                                                            {t('nav.dashboard')}
                                                        </Link>
                                                        <Link href={`/profile/${auth.user.id}`} className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group">
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
                                                                <i className="fas fa-user"></i>
                                                            </div>
                                                            {t('nav.profile')}
                                                        </Link>

                                                        {auth.user.role === 'superadmin' && (
                                                            <Link href="/settings" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group">
                                                                <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 mr-3 group-hover:bg-gray-600 group-hover:text-white transition-colors">
                                                                    <i className="fas fa-cog"></i>
                                                                </div>
                                                                {t('nav.settings')}
                                                            </Link>
                                                        )}

                                                        <div className="border-t border-gray-100 my-1 mx-2"></div>

                                                        <Link href="/download-apk" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group">
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-success/10 text-success mr-3 group-hover:bg-success group-hover:text-white transition-colors">
                                                                <i className="fas fa-download"></i>
                                                            </div>
                                                            {t('nav.download_apk')}
                                                        </Link>
                                                        <Link href="/scan-qr" className="flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 rounded-xl hover:bg-primary/5 hover:text-primary transition-colors group">
                                                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-info/10 text-info mr-3 group-hover:bg-info group-hover:text-white transition-colors">
                                                                <i className="fas fa-qrcode"></i>
                                                            </div>
                                                            {t('nav.scan_qr')}
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
                                                            {t('nav.clear_cache')}
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
                                                            {loggingOut ? 'Logging out...' : t('nav.logout')}
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

                {/* Simple Mobile Menu Modal */}
                <Modal show={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} maxWidth="md">
                    <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-gray-100 mx-4 sm:mx-auto">
                        {/* Modal Header - Compact & Elegant */}
                        <div className="navbar-gradient px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 flex items-center justify-center bg-white/20 rounded-2xl backdrop-blur-md border border-white/20">
                                    <i className="fas fa-compass text-white text-lg"></i>
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-sm uppercase tracking-widest leading-none mb-1">{t('nav.menu') || 'NAVIGASI'}</h3>
                                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Eksplorasi Menu</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all active:scale-90"
                            >
                                <i className="fas fa-times text-lg"></i>
                            </button>
                        </div>

                        {/* Modal Body - Simple & Clean */}
                        <div className="p-5 bg-gray-50/50">
                            <div className="space-y-5">
                                {/* Navigation Links */}
                                <div className="grid gap-2">
                                    {[
                                        { name: t('nav.home'), href: '/', icon: 'fa-home', color: 'text-blue-500 bg-blue-50 shadow-blue-100/50' },
                                        { name: t('nav.about'), href: '/about', icon: 'fa-info-circle', color: 'text-indigo-500 bg-indigo-50 shadow-indigo-100/50' },
                                        { name: t('nav.news'), href: '/news', icon: 'fa-newspaper', color: 'text-purple-500 bg-purple-50 shadow-purple-100/50' },
                                        { name: t('nav.activities'), href: '/activity', icon: 'fa-calendar-day', color: 'text-pink-500 bg-pink-50 shadow-pink-100/50' },
                                    ].map((link) => (
                                        <Link
                                            key={link.name}
                                            href={link.href}
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className={`flex items-center p-3.5 rounded-[1.25rem] transition-all duration-300 group border-2 ${url === link.href ? 'bg-white border-primary/20 shadow-xl shadow-primary/5' : 'bg-white/50 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-lg'}`}
                                        >
                                            <div className={`w-11 h-11 flex items-center justify-center rounded-2xl ${link.color} font-bold transition-all duration-300 shadow-lg group-hover:scale-110 group-hover:rotate-3`}>
                                                <i className={`fas ${link.icon} text-lg`}></i>
                                            </div>
                                            <div className="ml-4">
                                                <span className={`block font-black text-sm transition-colors ${url === link.href ? 'text-primary' : 'text-gray-600 group-hover:text-gray-900'}`}>{link.name}</span>
                                                {url === link.href && <span className="text-[10px] font-bold text-primary/60 uppercase">Sedang Dibuka</span>}
                                            </div>
                                            <i className={`fas fa-chevron-right ml-auto text-xs transition-transform duration-300 ${url === link.href ? 'text-primary' : 'text-gray-300 group-hover:translate-x-1'}`}></i>
                                        </Link>
                                    ))}
                                </div>

                                {/* Language Selector - Premium UI */}
                                <div className="bg-white p-5 rounded-[1.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                                    <div className="flex items-center gap-3 mb-4 px-1">
                                        <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                                        <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{t('nav.language') || 'PILIH BAHASA'}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => i18n.changeLanguage('id')}
                                            className={`group relative flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all duration-300 overflow-hidden border-2 ${i18n.language === 'id' ? 'border-primary bg-primary/5' : 'border-gray-50 bg-gray-50/50 hover:bg-white hover:border-gray-200'}`}
                                        >
                                            <img src="https://flagcdn.com/w80/id.png" alt="ID" className="w-8 h-5 object-cover rounded shadow-sm group-hover:scale-110 transition-transform" />
                                            <span className={`text-[10px] font-black tracking-widest ${i18n.language === 'id' ? 'text-primary' : 'text-gray-400'}`}>INDONESIA</span>
                                            {i18n.language === 'id' && <div className="absolute top-1 right-1"><i className="fas fa-check-circle text-primary text-[10px]"></i></div>}
                                        </button>
                                        <button
                                            onClick={() => i18n.changeLanguage('en')}
                                            className={`group relative flex flex-col items-center justify-center gap-2 py-4 rounded-2xl transition-all duration-300 overflow-hidden border-2 ${i18n.language === 'en' ? 'border-primary bg-primary/5' : 'border-gray-50 bg-gray-50/50 hover:bg-white hover:border-gray-200'}`}
                                        >
                                            <img src="https://flagcdn.com/w80/us.png" alt="US" className="w-8 h-5 object-cover rounded shadow-sm group-hover:scale-110 transition-transform" />
                                            <span className={`text-[10px] font-black tracking-widest ${i18n.language === 'en' ? 'text-primary' : 'text-gray-400'}`}>ENGLISH</span>
                                            {i18n.language === 'en' && <div className="absolute top-1 right-1"><i className="fas fa-check-circle text-primary text-[10px]"></i></div>}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Branding - Clean */}
                        <div className="py-4 px-8 bg-gray-50 border-t border-gray-100 flex items-center justify-center gap-3">
                            <img
                                src={getLogoUrl(settings.app_logo)}
                                alt="Logo"
                                className="h-4 w-auto grayscale opacity-50"
                            />
                            <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.4em]">{settings.app_name || 'EVENTCEK'}</span>
                        </div>
                    </div>
                </Modal>
            </nav>

            {/* Children Content */}
            <main className={`${hasHeaderSpacer ? 'pt-20 sm:pt-24' : 'pt-0'} ${noPadding ? 'p-0' : 'p-3 sm:p-6 lg:p-8'} ${fluid ? 'max-w-none' : 'max-w-7xl mx-auto'}`}>
                {children}
            </main>

            {/* Footer */}
            <div className="pb-20 md:pb-0">
                <Footer
                    appName={settings.app_name || 'EventCek'}
                    appLogo={getLogoUrl(settings.app_logo)}
                />
            </div>

            {/* Premium Mobile Bottom Navigation Bar - Bulging Center Mode */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none">
                {/* The Bar Background with Notch Effect */}
                <div className="relative bg-white shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.1)] border-t border-gray-100 flex items-stretch justify-around px-2 pt-2 pb-safe-offset-2 pointer-events-auto h-20">

                    {/* Left Group */}
                    <div className="flex w-2/5 justify-around items-center">
                        <Link href="/about" className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${url.startsWith('/about') ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`p-2 rounded-xl transition-all ${url.startsWith('/about') ? 'bg-primary/10' : ''}`}>
                                <i className="fas fa-info-circle text-lg"></i>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">About</span>
                        </Link>
                        <Link href="/news" className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${url.startsWith('/news') ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`p-2 rounded-xl transition-all ${url.startsWith('/news') ? 'bg-primary/10' : ''}`}>
                                <i className="fas fa-newspaper text-lg"></i>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">News</span>
                        </Link>
                    </div>

                    {/* Center Bulge - HOME */}
                    <div className="relative w-1/5 flex justify-center">
                        <div className="absolute -top-10 w-20 h-20 bg-gray-50/50 backdrop-blur-sm rounded-full flex items-center justify-center pt-2">
                            <Link
                                href="/"
                                className={`w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-500 transform active:scale-90
                                    ${url === '/'
                                        ? 'bg-primary text-white scale-110 rotate-[360deg] shadow-primary/30'
                                        : 'bg-white text-gray-500 hover:text-primary'
                                    }
                                `}
                            >
                                <i className="fas fa-home text-2xl mb-0.5"></i>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${url === '/' ? 'text-white' : 'text-gray-400'}`}>Home</span>
                            </Link>
                        </div>
                    </div>

                    {/* Right Group */}
                    <div className="flex w-2/5 justify-around items-center">
                        <Link href="/activity" className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${url.startsWith('/activity') ? 'text-primary' : 'text-gray-400'}`}>
                            <div className={`p-2 rounded-xl transition-all ${url.startsWith('/activity') ? 'bg-primary/10' : ''}`}>
                                <i className="fas fa-calendar-alt text-lg"></i>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-tighter">Activity</span>
                        </Link>

                        {auth && auth.user ? (
                            <Link href="/dashboard" className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${url.startsWith('/dashboard') || url.startsWith('/profile') ? 'text-primary' : 'text-gray-400'}`}>
                                <div className={`w-9 h-9 rounded-xl overflow-hidden border-2 transition-all ${url.startsWith('/dashboard') || url.startsWith('/profile') ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200'}`}>
                                    <img
                                        src={auth.user.profile_photo_url || '/assets/images/profilefoto/default-profile.png'}
                                        alt="Profile"
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                    />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Account</span>
                            </Link>
                        ) : (
                            <Link href="/login" className={`flex flex-col items-center justify-center space-y-1 transition-all duration-300 ${url === '/login' ? 'text-primary' : 'text-gray-400'}`}>
                                <div className={`p-2 rounded-xl transition-all ${url === '/login' ? 'bg-primary/10' : ''}`}>
                                    <i className="fas fa-user-circle text-lg"></i>
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-tighter">Login</span>
                            </Link>
                        )}
                    </div>
                </div>
                {/* Safe Area Fill */}
                <div className="h-safe bg-white"></div>
            </div>
        </div>
    );
}
