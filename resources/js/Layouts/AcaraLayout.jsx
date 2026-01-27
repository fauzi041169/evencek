import React, { useState, useEffect } from 'react';
import { Head, Link, usePage } from '@inertiajs/react';
import Alerts from '../Components/Alerts';

export default function AcaraLayout({ children, activity, title = 'Acara', fluid = false }) {
    const { auth, flash, errors } = usePage().props;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [currentActivityId, setCurrentActivityId] = useState(null);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        // Determine activity ID from various sources
        let activityId = null;
        if (activity && typeof activity === 'object') {
            activityId = activity.id;
        } else if (activity) {
            activityId = activity;
        }
        setCurrentActivityId(activityId);
    }, [activity]);

    // Permissions logic
    const user = auth?.user;
    const isAdmin = user && (user.role === 'admin' || user.role === 'superadmin');
    const isOwner = user && activity && typeof activity === 'object' ? activity.user_id === user.id : false;

    let isCommittee = false;
    if (user && currentActivityId && activity && typeof activity === 'object') {
        isCommittee = activity.is_committee || false;
    }

    const canManageBatches = (user && currentActivityId) && (isAdmin || isOwner || isCommittee) &&
        (!activity || typeof activity !== 'object' || activity.activity_type === 'batch');
    const canManageAttendance = (user && currentActivityId) && (isAdmin || isOwner || isCommittee);

    // Redirect to login if not authenticated
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

    const NavLink = ({ href, icon, label, active }) => (
        <Link
            href={href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group mb-1 ${active
                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
        >
            <i className={`${icon} w-5 text-center text-lg transition-transform group-hover:scale-110 ${active ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}></i>
            <span className="font-medium text-sm">{label}</span>
        </Link>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            <Head title={title} />

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-gray-800 to-gray-900 text-white z-50 transition-transform duration-300 shadow-xl flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0`}
            >
                {/* Brand */}
                <div className="h-16 flex items-center px-6 bg-black/20 border-b border-white/10">
                    <span className="text-lg font-bold tracking-wider text-white">MENU ACARA</span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
                    <div className="space-y-1">
                        <NavLink
                            href="/"
                            icon="fas fa-home"
                            label="Home"
                            active={route().current() === 'home'}
                        />
                        <NavLink
                            href={currentActivityId ? `/activity/${currentActivityId}/dashboard` : '#'}
                            icon="fas fa-tachometer-alt"
                            label="Dashboard"
                            active={route().current('activity.dashboard')}
                        />
                        <NavLink
                            href={currentActivityId ? `/activity/${currentActivityId}/preparation` : '#'}
                            icon="fas fa-tasks"
                            label="Acara"
                            active={route().current('activity.preparation.*')}
                        />
                        <NavLink
                            href={currentActivityId ? route('activity.event-activities.index', currentActivityId) : '#'}
                            icon="fas fa-poll"
                            label="Kegiatan Acara"
                            active={route().current('activity.event-activities.*')}
                        />

                        {canManageBatches && (
                            <NavLink
                                href={currentActivityId ? route('activity.batches.index', currentActivityId) : '#'}
                                icon="fas fa-layer-group"
                                label="Kelola Sesi"
                                active={route().current('activity.batches.*')}
                            />
                        )}

                        <NavLink
                            href={currentActivityId ? route('activity.speakers.index', currentActivityId) : '#'}
                            icon="fas fa-microphone"
                            label="Narasumber"
                            active={route().current('activity.speakers.*')}
                        />

                        {canManageAttendance && (
                            <NavLink
                                href={currentActivityId ? route('attendance.management', { activity: currentActivityId }) : '#'}
                                icon="fas fa-clipboard-check"
                                label="Absen"
                                active={route().current('attendance.*')}
                            />
                        )}

                        <NavLink
                            href={currentActivityId ? `/activity/${currentActivityId}/participants` : '#'}
                            icon="fas fa-users"
                            label="Peserta"
                            active={route().current('activity.participants.*')}
                        />
                        <NavLink
                            href={currentActivityId ? `/activity/${currentActivityId}/idcards` : '#'}
                            icon="fas fa-id-badge"
                            label="Kartu ID"
                            active={route().current('activity.idcards')}
                        />
                        <NavLink
                            href={currentActivityId ? `/activity/${currentActivityId}/certificates` : '#'}
                            icon="fas fa-certificate"
                            label="Sertifikat"
                            active={route().current('activity.certificates')}
                        />
                        <NavLink
                            href={currentActivityId ? `/activity/${currentActivityId}` : '#'}
                            icon="fas fa-external-link-alt"
                            label="Halaman Acara"
                            active={route().current('activity.show')}
                        />
                    </div>
                </nav>

                {/* Logout Button */}
                <div className="p-4 border-t border-gray-800 bg-gray-900">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        disabled={loggingOut}
                        onClick={() => setLoggingOut(true)}
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors shadow-sm ${loggingOut ? 'opacity-50 cursor-wait' : ''}`}
                    >
                        <i className={`fas ${loggingOut ? 'fa-spinner fa-spin' : 'fa-sign-out-alt'}`}></i>
                        <span>{loggingOut ? 'Logging out...' : 'Logout'}</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="lg:ml-64 min-h-screen flex flex-col transition-all duration-300">

                {/* Top Navbar */}
                <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-gray-100">
                    <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            {/* Mobile Menu Button */}
                            <button
                                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <i className="fas fa-bars text-xl"></i>
                            </button>

                            {/* Page Title */}
                            <h1 className="text-lg font-bold text-gray-800 tracking-tight ml-1">
                                {title}
                            </h1>
                        </div>

                        {/* Right Side - User Info */}
                        <div className="flex items-center gap-3">
                            <div
                                className="relative"
                                onMouseEnter={() => setIsProfileDropdownOpen(true)}
                                onMouseLeave={() => setIsProfileDropdownOpen(false)}
                            >
                                <button
                                    onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                                    className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-lg p-1 transition-all duration-200 hover:bg-gray-50"
                                >
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-semibold text-gray-700 leading-tight">{user.name}</p>
                                        <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                                    </div>
                                    <img
                                        src={user.profile_photo_url || '/assets/images/profilefoto/default-profile.png'}
                                        alt={user.name}
                                        className="w-9 h-9 rounded-full object-cover border-2 border-primary/20 shadow-sm"
                                        onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                    />
                                </button>

                                {/* Dropdown Menu */}
                                <div
                                    className={`
                                        absolute right-0 pt-2 w-72 z-50 transition-all duration-300 ease-in-out transform origin-top-right
                                        ${isProfileDropdownOpen
                                            ? 'opacity-100 translate-y-0 scale-100 visible pointer-events-auto'
                                            : 'opacity-0 -translate-y-2 scale-95 invisible pointer-events-none'
                                        }
                                    `}
                                >
                                    <div className="bg-white rounded-xl shadow-xl ring-1 ring-black ring-opacity-5 overflow-hidden">
                                        {/* Header */}
                                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.profile_photo_url || '/assets/images/profilefoto/default-profile.png'}
                                                    alt={user.name}
                                                    className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-md"
                                                    onError={(e) => { e.target.src = '/assets/images/profilefoto/default-profile.png'; }}
                                                />
                                                <div className="text-white">
                                                    <p className="text-sm font-bold tracking-wide">{user.name}</p>
                                                    <p className="text-xs text-indigo-200 font-medium capitalize bg-white/20 px-2 py-0.5 rounded-full inline-block mt-0.5">
                                                        {user.role}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Menu Items */}
                                        <div className="p-2">
                                            <div className="grid gap-1">
                                                <Link href="/" className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group">
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary/10 text-primary mr-3 group-hover:bg-primary group-hover:text-white transition-colors">
                                                        <i className="fas fa-home"></i>
                                                    </div>
                                                    Halaman Depan
                                                </Link>
                                                <Link href={`/profile/${user.id}`} className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group">
                                                    <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-secondary/10 text-secondary mr-3 group-hover:bg-secondary group-hover:text-white transition-colors">
                                                        <i className="fas fa-user"></i>
                                                    </div>
                                                    Profil Saya
                                                </Link>

                                                {user.role === 'superadmin' && (
                                                    <Link href="/settings" className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group">
                                                        <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 mr-3 group-hover:bg-gray-600 group-hover:text-white transition-colors">
                                                            <i className="fas fa-cog"></i>
                                                        </div>
                                                        Pengaturan
                                                    </Link>
                                                )}

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
                                                    className="flex items-center w-full text-left px-4 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-primary/5 hover:text-primary transition-colors group"
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
                                                    className={`flex items-center w-full text-left px-4 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors group ${loggingOut ? 'opacity-50 cursor-wait' : ''}`}
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
                    </div>
                </nav>

                {/* Main Content */}
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    <div className={`${fluid ? 'w-full' : 'max-w-7xl'} mx-auto`}>
                        <div className="mb-6">
                            <Alerts flash={flash} errors={errors} />
                        </div>
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
