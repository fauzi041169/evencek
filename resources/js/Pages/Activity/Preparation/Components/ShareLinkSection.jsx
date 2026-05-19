import React from 'react';
import Swal from 'sweetalert2';

export default function ShareLinkSection({ activity }) {
    const activityId = activity.uid || activity.id;
    const shareUrl = `${window.location.origin}/activity/${activityId}/detail?masuk=true`;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        Swal.fire({
            icon: 'success',
            title: 'Link Disalin',
            text: 'Link masuk kegiatan berhasil disalin ke clipboard',
            timer: 2000,
            showConfirmButton: false
        });
    };

    return (
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden mb-6 transition-all hover:shadow-md duration-300">
            <div className="p-6 sm:p-10">
                <div className="flex flex-col md:flex-row gap-10 items-center">
                    <div className="flex-1 space-y-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-3 w-3 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tighter">Link Berbagi</h3>
                            </div>
                            <p className="text-slate-500 font-medium">
                                Bagikan link ini kepada peserta untuk langsung masuk ke halaman kegiatan (otomatis popup login).
                            </p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
                            <div className="flex-1 bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100 text-sm font-mono text-slate-600 break-all">
                                {shareUrl}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-8 py-4 rounded-3xl bg-primary text-white font-bold shadow-lg shadow-primary/20 hover:bg-indigo-700 transition-all active:scale-95"
                            >
                                <i className="fas fa-copy"></i>
                                Salin Link
                            </button>
                        </div>
                    </div>
                    
                    <div className="hidden lg:flex h-32 w-32 bg-indigo-50 rounded-full items-center justify-center text-primary/20">
                        <i className="fas fa-share-nodes text-6xl"></i>
                    </div>
                </div>
            </div>
        </div>
    );
}
