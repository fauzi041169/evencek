import React, { useState, useEffect } from 'react';
import { Head, usePage, Link } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';

export default function About() {
    const { flash } = usePage().props;
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <WebLayout hasHeaderSpacer={false}>
            <Head title="Tentang Kami - Solusi Enterprise" />
            
            <div className="bg-white font-sans text-slate-800">
                
                {/* HERO SECTION */}
                <div className="relative overflow-hidden bg-slate-900 pt-32 pb-20 lg:pt-48 lg:pb-32">
                    {/* Background Pattern */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-primary/20 rounded-full blur-[120px] opacity-30 mix-blend-screen"></div>
                        <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] opacity-20"></div>
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                    </div>

                    <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 backdrop-blur-md mb-8 animate-fade-in-up">
                            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
                            <span className="text-sm font-medium text-slate-300 tracking-wide">LEADING INNOVATION</span>
                        </div>
                        
                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight max-w-5xl mx-auto">
                            Membangun Masa Depan <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Manajemen Event</span>
                        </h1>
                        
                        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
                            Kami menghadirkan solusi teknologi enterprise untuk mengoptimalkan setiap aspek penyelenggaraan acara Anda. Dari registrasi hingga analitik mendalam.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/register" className="w-full sm:w-auto px-8 py-4 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all transform hover:-translate-y-1">
                                Mulai Sekarang
                                <i className="fas fa-arrow-right ml-2"></i>
                            </Link>
                            <a href="#contact" className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl font-bold transition-all hover:bg-slate-700/80">
                                Hubungi Tim Kami
                            </a>
                        </div>

                        {/* Abstract 3D Elements Placeholder */}
                        <div className="mt-20 relative hidden lg:block">
                             <div className="absolute left-1/2 -translate-x-1/2 top-0 w-3/4 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
                        </div>
                    </div>
                </div>

                {/* STATS SECTION */}
                <div className="relative z-20 -mt-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 lg:p-12 grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                        <div className="space-y-2">
                            <h3 className="text-4xl font-bold text-slate-900">100+</h3>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Project Selesai</p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-4xl font-bold text-slate-900">500+</h3>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Klien Enterprise</p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-4xl font-bold text-slate-900">99%</h3>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Kepuasan Klien</p>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-4xl font-bold text-slate-900">24/7</h3>
                            <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Support Aktif</p>
                        </div>
                    </div>
                </div>

                {/* ABOUT CONTENT */}
                <section className="py-24 bg-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="relative">
                                <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/10 rounded-tl-3xl -z-10"></div>
                                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-secondary/10 rounded-br-3xl -z-10"></div>
                                <img 
                                    src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                                    alt="Team working" 
                                    className="rounded-2xl shadow-2xl w-full object-cover h-[500px]"
                                />
                                <div className="absolute bottom-8 left-8 right-8 bg-white/90 backdrop-blur p-6 rounded-xl shadow-lg border border-white/50">
                                    <p className="text-slate-800 font-medium italic">"Inovasi adalah jantung dari setiap solusi yang kami bangun. Kami tidak hanya membuat software, kami menciptakan ekosistem."</p>
                                </div>
                            </div>
                            
                            <div>
                                <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-3">Tentang Perusahaan</h2>
                                <h3 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">Partner Teknologi Terpercaya Anda</h3>
                                <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                                    Kami adalah perusahaan teknologi yang berfokus pada pengembangan sistem manajemen event terintegrasi. Dengan pengalaman bertahun-tahun, kami memahami kompleksitas penyelenggaraan acara dan menghadirkan solusi yang menyederhanakan proses tersebut.
                                </p>
                                <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                    Platform kami dirancang untuk skalabilitas, keamanan, dan kemudahan penggunaan, memastikan setiap stakeholder - dari panitia hingga peserta - mendapatkan pengalaman terbaik.
                                </p>
                                
                                <div className="grid sm:grid-cols-2 gap-6">
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                            <i className="fas fa-shield-alt text-xl"></i>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg">Keamanan Data</h4>
                                            <p className="text-sm text-slate-500 mt-1">Standar keamanan enterprise grade untuk melindungi data Anda.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                            <i className="fas fa-rocket text-xl"></i>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 text-lg">Performa Tinggi</h4>
                                            <p className="text-sm text-slate-500 mt-1">Infrastruktur cloud yang dioptimalkan untuk kecepatan akses.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FEATURES GRID */}
                <section className="py-24 bg-slate-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center max-w-3xl mx-auto mb-16">
                            <h2 className="text-primary font-bold tracking-wider uppercase text-sm mb-3">Fitur Unggulan</h2>
                            <h3 className="text-4xl font-bold text-slate-900 mb-6">Solusi Lengkap End-to-End</h3>
                            <p className="text-lg text-slate-600">Platform kami menyediakan semua alat yang Anda butuhkan untuk menyukseskan acara Anda.</p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { title: 'Manajemen Peserta', desc: 'Sistem registrasi online yang mulus dengan validasi otomatis.', icon: 'fa-users', color: 'bg-blue-500' },
                                { title: 'Analitik Real-time', desc: 'Dashboard data komprehensif untuk memantau performa event.', icon: 'fa-chart-pie', color: 'bg-indigo-500' },
                                { title: 'Sistem Pembayaran', desc: 'Integrasi payment gateway aman untuk transaksi tiket.', icon: 'fa-credit-card', color: 'bg-violet-500' },
                                { title: 'Sertifikat Digital', desc: 'Generate sertifikat otomatis dengan QR code verifikasi.', icon: 'fa-certificate', color: 'bg-purple-500' },
                                { title: 'Absensi QR', desc: 'Check-in cepat dan akurat menggunakan teknologi QR Code.', icon: 'fa-qrcode', color: 'bg-fuchsia-500' },
                                { title: 'Laporan Otomatis', desc: 'Export data laporan lengkap dalam berbagai format.', icon: 'fa-file-alt', color: 'bg-pink-500' },
                            ].map((item, idx) => (
                                <div key={idx} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group">
                                    <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center text-white text-2xl mb-6 shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform`}>
                                        <i className={`fas ${item.icon}`}></i>
                                    </div>
                                    <h4 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h4>
                                    <p className="text-slate-600 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CALL TO ACTION */}
                <section className="py-20 bg-slate-900 relative overflow-hidden" id="contact">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                    <div className="absolute right-0 top-0 w-1/3 h-full bg-gradient-to-l from-primary/10 to-transparent"></div>
                    
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Siap Mengubah Cara Anda Mengelola Event?</h2>
                        <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">Bergabunglah dengan ratusan organisasi yang telah mempercayakan manajemen event mereka kepada kami.</p>
                        
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <a href="mailto:contact@eventcek.com" className="px-8 py-4 bg-white text-slate-900 rounded-xl font-bold hover:bg-slate-50 transition-colors shadow-lg">
                                Hubungi Sales
                            </a>
                            <Link href="/register" className="px-8 py-4 bg-transparent border border-slate-600 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                                Coba Gratis Demo
                            </Link>
                        </div>
                    </div>
                </section>
                
                {/* FOOTER SIMPLE */}
                <footer className="bg-slate-950 py-12 border-t border-slate-800">
                     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-slate-400 text-sm">
                            &copy; {new Date().getFullYear()} EventCek Management System. All rights reserved.
                        </div>
                        <div className="flex gap-6">
                            <a href="#" className="text-slate-500 hover:text-white transition-colors"><i className="fab fa-facebook text-xl"></i></a>
                            <a href="#" className="text-slate-500 hover:text-white transition-colors"><i className="fab fa-twitter text-xl"></i></a>
                            <a href="#" className="text-slate-500 hover:text-white transition-colors"><i className="fab fa-instagram text-xl"></i></a>
                            <a href="#" className="text-slate-500 hover:text-white transition-colors"><i className="fab fa-linkedin text-xl"></i></a>
                        </div>
                     </div>
                </footer>
            </div>
        </WebLayout>
    );
}
