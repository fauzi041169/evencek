import React, { useState } from 'react';

export default function RegistrationTypeModal({ isOpen, onClose, onSelectType, requiredFields = [] }) {
    const [voucherCode, setVoucherCode] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10040] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            {/* Centering Container */}
            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">

                {/* Backdrop: Transparent/Blur instead of dark gray */}
                <div
                    className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                    aria-hidden="true"
                    onClick={onClose}
                ></div>

                {/* Modal Panel */}
                <div className="relative transform rounded-2xl bg-white text-left shadow-2xl transition-all w-full max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain touch-pan-y">
                    {/* Decorative Top Bar */}
                    <div className="h-2 w-full bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100 focus:outline-none"
                    >
                        <i className="fas fa-times text-xl"></i>
                    </button>

                    <div className="px-6 py-6 sm:px-8 sm:py-10">
                        <div className="text-center mb-8">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 mb-5 ring-4 ring-indigo-50">
                                <i className="fas fa-clipboard-check text-2xl text-indigo-600"></i>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900" id="modal-title">
                                Metode Pendaftaran
                            </h3>
                            <p className="mt-2 text-sm text-gray-500 max-w-xs mx-auto">
                                Pilih jenis pendaftaran yang sesuai dengan kebutuhan Anda
                            </p>
                        </div>

                        {/* Mandatory Fields Info */}
                        {requiredFields && requiredFields.length > 0 && (
                            <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-100 text-left animate-fade-in-down">
                                <h4 className="text-xs font-bold text-amber-800 mb-2 uppercase tracking-wider flex items-center gap-2">
                                    <i className="fas fa-info-circle"></i>
                                    Data Wajib Dilengkapi
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {requiredFields.map((field, idx) => (
                                        <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-white text-amber-700 border border-amber-200 shadow-sm">
                                            {field}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-[10px] text-amber-600/80 mt-2 italic">
                                    *Pastikan data di atas sudah lengkap pada profil Anda
                                </p>
                            </div>
                        )}

                        {/* Voucher Code Input */}
                        <div className="mb-4">
                            <label htmlFor="voucher_code" className="block text-sm font-medium text-gray-700 mb-1 text-left">
                                Kode Voucher Panitia (Opsional)
                            </label>
                            <input
                                type="text"
                                id="voucher_code"
                                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="Masukkan kode jika ada"
                                value={voucherCode}
                                onChange={(e) => setVoucherCode(e.target.value)}
                            />
                        </div>

                        <div className="space-y-4">
                            {/* Mandiri Button */}
                            <button
                                type="button"
                                onClick={() => onSelectType('mandiri', false, voucherCode)}
                                className="group relative flex w-full items-center rounded-xl border border-gray-200 p-4 hover:border-primary hover:bg-primary/5 hover:shadow-md transition-all duration-200 text-left"
                            >
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                                    <i className="fas fa-user text-lg"></i>
                                </div>
                                <div className="ml-4 flex-1">
                                    <p className="text-base font-bold text-gray-900 group-hover:text-primary">Daftar Mandiri</p>
                                    <p className="text-xs text-gray-500">Pendaftaran untuk perorangan</p>
                                </div>
                                <div className="ml-2 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200">
                                    <i className="fas fa-chevron-right"></i>
                                </div>
                            </button>

                            {/* Kelompok Button */}
                            <button
                                type="button"
                                onClick={() => onSelectType('kelompok')}
                                className="group relative flex w-full items-center rounded-xl border border-gray-200 p-4 hover:border-emerald-500 hover:bg-emerald-50/50 hover:shadow-md transition-all duration-200 text-left"
                            >
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-200">
                                    <i className="fas fa-users text-lg"></i>
                                </div>
                                <div className="ml-4 flex-1">
                                    <p className="text-base font-bold text-gray-900 group-hover:text-emerald-700">Daftar Kelompok</p>
                                    <p className="text-xs text-gray-500">Pendaftaran kolektif (Instansi/Grup)</p>
                                </div>
                                <div className="ml-2 text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all duration-200">
                                    <i className="fas fa-chevron-right"></i>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
