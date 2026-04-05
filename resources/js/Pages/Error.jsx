import React from 'react';
import { Head } from '@inertiajs/react';

export default function ErrorPage({ status = 500, message, request_id }) {
    const title = status === 404 ? 'Halaman Tidak Ditemukan' : status === 503 ? 'Layanan Tidak Tersedia' : 'Terjadi Kesalahan';
    const fallbackMessage =
        status === 404
            ? 'Halaman yang Anda cari tidak ditemukan.'
            : status === 503
              ? 'Layanan sedang tidak tersedia. Silakan coba lagi nanti.'
              : 'Terjadi kesalahan server. Silakan coba lagi.';

    return (
        <>
            <Head title={title} />
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                    <div className="text-sm text-slate-500 mb-2">HTTP {status}</div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-3">{title}</h1>
                    <p className="text-slate-700 mb-5">{typeof message === 'string' && message.trim() ? message : fallbackMessage}</p>
                    {typeof request_id === 'string' && request_id.trim() ? (
                        <div className="text-sm text-slate-500 bg-slate-100 rounded-lg px-3 py-2">
                            Request ID: <span className="font-mono text-slate-700">{request_id}</span>
                        </div>
                    ) : null}
                    <div className="mt-6 flex gap-3">
                        <button
                            type="button"
                            className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                            onClick={() => window.location.reload()}
                        >
                            Muat Ulang
                        </button>
                        <a
                            href="/"
                            className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 hover:bg-slate-50"
                        >
                            Kembali ke Beranda
                        </a>
                    </div>
                </div>
            </div>
        </>
    );
}

