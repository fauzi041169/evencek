import { Head, useForm, Link, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import CategoryManager from '../../Components/CategoryManager';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { INDONESIAN_BANKS } from '../../Constants/BankList';

export default function Edit({ 
    activity,
    categories, 
    subscriptionLimits, 
    canCreate, 
    currentManualTotalCount, 
    currentAutomaticTotalCount, 
    savedBankAccounts,
    savedBankAccount,
    effectiveStatus,
    registrationStatuses,
    profileFields,
    mandatoryFields,
    manualLimit,
    manualLimitExceeded
}) {
    const { auth } = usePage().props;
    const [previewImage, setPreviewImage] = useState(activity.image ? `/storage/activities/${activity.image}` : null);

    const { data, setData, post, processing, errors, transform } = useForm({
        _method: 'PUT', // For Laravel resource update
        name: activity.name || '',
        category_id: activity.category_id || '',
        activity_type: activity.activity_type || 'non_batch',
        date: activity.date ? activity.date.split('T')[0] : '',
        start_time: activity.start_time ? (activity.start_time.includes('T') ? activity.start_time.split('T')[1].substring(0, 5) : activity.start_time.substring(0, 5)) : '',
        end_date: activity.end_date ? activity.end_date.split('T')[0] : '',
        end_time: activity.end_time ? (activity.end_time.includes('T') ? activity.end_time.split('T')[1].substring(0, 5) : activity.end_time.substring(0, 5)) : '',
        location: activity.location || '',
        price: activity.price || 0,
        payment_method_type: activity.payment_method_type || 'manual',
        status: effectiveStatus || 'public',
        pendaftaran: activity.pendaftaran !== undefined ? activity.pendaftaran : 1,
        description: activity.description || '',
        image: null, // New image upload
        mandatory_profile_fields: mandatoryFields || [],
        show_price: Boolean(activity.show_price),
        manual_payment_details: activity.manual_payment_details || []
    });

    // Helper to add a new bank account
    const addBankAccount = () => {
        setData('manual_payment_details', [
            ...data.manual_payment_details,
            { bank_name: '', account_name: '', account_number: '' }
        ]);
    };

    // Helper to remove a bank account
    const removeBankAccount = (index) => {
        const newAccounts = [...data.manual_payment_details];
        newAccounts.splice(index, 1);
        setData('manual_payment_details', newAccounts);
    };

    // Helper to update a bank account field
    const updateBankAccount = (index, field, value) => {
        const newAccounts = [...data.manual_payment_details];
        newAccounts[index][field] = value;
        setData('manual_payment_details', newAccounts);
    };

    const handleSaveBankAccount = (account) => {
        if (!account.bank_name || !account.account_number || !account.account_name) {
            Swal.fire({
                title: 'Data Tidak Lengkap',
                text: 'Mohon lengkapi data rekening sebelum menyimpan.',
                icon: 'warning',
                confirmButtonColor: '#3085d6'
            });
            return;
        }

        router.post(route('payments.bank-account.save'), account, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                Swal.fire({
                    title: 'Berhasil',
                    text: 'Rekening berhasil disimpan ke profil Anda.',
                    icon: 'success',
                    confirmButtonColor: '#3085d6',
                    timer: 3000,
                    showConfirmButton: false
                });
            },
            onError: (errors) => {
                Swal.fire({
                    title: 'Gagal',
                    text: 'Gagal menyimpan rekening: ' + JSON.stringify(errors),
                    icon: 'error',
                    confirmButtonColor: '#E02424'
                });
            }
        });
    };

    const toggleSavedBankAccount = (savedAccount, checked) => {
        if (checked) {
            // Add to manual_payment_details if not exists
            const exists = data.manual_payment_details.some(
                acc => acc.account_number === savedAccount.account_number && acc.bank_name === savedAccount.bank_name
            );
            if (!exists) {
                setData('manual_payment_details', [
                    ...data.manual_payment_details,
                    { 
                        bank_name: savedAccount.bank_name, 
                        account_number: savedAccount.account_number, 
                        account_name: savedAccount.account_name 
                    }
                ]);
            }
        } else {
            // Remove from manual_payment_details
            const newDetails = data.manual_payment_details.filter(
                acc => !(acc.account_number === savedAccount.account_number && acc.bank_name === savedAccount.bank_name)
            );
            setData('manual_payment_details', newDetails);
        }
    };

    // Handle image preview
    useEffect(() => {
        if (data.image) {
            const objectUrl = URL.createObjectURL(data.image);
            setPreviewImage(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        }
    }, [data.image]);

    // Handle subscription limit checks
    const manualParticipantCap = subscriptionLimits?.max_participants_per_activity ?? null;
    const autoParticipantCap = subscriptionLimits?.auto_max_participants_per_activity ?? null;

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('activity.update', activity.id), {
            forceFormData: true,
        });
    };

    const handleCheckboxChange = (field, checked) => {
        if (checked) {
            setData('mandatory_profile_fields', [...data.mandatory_profile_fields, field]);
        } else {
            setData('mandatory_profile_fields', data.mandatory_profile_fields.filter(f => f !== field));
        }
    };

    return (
        <MainLayout title="Edit Aktivitas">
            <Head title="Edit Aktivitas" />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-4 sm:mb-6">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg sm:rounded-t-xl shadow-lg px-4 sm:px-6 py-3 sm:py-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-center">
                                    <i className="fas fa-edit mr-2 sm:mr-3"></i>
                                    <span className="text-sm sm:text-base lg:text-lg">Edit Aktivitas: {activity.name}</span>
                                </h2>
                                <Link href={route('activity.index')} className="w-full sm:w-auto bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-all flex items-center justify-center text-sm sm:text-base">
                                    <i className="fas fa-arrow-left mr-2"></i>
                                    Kembali
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Alert Errors */}
                    {Object.keys(errors).length > 0 && (
                        <div className="mb-4 sm:mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-3 sm:p-4 shadow-sm">
                            <div className="flex items-start">
                                <i className="fas fa-exclamation-triangle text-red-500 mr-2 sm:mr-3 text-lg sm:text-xl flex-shrink-0 mt-0.5"></i>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm sm:text-base text-red-800 font-semibold mb-2">Terjadi kesalahan saat menyimpan data:</h3>
                                    <ul className="list-disc list-inside text-xs sm:text-sm text-red-700 space-y-1">
                                        {Object.values(errors).map((error, idx) => (
                                            <li key={idx}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Form Card */}
                    <div className="bg-white rounded-b-lg sm:rounded-b-xl shadow-xl overflow-hidden">
                        <form onSubmit={handleSubmit} encType="multipart/form-data">
                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                {/* Name */}
                                <div>
                                    <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-tasks mr-2 text-secondary"></i>Nama Aktivitas
                                    </label>
                                    <input 
                                        type="text" 
                                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
                                        id="name"
                                        value={data.name}
                                        onChange={e => setData('name', e.target.value)}
                                        placeholder="Masukkan nama aktivitas" 
                                        required
                                    />
                                    {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
                                </div>

                                {/* Category & Type */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <label htmlFor="category_id" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="fas fa-tag mr-2 text-secondary"></i>Kategori
                                        </label>
                                        <CategoryManager
                                            initialCategories={categories}
                                            selectedId={data.category_id}
                                            onChange={id => setData('category_id', id)}
                                            error={errors.category_id}
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="activity_type" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="fas fa-shapes mr-2 text-secondary"></i>Jenis Kegiatan
                                        </label>
                                        <div className="relative">
                                            <select 
                                                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.activity_type ? 'border-red-500' : 'border-gray-300'}`}
                                                id="activity_type"
                                                value={data.activity_type}
                                                onChange={e => setData('activity_type', e.target.value)}
                                                required
                                            >
                                                <option value="non_batch">Non-Batch (Sekali Kegiatan)</option>
                                                <option value="batch">Batch (Banyak Gelombang)</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-3 sm:px-4 pointer-events-none text-gray-500">
                                                <i className="fas fa-chevron-down text-xs sm:text-sm"></i>
                                            </div>
                                        </div>
                                        {errors.activity_type && <p className="mt-1 text-xs text-red-500">{errors.activity_type}</p>}
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                                    <div>
                                        <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="far fa-calendar-alt mr-2 text-secondary"></i>Tanggal Mulai
                                        </label>
                                        <input 
                                            type="date" 
                                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
                                            id="date"
                                            value={data.date}
                                            onChange={e => setData('date', e.target.value)}
                                            required
                                        />
                                        {errors.date && <p className="mt-1 text-xs text-red-500">{errors.date}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="start_time" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="far fa-clock mr-2 text-secondary"></i>Waktu Mulai
                                        </label>
                                        <input 
                                            type="time" 
                                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.start_time ? 'border-red-500' : 'border-gray-300'}`}
                                            id="start_time"
                                            value={data.start_time}
                                            onChange={e => setData('start_time', e.target.value)}
                                            required
                                        />
                                        {errors.start_time && <p className="mt-1 text-xs text-red-500">{errors.start_time}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="end_date" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="far fa-calendar-check mr-2 text-secondary"></i>Tanggal Selesai
                                        </label>
                                        <input 
                                            type="date" 
                                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.end_date ? 'border-red-500' : 'border-gray-300'}`}
                                            id="end_date"
                                            value={data.end_date}
                                            onChange={e => setData('end_date', e.target.value)}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">*Opsional jika sama dengan tanggal mulai</p>
                                        {errors.end_date && <p className="mt-1 text-xs text-red-500">{errors.end_date}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="end_time" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="far fa-clock mr-2 text-secondary"></i>Waktu Selesai
                                        </label>
                                        <input 
                                            type="time" 
                                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.end_time ? 'border-red-500' : 'border-gray-300'}`}
                                            id="end_time"
                                            value={data.end_time}
                                            onChange={e => setData('end_time', e.target.value)}
                                            required
                                        />
                                        {errors.end_time && <p className="mt-1 text-xs text-red-500">{errors.end_time}</p>}
                                    </div>
                                </div>

                                {/* Location */}
                                <div>
                                    <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-map-marker-alt mr-2 text-secondary"></i>Lokasi
                                    </label>
                                    <input 
                                        type="text" 
                                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
                                        id="location"
                                        value={data.location}
                                        onChange={e => setData('location', e.target.value)}
                                        placeholder="Masukkan lokasi kegiatan" 
                                        required
                                    />
                                    {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
                                </div>

                                {/* Price & Payment Method */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <div>
                                        <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="fas fa-tag mr-2 text-secondary"></i>Harga (Rp)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-gray-500 sm:text-sm">Rp</span>
                                            </div>
                                            <input 
                                                type="number" 
                                                className={`w-full pl-10 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
                                                id="price"
                                                value={data.price}
                                                onChange={e => setData('price', e.target.value)}
                                                min="0"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">*Isi 0 untuk kegiatan gratis</p>
                                        {errors.price && <p className="mt-1 text-xs text-red-500">{errors.price}</p>}

                                        <div className="mt-2 flex items-center">
                                            <input 
                                                type="checkbox" 
                                                id="show_price" 
                                                className="rounded border-gray-300 text-secondary shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                checked={data.show_price}
                                                onChange={e => setData('show_price', e.target.checked)}
                                            />
                                            <label htmlFor="show_price" className="ml-2 text-sm text-gray-600">Tampilkan harga ke publik?</label>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="payment_method_type" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="fas fa-money-check-alt mr-2 text-secondary"></i>Metode Pembayaran
                                        </label>
                                        <div className="relative">
                                            <select 
                                                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.payment_method_type ? 'border-red-500' : 'border-gray-300'}`}
                                                id="payment_method_type"
                                                value={data.payment_method_type}
                                                onChange={e => setData('payment_method_type', e.target.value)}
                                            >
                                                <option value="manual">Transfer Bank (Manual)</option>
                                                <option value="automatic">Payment Gateway (Otomatis)</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-3 sm:px-4 pointer-events-none text-gray-500">
                                                <i className="fas fa-chevron-down text-xs sm:text-sm"></i>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {data.payment_method_type === 'manual' 
                                                ? 'Pembayaran dicek manual oleh admin.' 
                                                : 'Pembayaran diverifikasi otomatis oleh sistem.'}
                                        </p>
                                        {data.payment_method_type === 'manual' && (
                                            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                                
                                                {/* Saved Accounts Selection */}
                                                {savedBankAccounts && savedBankAccounts.length > 0 && (
                                                    <div className="mb-4 pb-4 border-b border-gray-200">
                                                        <p className="text-sm font-semibold text-gray-700 mb-2">Pilih Rekening Tersimpan:</p>
                                                        <div className="space-y-2">
                                                            {savedBankAccounts.map((saved, idx) => {
                                                                const isChecked = data.manual_payment_details.some(
                                                                    acc => acc.account_number === saved.account_number && acc.bank_name === saved.bank_name
                                                                );
                                                                const bankLabel = INDONESIAN_BANKS.find(b => b.code === saved.bank_name)?.name || saved.bank_name;
                                                                
                                                                return (
                                                                    <label key={idx} className="flex items-center space-x-3 p-2 bg-white rounded border border-gray-200 hover:bg-blue-50 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            className="rounded text-secondary focus:ring-blue-500"
                                                                            checked={isChecked}
                                                                            onChange={(e) => toggleSavedBankAccount(saved, e.target.checked)}
                                                                        />
                                                                        <div className="text-sm">
                                                                            <span className="font-medium text-gray-900">{bankLabel}</span>
                                                                            <span className="mx-1 text-gray-400">|</span>
                                                                            <span className="text-gray-600">{saved.account_number}</span>
                                                                            <span className="mx-1 text-gray-400">|</span>
                                                                            <span className="text-gray-500 uppercase">{saved.account_name}</span>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-center mb-3">
                                                    <label className="block text-sm font-semibold text-gray-700">
                                                        Daftar Rekening Bank (Aktif)
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={addBankAccount}
                                                        className="text-xs sm:text-sm bg-secondary text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                                                    >
                                                        <i className="fas fa-plus mr-1"></i> Tambah Manual
                                                    </button>
                                                </div>
                                                {data.manual_payment_details.length === 0 ? (
                                                    <p className="text-sm text-gray-500 text-center py-4 italic border-2 border-dashed border-gray-300 rounded-lg">
                                                        Belum ada rekening bank dipilih atau ditambahkan.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {data.manual_payment_details.map((account, index) => {
                                                            const isSaved = savedBankAccounts?.some(
                                                                saved => saved.account_number === account.account_number && saved.bank_name === account.bank_name
                                                            );
                                                            return (
                                                                <div key={index} className="bg-white p-3 rounded-md border border-gray-200 shadow-sm relative group">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeBankAccount(index)}
                                                                        className="absolute top-2 right-2 text-red-400 hover:text-red-600 transition-colors"
                                                                        title="Hapus Rekening"
                                                                    >
                                                                        <i className="fas fa-trash-alt"></i>
                                                                    </button>
                                                                    <div className="grid grid-cols-1 gap-3 pr-6">
                                                                        <div>
                                                                            <label className="block text-xs text-gray-500 mb-1">Nama Bank</label>
                                                                            <select
                                                                                value={account.bank_name}
                                                                                onChange={(e) => updateBankAccount(index, 'bank_name', e.target.value)}
                                                                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                                            >
                                                                                <option value="">-- Pilih Bank --</option>
                                                                                {INDONESIAN_BANKS.map(bank => (
                                                                                    <option key={bank.code} value={bank.code}>{bank.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <div>
                                                                                <label className="block text-xs text-gray-500 mb-1">No. Rekening</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={account.account_number}
                                                                                    onChange={(e) => updateBankAccount(index, 'account_number', e.target.value)}
                                                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                                                    placeholder="Contoh: 1234567890"
                                                                                />
                                                                            </div>
                                                                            <div>
                                                                                <label className="block text-xs text-gray-500 mb-1">Atas Nama</label>
                                                                                <input
                                                                                    type="text"
                                                                                    value={account.account_name}
                                                                                    onChange={(e) => updateBankAccount(index, 'account_name', e.target.value)}
                                                                                    className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                                                    placeholder="Contoh: Ahmad Fulan"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        {!isSaved && account.bank_name && account.account_number && account.account_name && (
                                                                            <div className="pt-2">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleSaveBankAccount(account)}
                                                                                    className="text-xs text-secondary hover:text-secondary flex items-center gap-1"
                                                                                >
                                                                                    <i className="fas fa-save"></i> Simpan Rekening Ini ke Profil Saya
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {errors.payment_method_type && <p className="mt-1 text-xs text-red-500">{errors.payment_method_type}</p>}
                                    </div>
                                </div>

                                {/* Status & Pendaftaran */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                    <div>
                                        <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="fas fa-globe mr-2 text-secondary"></i>Status Publikasi
                                        </label>
                                        <div className="relative">
                                            <select 
                                                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.status ? 'border-red-500' : 'border-gray-300'}`}
                                                id="status"
                                                value={data.status}
                                                onChange={e => setData('status', e.target.value)}
                                            >
                                                <option value="public">Publik (Tampil di Beranda)</option>
                                                <option value="private">Privat (Hanya via Link)</option>
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-3 sm:px-4 pointer-events-none text-gray-500">
                                                <i className="fas fa-chevron-down text-xs sm:text-sm"></i>
                                            </div>
                                        </div>
                                        {errors.status && <p className="mt-1 text-xs text-red-500">{errors.status}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="pendaftaran" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="fas fa-door-open mr-2 text-secondary"></i>Status Pendaftaran
                                        </label>
                                        <div className="relative">
                                            <select 
                                                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.pendaftaran ? 'border-red-500' : 'border-gray-300'}`}
                                                id="pendaftaran"
                                                value={data.pendaftaran}
                                                onChange={e => setData('pendaftaran', e.target.value)}
                                            >
                                                {Object.entries(registrationStatuses).map(([value, label]) => (
                                                    <option key={value} value={value}>{label}</option>
                                                ))}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-3 sm:px-4 pointer-events-none text-gray-500">
                                                <i className="fas fa-chevron-down text-xs sm:text-sm"></i>
                                            </div>
                                        </div>
                                        {errors.pendaftaran && <p className="mt-1 text-xs text-red-500">{errors.pendaftaran}</p>}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-align-left mr-2 text-secondary"></i>Deskripsi
                                    </label>
                                    <textarea 
                                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                                        id="description"
                                        rows="4"
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        placeholder="Deskripsi lengkap kegiatan..."
                                    ></textarea>
                                    {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
                                </div>

                                {/* Mandatory Profile Fields */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-id-card mr-2 text-secondary"></i>Data Profil Wajib Peserta
                                    </label>
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 max-h-60 overflow-y-auto">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                            {Object.entries(profileFields).map(([key, label]) => (
                                                <div key={key} className="flex items-center">
                                                    <input 
                                                        type="checkbox" 
                                                        id={`field_${key}`} 
                                                        className="rounded border-gray-300 text-secondary shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                                        checked={data.mandatory_profile_fields.includes(key)}
                                                        onChange={(e) => handleCheckboxChange(key, e.target.checked)}
                                                    />
                                                    <label htmlFor={`field_${key}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                                                        {label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">*Peserta wajib melengkapi data ini sebelum mendaftar.</p>
                                </div>

                                {/* Image Upload */}
                                <div>
                                    <label htmlFor="image" className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-image mr-2 text-secondary"></i>Banner Kegiatan
                                    </label>
                                    
                                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                                        {/* Preview Area */}
                                        <div className="w-full sm:w-1/3 aspect-video bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center relative group">
                                            {previewImage ? (
                                                <img 
                                                    src={previewImage} 
                                                    alt="Preview" 
                                                    className="w-full h-full object-cover" 
                                                />
                                            ) : (
                                                <div className="text-gray-400 flex flex-col items-center">
                                                    <i className="fas fa-image text-3xl mb-2"></i>
                                                    <span className="text-xs">No image selected</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Upload Area */}
                                        <div className="flex-1 w-full">
                                            <input 
                                                type="file" 
                                                id="image"
                                                accept="image/*"
                                                className="block w-full text-sm text-gray-500
                                                    file:mr-4 file:py-2 file:px-4
                                                    file:rounded-full file:border-0
                                                    file:text-sm file:font-semibold
                                                    file:bg-blue-50 file:text-blue-700
                                                    hover:file:bg-secondary/10
                                                    transition-all cursor-pointer"
                                                onChange={e => setData('image', e.target.files[0])}
                                            />
                                            <p className="mt-2 text-xs text-gray-500">
                                                Format: JPG, PNG, GIF. Max: 5MB. Disarankan rasio 16:9.
                                            </p>
                                            {errors.image && <p className="mt-1 text-xs text-red-500">{errors.image}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4 border-t border-gray-100 flex justify-end">
                                    <button 
                                        type="submit" 
                                        disabled={processing}
                                        className={`w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all font-semibold text-sm sm:text-base flex items-center justify-center ${processing ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {processing ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-save mr-2"></i>
                                                Simpan Perubahan
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
