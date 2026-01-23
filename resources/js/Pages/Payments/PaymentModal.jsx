import React from 'react';

export default function PaymentModal({ open, onClose, children, title = 'Detail Pembayaran' }) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        ×
                    </button>
                </div>
                <div className="p-4">{children}</div>
            </div>
        </div>
    );
}
