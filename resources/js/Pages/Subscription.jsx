import React, { useEffect } from 'react';
import { Head, usePage } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import PageHero from '@/Components/PageHero';

export default function Subscription({ plans, activePlanIds, heroAnim, midtransStatus }) {
    const { flash, errors, csrf_token } = usePage().props;

    // Helper to format currency if not provided by backend (fallback)
    const formatCurrency = (price) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price).replace('IDR', 'Rp');
    };

    // Helper to get CSRF token
    const getCsrfToken = () => {
        if (csrf_token) return csrf_token;
        const meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.getAttribute('content') : '';
    };

    const currentCsrfToken = getCsrfToken();

    return (
        <WebLayout hasHeaderSpacer={false} fluid={true} noPadding={true}>
            <Head>
                <title>Paket Berlangganan</title>
            </Head>

            {/* Hero Section */}
            <PageHero
                title="Paket Berlangganan"
                description="Pilih paket yang sesuai dengan kebutuhan sistem manajemen inventaris Anda"
                heroAnim={heroAnim}
            />

            {/* Section: Paket Berlangganan */}
            <section className="py-0 sm:py-8 px-2 sm:px-6 lg:px-8 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    {/* Error Alert */}
                    {(flash?.error || (flash?.success === false)) && (
                        <div className="mb-8 p-4 rounded-lg border-l-4 border-red-500 bg-red-50 shadow-sm">
                            <div className="flex items-start">
                                <i className="fas fa-exclamation-triangle text-red-600 mr-3 mt-1"></i>
                                <div>
                                    <h3 className="text-red-800 font-semibold mb-1">Terjadi kesalahan saat membuat token pembayaran</h3>
                                    <p className="text-red-700">{flash.error}</p>

                                    {/* Debug Info */}
                                    <div className="mt-3 text-sm text-red-800">
                                        <p className="mb-1">Petunjuk cepat:</p>
                                        <ul className="list-disc ml-5">
                                            <li>Periksa konfigurasi kunci server dan client pembayaran di file `.env`</li>
                                            <li>Pastikan mode lingkungan sesuai: sandbox=`false`, production=`true`</li>
                                            <li>Setelah mengubah `.env`, jalankan `php artisan config:clear` dan `php artisan cache:clear`</li>
                                        </ul>
                                        {/* We assume app.debug is handled by checking midtransStatus presence or a prop */}
                                        {midtransStatus && (
                                            <div className="mt-2">
                                                <span className="inline-block bg-white border border-red-200 rounded px-2 py-1">
                                                    Env: {midtransStatus.isProduction ? 'Production' : 'Sandbox'}
                                                </span>
                                                <span className="inline-block bg-white border border-red-200 rounded px-2 py-1 ml-2">
                                                    Client key set: {midtransStatus.clientKeySet ? 'Ya' : 'Tidak'}
                                                </span>
                                                <span className="inline-block bg-white border border-red-200 rounded px-2 py-1 ml-2">
                                                    Server key set: {midtransStatus.serverKeySet ? 'Ya' : 'Tidak'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Header Section */}
                    <div className="text-center mb-4 sm:mb-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Pilih Paket Terbaik Untuk Anda</h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Semua paket dilengkapi dengan fitur lengkap untuk manajemen kegiatan, berita, dan sistem manajemen acara dengan dukungan profesional 24/7
                        </p>
                        <div className="mt-4 h-1 w-24 bg-primary rounded mx-auto"></div>
                    </div>

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 mb-8 sm:mb-10">
                        {plans.map((plan, index) => {
                            const isPro = plan.slug === 'pro';
                            const isBasic = plan.slug === 'basic';

                            // Determine gradient
                            let gradientClass = 'from-orange-500 to-orange-600';
                            let buttonClass = 'bg-orange-600 hover:bg-orange-700';
                            if (isBasic) {
                                gradientClass = 'from-blue-500 to-secondary';
                                buttonClass = 'bg-secondary hover:bg-blue-700';
                            } else if (isPro) {
                                gradientClass = 'from-purple-500 to-purple-600';
                                buttonClass = 'bg-primary hover:bg-purple-700';
                            }

                            // Manual limit check
                            const manualLimit = plan.features && typeof plan.features === 'object'
                                ? plan.features['manual_activities_limit']
                                : null;

                            // Active check
                            const isPlanActive = activePlanIds && activePlanIds.includes(plan.id);

                            return (
                                <div
                                    key={plan.id}
                                    className={`bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 ${isPro ? 'border-4 border-purple-500 relative' : ''}`}
                                    data-aos="fade-up"
                                    data-aos-delay={(index + 1) * 100}
                                >
                                    {isPro && (
                                        <div className="absolute top-0 right-0 bg-purple-500 text-white px-4 py-1 rounded-bl-lg text-sm font-semibold">
                                            Paling Populer
                                        </div>
                                    )}
                                    <div className={`bg-gradient-to-br ${gradientClass} p-4 sm:p-6 text-center`}>
                                        <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                                        <div className="mt-4">
                                            <span className="text-4xl font-bold text-white">
                                                {plan.formatted_price || formatCurrency(plan.price)}
                                            </span>
                                            <span className="text-white opacity-90">/bulan</span>
                                        </div>
                                        {plan.trial_days > 0 && (
                                            <div className="mt-2">
                                                <span className="text-sm text-white opacity-90">Trial {plan.trial_days} hari gratis</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3 sm:p-8">
                        <ul className="space-y-4 mb-6 sm:mb-8">
                                            {/* Max Activities */}
                                            <li className="flex items-start">
                                                <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                <span className="text-gray-700">
                                                    {plan.max_activities
                                                        ? `Manajemen kegiatan hingga ${new Intl.NumberFormat().format(plan.max_activities)} aktivitas`
                                                        : 'Manajemen kegiatan unlimited'}
                                                </span>
                                            </li>
                                            {/* Max Users */}
                                            <li className="flex items-start">
                                                <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                <span className="text-gray-700">
                                                    {plan.max_users
                                                        ? `Hingga ${new Intl.NumberFormat().format(plan.max_users)} pengguna aktif`
                                                        : 'Pengguna unlimited'}
                                                </span>
                                            </li>
                                            {/* Max News */}
                                            <li className="flex items-start">
                                                <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                <span className="text-gray-700">
                                                    {plan.max_news
                                                        ? `Manajemen berita hingga ${new Intl.NumberFormat().format(plan.max_news)} artikel`
                                                        : 'Manajemen berita unlimited'}
                                                </span>
                                            </li>
                                            {/* Max Participants */}
                                            <li className="flex items-start">
                                                <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                <span className="text-gray-700">
                                                    {plan.max_participants_per_activity
                                                        ? `Maksimal ${new Intl.NumberFormat().format(plan.max_participants_per_activity)} peserta per acara`
                                                        : 'Peserta per acara unlimited'}
                                                </span>
                                            </li>
                                            {/* Manual Limit */}
                                            <li className="flex items-start">
                                                <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                <span className="text-gray-700">
                                                    {manualLimit !== null && manualLimit !== undefined
                                                        ? `Jumlah aktivitas manual berbayar hingga ${new Intl.NumberFormat().format(parseInt(manualLimit))}`
                                                        : 'Jumlah aktivitas manual berbayar unlimited'}
                                                </span>
                                            </li>
                                            {/* Max Committees */}
                                            <li className="flex items-start">
                                                <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                <span className="text-gray-700">
                                                    {plan.max_committees_per_activity
                                                        ? `Maksimal ${new Intl.NumberFormat().format(plan.max_committees_per_activity)} panitia per acara`
                                                        : 'Panitia per acara unlimited'}
                                                </span>
                                            </li>
                                            {/* Analytics */}
                                            <li className="flex items-start">
                                                <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                <span className="text-gray-700">
                                                    {plan.has_analytics ? 'Dashboard acara lengkap' : 'Laporan dasar kegiatan'}
                                                </span>
                                            </li>
                                            {/* Support */}
                                            <li className="flex items-start">
                                                <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                <span className="text-gray-700">
                                                    {plan.has_priority_support ? 'Dukungan prioritas (respons 4 jam)' : 'Dukungan email (respons 24 jam)'}
                                                </span>
                                            </li>
                                            {/* API Access */}
                                            {plan.has_api_access && (
                                                <li className="flex items-start">
                                                    <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                    <span className="text-gray-700">API access & integrasi custom</span>
                                                </li>
                                            )}
                                            {/* White Label */}
                                            {plan.has_white_label && (
                                                <li className="flex items-start">
                                                    <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                    <span className="text-gray-700">Kustomisasi & white-label</span>
                                                </li>
                                            )}
                                            {/* Other Features */}
                                            {plan.features && Array.isArray(plan.features) && plan.features.map((feature, k) => {
                                                if (k === 'manual_activities_limit' || feature === null) return null;
                                                return (
                                                    <li key={k} className="flex items-start">
                                                        <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                        <span className="text-gray-700">{feature}</span>
                                                    </li>
                                                );
                                            })}
                                            {/* Handle object features if not array */}
                                            {plan.features && !Array.isArray(plan.features) && Object.entries(plan.features).map(([key, feature], k) => {
                                                if (key === 'manual_activities_limit') return null;
                                                return (
                                                    <li key={key} className="flex items-start">
                                                        <i className="fas fa-check-circle text-green-500 mr-3 mt-1"></i>
                                                        <span className="text-gray-700">{feature}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>

                                        {/* Action Button */}
                                        {/* We use usePage().props.auth.user to check auth, but here we can just check if user is logged in via shared props */}
                                        {usePage().props.auth?.user ? (
                                            isPlanActive ? (
                                                <a href={route('subscriptions.manage')} className="block w-full bg-gray-600 hover:bg-gray-700 text-white text-center py-3 px-6 rounded-lg font-semibold transition-all duration-200">
                                                    Paket Aktif
                                                </a>
                                            ) : (
                                                <form action={route('subscriptions.subscribe', plan.slug)} method="POST">
                                                    <input type="hidden" name="_token" value={currentCsrfToken} />
                                                    <button type="submit" className={`block w-full ${buttonClass} text-white text-center py-3 px-6 rounded-lg font-semibold transition-all duration-200`}>
                                                        {isBasic ? 'Mulai Sekarang' : 'Upgrade Sekarang'}
                                                    </button>
                                                </form>
                                            )
                                        ) : (
                                            <a href={route('auth.register')} className={`block w-full ${buttonClass} text-white text-center py-3 px-6 rounded-lg font-semibold transition-all duration-200`}>
                                                Mulai Sekarang
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Section: Keuntungan Berlangganan */}
            <section className="py-2 sm:py-8 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-4 sm:mb-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Keuntungan Berlangganan</h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            Nikmati berbagai keuntungan eksklusif dengan menjadi pelanggan kami
                        </p>
                        <div className="mt-4 h-1 w-24 bg-primary rounded mx-auto"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
                        {/* Keuntungan 1 */}
                                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300" data-aos="fade-up">
                            <div className="bg-secondary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                                <i className="fas fa-cloud text-secondary text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Akses Cloud 24/7</h3>
                            <p className="text-gray-600">
                                Akses data inventaris Anda kapan saja, di mana saja dengan sistem cloud yang handal dan terpercaya.
                            </p>
                        </div>

                        {/* Keuntungan 2 */}
                        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300" data-aos="fade-up" data-aos-delay="100">
                            <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                                <i className="fas fa-sync-alt text-green-600 text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Update Otomatis</h3>
                            <p className="text-gray-600">
                                Dapatkan fitur terbaru dan peningkatan sistem secara otomatis tanpa biaya tambahan.
                            </p>
                        </div>

                        {/* Keuntungan 3 */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300" data-aos="fade-up" data-aos-delay="200">
                            <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                                <i className="fas fa-shield-alt text-primary text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Keamanan Terjamin</h3>
                            <p className="text-gray-600">
                                Data Anda dilindungi dengan enkripsi tingkat enterprise dan backup berkala yang aman.
                            </p>
                        </div>

                        {/* Keuntungan 4 */}
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300" data-aos="fade-up" data-aos-delay="300">
                            <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                                <i className="fas fa-headset text-yellow-600 text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Dukungan Profesional</h3>
                            <p className="text-gray-600">
                                Tim support berpengalaman siap membantu Anda dengan respons cepat dan solusi tepat sasaran.
                            </p>
                        </div>

                        {/* Keuntungan 5 */}
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300" data-aos="fade-up" data-aos-delay="400">
                            <div className="bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                                <i className="fas fa-chart-line text-primary text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Analitik & Laporan</h3>
                            <p className="text-gray-600">
                                Pantau performa kegiatan dan inventaris dengan dashboard analitik yang komprehensif.
                            </p>
                        </div>

                        {/* Keuntungan 6 */}
                        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300" data-aos="fade-up" data-aos-delay="500">
                            <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                                <i className="fas fa-mobile-alt text-red-600 text-2xl"></i>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Mobile Friendly</h3>
                            <p className="text-gray-600">
                                Akses sistem dengan nyaman melalui perangkat mobile Anda dengan tampilan yang responsif.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </WebLayout>
    );
}

