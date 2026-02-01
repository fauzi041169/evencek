import React, { useState, useEffect } from 'react';
import Modal from '@/Components/Modal';
import ManualForm from '@/Pages/Payments/ManualForm';
import axios from 'axios';
import Swal from 'sweetalert2';

export default function BulkPaymentModal({ show, onClose, activity, importResult, return_to }) {
    const [loading, setLoading] = useState(false);
    const [paymentMode, setPaymentMode] = useState(null); // 'manual' | 'midtrans'
    const [snapToken, setSnapToken] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [creatorBank, setCreatorBank] = useState(null);
    const [creatorBankAccounts, setCreatorBankAccounts] = useState([]);
    const [defaultSenderName, setDefaultSenderName] = useState('');
    const [defaultSenderBank, setDefaultSenderBank] = useState('');

    useEffect(() => {
        if (show && activity?.id) {
            checkPaymentMode();
        }
    }, [show, activity?.id]);

    const checkPaymentMode = async () => {
        setLoading(true);
        try {
            // Check if we should use Midtrans or Manual
            const response = await axios.get(route('payments.create', { 
                activity: activity.id,
                modal: 1,
                is_bulk: 1
            }));

            // Logic to detect Midtrans redirect
            const isMidtransUrl = response.data.redirect_url && response.data.redirect_url.includes('/midtrans/payment/');
            
            if (isMidtransUrl) {
                setPaymentMode('midtrans');
                // Fetch Snap Token
                const paymentResponse = await axios.get(response.data.redirect_url, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
                    params: { modal: 'true', is_ajax: 'true' }
                });

                if (paymentResponse.data.snapToken) {
                    setSnapToken(paymentResponse.data.snapToken);
                } else {
                    // Fallback if token not found, maybe go to manual or error
                    console.error("Snap token not found in response");
                    setPaymentMode('manual');
                    fetchManualMethods();
                }
            } else {
                // Default to manual
                setPaymentMode('manual');
                fetchManualMethods();
            }
        } catch (error) {
            console.error("Error checking payment mode", error);
            // Fallback to manual if error
            setPaymentMode('manual');
            fetchManualMethods();
        } finally {
            if (paymentMode !== 'manual') { // If manual, fetchManualMethods will handle loading off
                setLoading(false);
            }
        }
    };

    const fetchManualMethods = () => {
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
    };

    const handleSnapPay = () => {
        if (window.snap && snapToken) {
             window.snap.pay(snapToken, {
                onSuccess: (result) => {
                    onClose();
                    window.location.reload();
                },
                onPending: (result) => {
                    onClose();
                    window.location.reload();
                },
                onError: (result) => {
                    console.error(result);
                    Swal.fire('Error', 'Pembayaran gagal atau dibatalkan', 'error');
                },
                onClose: () => {
                    // Do nothing or reload
                }
            });
        } else {
            Swal.fire('Error', 'Sistem pembayaran belum siap. Silakan refresh halaman.', 'error');
        }
    };

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
                ) : paymentMode === 'midtrans' ? (
                    <div className="p-6 text-center space-y-4">
                        <div className="bg-indigo-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-indigo-800">Total Tagihan</h4>
                            <p className="text-2xl font-bold text-indigo-900">
                                Rp {new Intl.NumberFormat('id-ID').format(bulkPaymentData?.gross_amount || 0)}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                Untuk {importResult?.stats?.success || 0} peserta
                            </p>
                        </div>
                        
                        <p className="text-gray-600">
                            Silakan selesaikan pembayaran menggunakan metode otomatis (QRIS, Virtual Account, E-Wallet, dll).
                        </p>

                        <button 
                            onClick={handleSnapPay}
                            disabled={!snapToken}
                            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {snapToken ? 'Bayar Sekarang' : 'Menyiapkan Pembayaran...'}
                        </button>
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
