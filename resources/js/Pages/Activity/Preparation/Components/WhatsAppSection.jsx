import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function WhatsAppSection({ activity, participants = [] }) {
    const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
    const [qrCode, setQrCode] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [selectedRecipientType, setSelectedRecipientType] = useState('all'); // all, active, pending

    const basePath = `/activity/${activity.id}/preparation/whatsapp`;

    const fetchStatus = async () => {
        try {
            const response = await axios.get(`${basePath}/status`);
            if (response.status === 200) {
                const data = response.data;
                setStatus(data.status);
                setQrCode(data.qr);
            } else {
                setStatus('error');
            }
        } catch (err) {
            console.error('Failed to fetch WA status', err);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, [activity.id]);

    const handleLogout = async () => {
        try {
            await axios.post(`${basePath}/logout`);
            fetchStatus();
            Swal.fire('Berhasil', 'WhatsApp berhasil diputuskan', 'success');
        } catch (err) {
            Swal.fire('Error', 'Gagal memutuskan WhatsApp', 'error');
        }
    };

    const startBulkBlast = async () => {
        if (!message.trim()) {
            return Swal.fire('Error', 'Pesan tidak boleh kosong', 'error');
        }

        let recipients = [];
        if (selectedRecipientType === 'all') {
            recipients = participants;
        } else if (selectedRecipientType === 'active') {
            recipients = participants.filter(p => Number(p.status) === 1);
        } else {
            recipients = participants.filter(p => Number(p.status) !== 1);
        }

        if (recipients.length === 0) {
            return Swal.fire('Error', 'Tidak ada penerima yang sesuai kriteria', 'error');
        }

        const result = await Swal.fire({
            title: 'Konfirmasi Blast',
            text: `Anda akan mengirim pesan ke ${recipients.length} peserta. Lanjutkan?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Kirim Sekarang'
        });

        if (!result.isConfirmed) return;

        setSending(true);
        setProgress({ current: 0, total: recipients.length });

        for (let i = 0; i < recipients.length; i++) {
            const p = recipients[i];
            const phone = p.user?.profile?.no_hp || p.phone;
            
            if (!phone) {
                setProgress(prev => ({ ...prev, current: i + 1 }));
                continue;
            }

            // Replace placeholders
            let personalizedMsg = message
                .replace(/{name}/g, p.user?.name || p.name || 'Peserta')
                .replace(/{activity}/g, activity.name)
                .replace(/{status}/g, p.status);

            try {
                await axios.post(`${basePath}/send`, {
                    phone: phone,
                    message: personalizedMsg
                });
            } catch (err) {
                console.error(`Failed to send to ${phone}`, err);
            }

            setProgress(prev => ({ ...prev, current: i + 1 }));
            // Add delay to prevent ban
            await new Promise(r => setTimeout(r, 2000)); 
        }

        setSending(false);
        Swal.fire('Selesai', `Pesan telah dikirim ke ${recipients.length} peserta.`, 'success');
    };

    if (loading) {
        return (
            <div className="p-10 text-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-500 font-medium tracking-tight">Menghubungkan ke layanan WhatsApp...</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-6 transition-all hover:shadow-md duration-300">
            <div className="p-6 sm:p-10">
                <div className="flex flex-col md:flex-row gap-10">
                    {/* Connection Status */}
                    <div className="flex-1 space-y-8">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`h-3 w-3 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">WhatsApp Connection</h3>
                            </div>
                            <p className="text-slate-500 font-medium">
                                {status === 'connected' 
                                    ? 'WhatsApp terhubung. Anda siap untuk mengirim pesan bulk.' 
                                    : 'Silakan hubungkan akun WhatsApp Anda untuk menggunakan fitur blast.'}
                            </p>
                        </div>

                        {status !== 'connected' ? (
                            <div className="bg-slate-50 rounded-3xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
                                {qrCode ? (
                                    <div className="space-y-6 text-center">
                                        <div className="bg-white p-4 rounded-3xl shadow-xl inline-block">
                                            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64" />
                                        </div>
                                        <div className="space-y-2">
                                            <p className="font-bold text-slate-900">Scan QR Code di atas</p>
                                            <p className="text-sm text-slate-500">Buka WhatsApp &gt; Perangkat Tertaut &gt; Tautkan Perangkat</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-4">
                                        <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm text-slate-300">
                                            <i className="fab fa-whatsapp text-4xl"></i>
                                        </div>
                                        <p className="text-slate-400 font-bold">Menunggu QR Code...</p>
                                        {status === 'error' && (
                                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100">
                                                Gagal terhubung ke WhatsApp Service. Pastikan service berjalan.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-green-50 rounded-3xl p-8 border border-green-100">
                                <div className="flex items-center gap-6">
                                    <div className="h-20 w-20 bg-white rounded-full flex items-center justify-center shadow-lg shadow-green-200/50 text-green-500">
                                        <i className="fab fa-whatsapp text-4xl"></i>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xl font-bold text-slate-900">WhatsApp Terhubung</h4>
                                        <p className="text-green-700 font-medium mt-1">Sesi Anda aktif dan siap digunakan.</p>
                                    </div>
                                    <button 
                                        onClick={handleLogout}
                                        className="px-6 py-3 bg-white text-red-600 rounded-2xl font-bold text-sm shadow-sm hover:shadow-md hover:bg-red-50 transition-all active:scale-95"
                                    >
                                        Putuskan Koneksi
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bulk Blast Section */}
                    {status === 'connected' && (
                        <div className="flex-[1.5] space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Bulk Message Blast</h3>
                                <p className="text-slate-500 font-medium">Kirim pesan massal ke peserta kegiatan secara otomatis.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Kirim Ke Siapa?</label>
                                        <select 
                                            value={selectedRecipientType}
                                            onChange={(e) => setSelectedRecipientType(e.target.value)}
                                            className="w-full bg-slate-50 border-none rounded-2xl py-4 px-5 font-bold text-slate-700 focus:ring-2 focus:ring-primary shadow-inner appearance-none"
                                        >
                                            <option value="all">Semua Peserta ({participants.length})</option>
                                            <option value="active">Peserta Aktif ({participants.filter(p => Number(p.status) === 1).length})</option>
                                            <option value="pending">Belum Aktif ({participants.filter(p => Number(p.status) !== 1).length})</option>
                                        </select>
                                    </div>
                                    <div className="bg-primary/5 rounded-2xl p-4 flex items-center gap-3 border border-primary/10">
                                        <div className="h-10 w-10 bg-primary text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
                                            <i className="fas fa-info-circle"></i>
                                        </div>
                                        <p className="text-[10px] text-primary font-bold uppercase leading-tight tracking-wide">
                                            Tips: Gunakan {'{name}'}, {'{activity}'}, {'{status}'} dalam pesan Anda.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Isi Pesan</label>
                                    <textarea 
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Halo {name}, terima kasih telah mendaftar di {activity}..."
                                        rows={6}
                                        className="w-full bg-slate-50 border-none rounded-[2rem] p-6 font-medium text-slate-700 focus:ring-2 focus:ring-primary shadow-inner"
                                    ></textarea>
                                </div>

                                {sending ? (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-sm font-black text-slate-900">Mengirim...</span>
                                            <span className="text-xs font-bold text-slate-400 tracking-widest uppercase">{progress.current} / {progress.total}</span>
                                        </div>
                                        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner">
                                            <div 
                                                className="h-full bg-primary rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={startBulkBlast}
                                        disabled={!message.trim()}
                                        className="w-full py-5 bg-primary text-white rounded-[2rem] font-black text-lg shadow-xl shadow-primary/20 hover:shadow-2xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                                    >
                                        <i className="fas fa-paper-plane mr-3"></i>
                                        Mulai Blast Peserta
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
