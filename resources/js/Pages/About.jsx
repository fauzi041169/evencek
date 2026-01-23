import React, { useState, useEffect } from 'react';
import { Head, usePage, Link } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';
import PageHero from '@/Components/PageHero';

export default function About({ heroAnim = 'circles' }) {
    const { flash, errors } = usePage().props;
    const [editMode, setEditMode] = useState(false);

    useEffect(() => {
        // Initial check
        const storedMode = localStorage.getItem('editMode') === 'true';
        setEditMode(storedMode);

        // Listen for changes
        const handleEditModeChange = () => {
            const newMode = localStorage.getItem('editMode') === 'true';
            setEditMode(newMode);
        };

        window.addEventListener('editModeChanged', handleEditModeChange);
        return () => window.removeEventListener('editModeChanged', handleEditModeChange);
    }, []);

    return (
        <WebLayout hasHeaderSpacer={false}>
            <div className="min-h-screen bg-white">
                <Head title="Tentang Kami" />

                <PageHero 
                    title="Tentang Kami" 
                    description="Perusahaan Pengembangan Teknologi dan Aplikasi Sistem Manajemen Iven"
                    heroAnim={heroAnim}
                />

                {/* Section: Profil Perusahaan */}
                <section className="py-12 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    {/* Header Section */}
                    <div className="mb-8">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Profil Perusahaan</h2>
                        <p className="text-gray-600">Solusi teknologi inovatif untuk manajemen inventaris modern</p>
                        <div className="mt-4 h-1 w-24 bg-primary rounded"></div>
                    </div>

                    {/* Alert Messages are handled globally */}


                    {/* Deskripsi Perusahaan */}
                    <div className="mb-12 relative group">
                        {editMode && (
                            <div className="absolute top-4 right-4 z-10">
                                <button className="bg-warning text-white p-2 rounded-lg shadow-lg hover:bg-warning/90 transition-all transform hover:scale-110" onClick={() => alert('Fitur edit teks statis akan segera hadir!')}>
                                    <i className="fas fa-edit"></i> Edit Profil
                                </button>
                            </div>
                        )}
                        <div className={`bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl shadow-lg p-8 mb-8 ${editMode ? 'border-2 border-warning ring-2 ring-warning ring-offset-2' : ''}`}>
                            <p className="text-lg text-gray-700 leading-relaxed mb-4">
                                Kami adalah perusahaan yang berdedikasi untuk mengembangkan teknologi dan aplikasi sistem manajemen inventaris yang modern, efisien, dan mudah digunakan. Dengan pengalaman bertahun-tahun di bidang pengembangan perangkat lunak, kami telah membantu berbagai organisasi dan perusahaan dalam mengoptimalkan proses manajemen inventaris mereka melalui solusi teknologi terkini.
                            </p>
                            <p className="text-lg text-gray-700 leading-relaxed">
                                Sistem Manajemen Iven Hub adalah platform komprehensif yang dirancang khusus untuk mempermudah pengelolaan inventaris, mulai dari pencatatan, pelacakan, hingga pelaporan. Dengan antarmuka yang intuitif dan fitur-fitur canggih, kami memastikan setiap pengguna dapat mengoptimalkan efisiensi operasional mereka.
                            </p>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                        <div className="bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-all duration-300">
                            <i className="fas fa-code text-4xl text-white mb-3"></i>
                            <div className="text-3xl font-bold text-white mb-2">100+</div>
                            <div className="text-white text-sm font-medium">Aplikasi Dikembangkan</div>
                        </div>
                        <div className="bg-gradient-to-br from-success to-success/80 rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-all duration-300">
                            <i className="fas fa-users text-4xl text-white mb-3"></i>
                            <div className="text-3xl font-bold text-white mb-2">500+</div>
                            <div className="text-white text-sm font-medium">Klien Puas</div>
                        </div>
                        <div className="bg-gradient-to-br from-warning to-warning/80 rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-all duration-300">
                            <i className="fas fa-server text-4xl text-white mb-3"></i>
                            <div className="text-3xl font-bold text-white mb-2">99.9%</div>
                            <div className="text-white text-sm font-medium">Uptime</div>
                        </div>
                        <div className="bg-gradient-to-br from-danger to-danger/80 rounded-xl shadow-lg p-6 text-center transform hover:scale-105 transition-all duration-300">
                            <i className="fas fa-award text-4xl text-white mb-3"></i>
                            <div className="text-3xl font-bold text-white mb-2">10+</div>
                            <div className="text-white text-sm font-medium">Tahun Pengalaman</div>
                        </div>
                    </div>

                    {/* Visi & Misi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-primary hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center mb-4">
                                <div className="bg-primary/10 rounded-full p-3 mr-4">
                                    <i className="fas fa-eye text-primary text-xl"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Visi</h3>
                            </div>
                            <p className="text-gray-600 leading-relaxed">
                                Menjadi perusahaan teknologi terdepan di Indonesia yang menghadirkan solusi sistem manajemen inventaris yang inovatif, terpercaya, dan berkelanjutan untuk mendukung efisiensi operasional berbagai sektor bisnis.
                            </p>
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-secondary hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center mb-4">
                                <div className="bg-secondary/10 rounded-full p-3 mr-4">
                                    <i className="fas fa-bullseye text-secondary text-xl"></i>
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900">Misi</h3>
                            </div>
                            <ul className="space-y-3 text-gray-600">
                                <li className="flex items-start">
                                    <i className="fas fa-check-circle text-success mr-3 mt-1"></i>
                                    <span>Mengembangkan aplikasi sistem manajemen inventaris yang modern dan user-friendly</span>
                                </li>
                                <li className="flex items-start">
                                    <i className="fas fa-check-circle text-success mr-3 mt-1"></i>
                                    <span>Memberikan layanan teknologi berkualitas tinggi dengan dukungan penuh</span>
                                </li>
                                <li className="flex items-start">
                                    <i className="fas fa-check-circle text-success mr-3 mt-1"></i>
                                    <span>Terus berinovasi dalam teknologi untuk memenuhi kebutuhan klien</span>
                                </li>
                                <li className="flex items-start">
                                    <i className="fas fa-check-circle text-success mr-3 mt-1"></i>
                                    <span>Membangun kemitraan jangka panjang dengan berbagai organisasi</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Fitur Unggulan */}
                    <div className="mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Fitur Unggulan</h2>
                        <p className="text-gray-600 mb-6">Teknologi dan layanan terbaik yang kami tawarkan</p>
                        <div className="mt-4 h-1 w-24 bg-primary rounded mb-8"></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                {
                                    title: 'Manajemen Inventaris',
                                    desc: 'Sistem lengkap untuk pengelolaan inventaris dengan fitur pencatatan, pelacakan, dan monitoring real-time yang akurat.',
                                    icon: 'fa-boxes',
                                    gradient: 'from-primary to-secondary'
                                },
                                {
                                    title: 'Analitik & Laporan',
                                    desc: 'Dashboard analitik canggih dengan berbagai jenis laporan yang dapat disesuaikan untuk mendukung pengambilan keputusan.',
                                    icon: 'fa-chart-line',
                                    gradient: 'from-success to-success/80'
                                },
                                {
                                    title: 'Akses Multi-Platform',
                                    desc: 'Aplikasi yang dapat diakses melalui berbagai perangkat dengan desain responsif dan kompatibel dengan berbagai sistem operasi.',
                                    icon: 'fa-mobile-alt',
                                    gradient: 'from-warning to-warning/80'
                                }
                            ].map((feature, index) => (
                                <div key={index} className={`bg-white rounded-xl shadow-lg overflow-hidden group hover:shadow-xl transition-all duration-300 relative ${editMode ? 'border-2 border-warning ring-2 ring-warning ring-offset-2' : ''}`}>
                                    {editMode && (
                                        <div className="absolute top-4 right-4 z-10">
                                            <button className="bg-warning text-white p-2 rounded-lg shadow-lg hover:bg-warning/90 transition-all transform hover:scale-110" onClick={() => alert(`Edit fitur: ${feature.title}`)}>
                                                <i className="fas fa-edit"></i>
                                            </button>
                                        </div>
                                    )}
                                    <div className={`bg-gradient-to-br ${feature.gradient} p-8 text-center`}>
                                        <i className={`fas ${feature.icon} text-5xl text-white`}></i>
                                    </div>
                                    <div className="p-6">
                                        <h4 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h4>
                                        <p className="text-gray-600">
                                            {feature.desc}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Keunggulan */}
                    <div className="mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Keunggulan Kami</h2>
                        <p className="text-gray-600 mb-6">Apa yang membuat kami berbeda</p>
                        <div className="mt-4 h-1 w-24 bg-primary rounded mb-8"></div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                {
                                    title: 'Keamanan Data Terjamin',
                                    desc: 'Sistem keamanan tingkat enterprise dengan enkripsi data dan backup otomatis untuk melindungi informasi penting Anda.',
                                    icon: 'fa-shield-alt',
                                    iconBg: 'bg-secondary/10',
                                    iconColor: 'text-secondary'
                                },
                                {
                                    title: 'Dukungan 24/7',
                                    desc: 'Tim support profesional yang siap membantu Anda kapan saja dengan respons cepat dan solusi yang tepat.',
                                    icon: 'fa-headset',
                                    iconBg: 'bg-green-100',
                                    iconColor: 'text-green-600'
                                },
                                {
                                    title: 'Update Berkala',
                                    desc: 'Pembaruan fitur dan perbaikan sistem secara rutin untuk memastikan performa optimal dan keamanan terbaru.',
                                    icon: 'fa-sync-alt',
                                    iconBg: 'bg-primary/10',
                                    iconColor: 'text-primary'
                                },
                                {
                                    title: 'Kustomisasi Fleksibel',
                                    desc: 'Solusi yang dapat disesuaikan dengan kebutuhan spesifik organisasi Anda untuk memaksimalkan efisiensi.',
                                    icon: 'fa-cogs',
                                    iconBg: 'bg-orange-100',
                                    iconColor: 'text-orange-600'
                                }
                            ].map((item, index) => (
                                <div key={index} className={`flex items-start space-x-4 p-6 bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 relative ${editMode ? 'border-2 border-warning ring-2 ring-warning ring-offset-2' : ''}`}>
                                    {editMode && (
                                        <div className="absolute top-2 right-2 z-10">
                                            <button className="bg-yellow-400 text-white p-1.5 rounded-lg shadow-lg hover:bg-yellow-500 transition-all transform hover:scale-110" onClick={() => alert(`Edit keunggulan: ${item.title}`)}>
                                                <i className="fas fa-edit text-xs"></i>
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex-shrink-0">
                                        <div className={`${item.iconBg} rounded-full p-3`}>
                                            <i className={`fas ${item.icon} ${item.iconColor} text-xl`}></i>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h4>
                                        <p className="text-gray-600">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>
            </div>
        </WebLayout>
    );
}

