import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import ManualForm from '@/Pages/Payments/ManualForm';
import axios from 'axios';

export default function BulkPaymentModal({ show, onClose, activity, importResult, return_to }) {
    const [loading, setLoading] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [creatorBank, setCreatorBank] = useState(null);
    const [creatorBankAccounts, setCreatorBankAccounts] = useState([]);
    const [defaultSenderName, setDefaultSenderName] = useState('');
    const [defaultSenderBank, setDefaultSenderBank] = useState('');

    useEffect(() => {
        if (show && activity?.id) {
            setLoading(true);
            axios.get(route('payments.methods', activity.id))
                .then(res => {
                    if (res.data.success) {
                        setPaymentMethods(res.data.paymentMethods);
                        setCreatorBank(res.data.creatorBank);
                        setCreatorBankAccounts(res.data.creatorBankAccounts);
                        setDefaultSenderName(res.data.defaultSenderName);
                        setDefaultSenderBank(res.data.defaultSenderBank);
                    }
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [show, activity?.id]);

    if (!show) return null;

    // Prepare bulk_import_payment object from importResult
    const bulkPaymentData = importResult ? {
        gross_amount: importResult.stats?.total_bill || 0,
        // Add other necessary fields if ManualForm needs them
    } : null;

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="bg-white rounded-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                <div className="bg-indigo-600 px-4 py-3 flex justify-between items-center sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-white">Pembayaran Pendaftaran Massal</h3>
                    <button onClick={onClose} className="text-white hover:text-indigo-200">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <i className="fas fa-circle-notch fa-spin text-3xl text-indigo-600 mb-2"></i>
                        <p>Memuat metode pembayaran...</p>
                    </div>
                ) : (
                    <ManualForm
                        activity={activity}
                        paymentMethods={paymentMethods}
                        bulk_import_payment={bulkPaymentData}
                        is_modal={true}
                        defaultSenderName={defaultSenderName}
                        defaultSenderBank={defaultSenderBank}
                        return_to={return_to}
                        onSuccess={onClose}
                    />
                )}
            </div>
        </Modal>
    );
}
