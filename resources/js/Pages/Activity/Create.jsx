import { Head, useForm, Link, usePage, router } from '@inertiajs/react';
import MainLayout from '@/Layouts/MainLayout';
import CategoryManager from '@/Components/CategoryManager';
import { useState, useEffect } from 'react';
import { INDONESIAN_BANKS } from '../../Constants/BankList';

export default function Create({ 
    categories, 
    subscriptionLimits, 
    canCreate, 
    currentManualTotalCount, 
    currentAutomaticTotalCount, 
    savedBankAccounts 
}) {
    const { auth } = usePage().props;
    // Ensure savedBankAccounts is always an array to prevent runtime errors
    const safeSavedBankAccounts = Array.isArray(savedBankAccounts) ? savedBankAccounts : [];
    

    
    const [previewImage, setPreviewImage] = useState(null);

    const { data, setData, post, processing, errors, transform } = useForm({
        name: '',
        category_id: '',
        activity_type: 'non_batch',
        date: '',
        start_time: '',
        end_date: '',
        end_time: '',
        location: '',
        price: 0,
        payment_method_type: 'manual',
        status: 'public',
        pendaftaran: 1, // 1: Dibuka
        description: '',
        image: null,
        mandatory_profile_fields: [],
        manual_payment_details: [],
        show_price: false
    });

    // Helper for manual payment details
    const addBankAccount = () => {
        setData('manual_payment_details', [
            ...data.manual_payment_details,
            { bank_name: '', account_number: '', account_name: '' }
        ]);
    };

    const removeBankAccount = (index) => {
        const newAccounts = [...data.manual_payment_details];
        newAccounts.splice(index, 1);
        setData('manual_payment_details', newAccounts);
    };

    const updateBankAccount = (index, field, value) => {
        const newAccounts = [...data.manual_payment_details];
        newAccounts[index][field] = value;
        setData('manual_payment_details', newAccounts);
    };

    const handleSaveBankAccount = (account) => {
        if (!account.bank_name || !account.account_number || !account.account_name) {
            alert('Mohon lengkapi data rekening sebelum menyimpan.');
            return;
        }

        router.post(route('payments.bank-account.save'), account, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                // alert('Rekening berhasil disimpan ke profil Anda.');
            },
            onError: (errors) => {
                alert('Gagal menyimpan rekening: ' + JSON.stringify(errors));
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
    const manualLimit = subscriptionLimits?.manual_activities_limit ?? null;
    const manualParticipantCap = subscriptionLimits?.max_participants_per_activity ?? null;
    const autoParticipantCap = subscriptionLimits?.auto_max_participants_per_activity ?? null;

    const handleSubmit = (e) => {
        e.preventDefault();
        post(route('activity.store'), {
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

    // Profile fields options (hardcoded based on controller)
    const profileFields = {
        'name': 'Nama Lengkap',
        'email': 'Email',
        'no_hp': 'No HP / WhatsApp',
        'nik': 'NIK',
        'instansi': 'Instansi',
        'pekerjaan': 'Pekerjaan',
        'jabatan': 'Jabatan',
        'province_id': 'Provinsi',
        'regency_id': 'Kabupaten/Kota',
        'district_id': 'Kecamatan',
        'alamat': 'Alamat Lengkap',
        'jenis_kelamin': 'Jenis Kelamin',
        'birth_place': 'Tempat Lahir',
        'birth_date': 'Tanggal Lahir',
        'foto': 'Foto Profil',
    };

    return (
        <MainLayout>
            <Head title="Tambah Aktivitas Baru" />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-6">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="mb-4 sm:mb-6">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-lg sm:rounded-t-xl shadow-lg px-4 sm:px-6 py-3 sm:py-4">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white flex items-center">
                                    <i className="fas fa-plus-circle mr-2 sm:mr-3"></i>
                                    <span className="text-sm sm:text-base lg:text-lg">Tambah Aktivitas Baru</span>
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

                    {/* Subscription Limit Info */}
                    {auth.user?.is_creator && (
                        <>
                            {subscriptionLimits && !canCreate?.allowed ? (
                                <div className="mb-4 sm:mb-6 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-3 sm:p-4 shadow-sm">
                                    <div className="flex items-start">
                                        <i className="fas fa-exclamation-circle text-yellow-500 mr-2 sm:mr-3 text-lg sm:text-xl flex-shrink-0 mt-0.5"></i>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm sm:text-base text-yellow-800 font-semibold mb-1">Batas Acara Tercapai</h3>
                                            <p className="text-xs sm:text-sm text-yellow-700 mb-3">{canCreate?.message}</p>
                                            <a href="/subscriptions/pricing" className="w-full sm:w-auto inline-flex items-center justify-center bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-all text-sm sm:text-base">
                                                <i className="fas fa-crown mr-2"></i>Berlangganan Sekarang
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ) : subscriptionLimits && (
                                <div className="mb-4 sm:mb-6 bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 sm:p-4 shadow-sm">
                                    <div className="flex items-start">
                                        <i className="fas fa-info-circle text-blue-500 mr-2 sm:mr-3 text-lg sm:text-xl flex-shrink-0 mt-0.5"></i>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm sm:text-base text-secondary font-semibold mb-2">Ringkasan Batas Paket</h3>
                                            <div className="mt-2">
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    <div className="px-2 sm:px-3 py-2 bg-blue-50 border border-blue-100 rounded">
                                                        <div className="text-xs text-secondary">Metode</div>
                                                        <div className="text-xs sm:text-sm font-bold text-blue-900">Transfer Bank</div>
                                                    </div>
                                                    <div className="px-2 sm:px-3 py-2 bg-blue-50 border border-blue-100 rounded">
                                                        <div className="text-xs text-secondary">Maksimum Acara</div>
                                                        <div className="text-xs sm:text-sm font-bold text-blue-900">{manualLimit !== null ? manualLimit : 'Unlimited'}</div>
                                                    </div>
                                                    <div className="px-2 sm:px-3 py-2 bg-blue-50 border border-blue-100 rounded">
                                                        <div className="text-xs text-secondary">Sudah Dibuat</div>
                                                        <div className="text-xs sm:text-sm font-bold text-blue-900">{currentManualTotalCount ?? 0}</div>
                                                    </div>
                                                    <div className="px-2 sm:px-3 py-2 bg-blue-50 border border-blue-100 rounded">
                                                        <div className="text-xs text-secondary">Maksimum Peserta</div>
                                                        <div className="text-xs sm:text-sm font-bold text-blue-900">{manualParticipantCap ? `Maksimal ${manualParticipantCap}` : 'Unlimited'}</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                                                    <div className="px-2 sm:px-3 py-2 bg-blue-50 border border-blue-100 rounded">
                                                        <div className="text-xs text-secondary">Metode</div>
                                                        <div className="text-xs sm:text-sm font-bold text-blue-900">Payment Gateway</div>
                                                    </div>
                                                    <div className="px-2 sm:px-3 py-2 bg-blue-50 border border-blue-100 rounded">
                                                        <div className="text-xs text-secondary">Maksimum Acara</div>
                                                        <div className="text-xs sm:text-sm font-bold text-blue-900">Unlimited</div>
                                                    </div>
                                                    <div className="px-2 sm:px-3 py-2 bg-blue-50 border border-blue-100 rounded">
                                                        <div className="text-xs text-secondary">Sudah Dibuat</div>
                                                        <div className="text-xs sm:text-sm font-bold text-blue-900">{currentAutomaticTotalCount ?? 0}</div>
                                                    </div>
                                                    <div className="px-2 sm:px-3 py-2 bg-blue-50 border border-blue-100 rounded">
                                                        <div className="text-xs text-secondary">Maksimum Peserta</div>
                                                        <div className="text-xs sm:text-sm font-bold text-blue-900">{autoParticipantCap ? `Maksimal ${autoParticipantCap}` : 'Unlimited'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
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
                                    {errors.name && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.name}</p>}
                                </div>

                                {/* Category & Type */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                                            <i className="fas fa-layer-group mr-2 text-secondary"></i>Jenis Kegiatan
                                        </label>
                                        <select 
                                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.activity_type ? 'border-red-500' : 'border-gray-300'}`}
                                            id="activity_type"
                                            value={data.activity_type}
                                            onChange={e => setData('activity_type', e.target.value)}
                                            required
                                        >
                                            <option value="non_batch">Non-Batch (Kegiatan Tunggal)</option>
                                            <option value="batch">Batch (Kegiatan Bergelombang)</option>
                                        </select>
                                        {errors.activity_type && <p className="mt-1 text-sm text-red-600">{errors.activity_type}</p>}
                                    </div>
                                </div>

                                {/* Date & Time */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-calendar-alt mr-2 text-secondary"></i>Waktu Kegiatan
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                                        <div className="sm:col-span-1 lg:col-span-1">
                                            <label htmlFor="date" className="block text-xs font-medium text-gray-600 mb-1">Tanggal Mulai</label>
                                            <input 
                                                type="date" 
                                                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
                                                id="date"
                                                value={data.date}
                                                onChange={e => setData('date', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="sm:col-span-1 lg:col-span-1">
                                            <label htmlFor="start_time" className="block text-xs font-medium text-gray-600 mb-1">Waktu Mulai</label>
                                            <input 
                                                type="time" 
                                                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.start_time ? 'border-red-500' : 'border-gray-300'}`}
                                                id="start_time"
                                                value={data.start_time}
                                                onChange={e => setData('start_time', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="sm:col-span-2 lg:col-span-1 flex items-end justify-center pb-0 sm:pb-3">
                                            <span className="text-gray-500 font-semibold text-sm">s/d</span>
                                        </div>
                                        <div className="sm:col-span-1 lg:col-span-1">
                                            <label htmlFor="end_date" className="block text-xs font-medium text-gray-600 mb-1">Tanggal Selesai</label>
                                            <input 
                                                type="date" 
                                                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.end_date ? 'border-red-500' : 'border-gray-300'}`}
                                                id="end_date"
                                                value={data.end_date}
                                                onChange={e => setData('end_date', e.target.value)}
                                            />
                                        </div>
                                        <div className="sm:col-span-1 lg:col-span-1">
                                            <label htmlFor="end_time" className="block text-xs font-medium text-gray-600 mb-1">Waktu Selesai</label>
                                            <input 
                                                type="time" 
                                                className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.end_time ? 'border-red-500' : 'border-gray-300'}`}
                                                id="end_time"
                                                value={data.end_time}
                                                onChange={e => setData('end_time', e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <p className="mt-2 text-xs text-gray-600 flex items-start">
                                        <i className="fas fa-info-circle mr-2 text-blue-500 mt-0.5 flex-shrink-0"></i>
                                        <span>Jika acara berlangsung lebih dari satu hari, isi tanggal selesai. Jika tidak diisi, akan menggunakan tanggal mulai.</span>
                                    </p>
                                </div>

                                {/* Location & Price */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
                                        {errors.location && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.location}</p>}
                                    </div>

                                    <div>
                                        <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="fas fa-money-bill mr-2 text-secondary"></i>Harga
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                                                <span className="text-gray-600 font-semibold text-sm sm:text-base">Rp</span>
                                            </div>
                                            <input 
                                                type="number" 
                                                className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.price ? 'border-red-500' : 'border-gray-300'}`}
                                                id="price"
                                                value={data.price}
                                                onChange={e => setData('price', e.target.value)}
                                                min="0"
                                                step="0.01"
                                                placeholder="0"
                                            />
                                        </div>
                                        {errors.price && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.price}</p>}
                                    </div>
                                </div>

                                {/* Payment Method & Status */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="fas fa-wallet mr-2 text-secondary"></i>Metode Pembayaran
                                        </label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all ${data.payment_method_type === 'manual' ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500' : 'border-gray-200 hover:border-blue-300'}`}>
                                                <input 
                                                    type="radio" 
                                                    name="payment_method_type" 
                                                    value="manual" 
                                                    className="hidden" 
                                                    checked={data.payment_method_type === 'manual'}
                                                    onChange={e => setData('payment_method_type', e.target.value)}
                                                />
                                                <i className="fas fa-university text-2xl text-secondary"></i>
                                                <span className="text-sm font-medium text-gray-700 text-center">Transfer Bank (Manual)</span>
                                            </label>
                                            <label className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center justify-center gap-2 transition-all ${data.payment_method_type === 'automatic' ? 'border-green-500 bg-green-50 ring-2 ring-green-500' : 'border-gray-200 hover:border-green-300'}`}>
                                                <input 
                                                    type="radio" 
                                                    name="payment_method_type" 
                                                    value="automatic" 
                                                    className="hidden" 
                                                    checked={data.payment_method_type === 'automatic'}
                                                    onChange={e => setData('payment_method_type', e.target.value)}
                                                />
                                                <i className="fas fa-bolt text-2xl text-green-600"></i>
                                                <span className="text-sm font-medium text-gray-700 text-center">Otomatis (Payment Gateway)</span>
                                            </label>
                                        </div>
                                        {errors.payment_method_type && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.payment_method_type}</p>}

                                        {/* Bank Accounts Input */}
                                        {data.payment_method_type === 'manual' && (
                                            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                                {/* Saved Accounts Selection */}
                                                {safeSavedBankAccounts.length > 0 && (
                                                    <div className="mb-4 pb-4 border-b border-gray-200">
                                                        <p className="text-sm font-semibold text-gray-700 mb-2">Pilih Rekening Tersimpan:</p>
                                                        <div className="space-y-2">
                                                            {safeSavedBankAccounts.map((saved, idx) => {
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
                                                        Daftar Rekening Bank (Manual)
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={addBankAccount}
                                                        className="text-xs sm:text-sm bg-secondary text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                                                    >
                                                        <i className="fas fa-plus mr-1"></i> Tambah Bank
                                                    </button>
                                                </div>
                                                
                                                {data.manual_payment_details.length === 0 ? (
                                                    <p className="text-sm text-gray-500 text-center py-4 italic border-2 border-dashed border-gray-300 rounded-lg">
                                                        Belum ada rekening yang ditambahkan. Silakan klik "Tambah Bank".
                                                    </p>
                                                ) : (
                                                    <div className="space-y-3">
                                                        {data.manual_payment_details.map((account, index) => {
                                                            const isSaved = safeSavedBankAccounts.some(
                                                                saved => saved.account_number === account.account_number && saved.bank_name === account.bank_name
                                                            );

                                                            return (
                                                                <div key={index} className="bg-white p-3 rounded-md border border-gray-200 shadow-sm relative group">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeBankAccount(index)}
                                                                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                                                                    >
                                                                        <i className="fas fa-times"></i>
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
                                                                        <div>
                                                                            <label className="block text-xs text-gray-500 mb-1">Nomor Rekening</label>
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
                                                                                placeholder="Nama pemilik rekening"
                                                                            />
                                                                        </div>
                                                                        {!isSaved && account.bank_name && account.account_number && account.account_name && (
                                                                            <div className="flex justify-end pt-2">
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
                                    </div>

                                    <div>
                                        <label htmlFor="status" className="block text-sm font-semibold text-gray-700 mb-2">
                                            <i className="fas fa-globe mr-2 text-secondary"></i>Status Publikasi
                                        </label>
                                        <select 
                                            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.status ? 'border-red-500' : 'border-gray-300'}`}
                                            id="status"
                                            value={data.status}
                                            onChange={e => setData('status', e.target.value)}
                                            required
                                        >
                                            <option value="public">Publik (Tampil di Beranda)</option>
                                            <option value="private">Privat (Hanya via Link)</option>
                                        </select>
                                        {errors.status && <p className="mt-1 text-sm text-red-600">{errors.status}</p>}
                                    </div>
                                </div>

                                {/* Registration Status */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-door-open mr-2 text-secondary"></i>Status Pendaftaran
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            { val: 0, label: 'Belum Dibuka', color: 'gray' },
                                            { val: 1, label: 'Dibuka', color: 'green' },
                                            { val: 2, label: 'Ditutup', color: 'red' }
                                        ].map(opt => (
                                            <label key={opt.val} className={`cursor-pointer border rounded-lg p-2 sm:p-3 flex flex-col items-center justify-center gap-1 transition-all ${data.pendaftaran == opt.val ? `border-${opt.color}-500 bg-${opt.color}-50 ring-2 ring-${opt.color}-500` : `border-gray-200 hover:border-${opt.color}-300`}`}>
                                                <input 
                                                    type="radio" 
                                                    name="pendaftaran" 
                                                    value={opt.val} 
                                                    className="hidden" 
                                                    checked={data.pendaftaran == opt.val}
                                                    onChange={e => setData('pendaftaran', e.target.value)}
                                                />
                                                <span className={`w-3 h-3 rounded-full bg-${opt.color}-500`}></span>
                                                <span className="text-xs sm:text-sm font-medium text-gray-700 text-center">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.pendaftaran && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.pendaftaran}</p>}
                                </div>

                                {/* Description */}
                                <div>
                                    <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-align-left mr-2 text-secondary"></i>Deskripsi
                                    </label>
                                    <textarea 
                                        className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${errors.description ? 'border-red-500' : 'border-gray-300'}`}
                                        id="description"
                                        rows="6"
                                        value={data.description}
                                        onChange={e => setData('description', e.target.value)}
                                        placeholder="Jelaskan detail aktivitas..."
                                    ></textarea>
                                    <p className="mt-1 text-xs text-gray-500">Gunakan format teks biasa untuk saat ini.</p>
                                    {errors.description && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.description}</p>}
                                </div>

                                {/* Image Upload */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-image mr-2 text-secondary"></i>Banner / Poster
                                    </label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-blue-500 transition-colors bg-gray-50">
                                        <div className="space-y-1 text-center">
                                            {previewImage ? (
                                                <div className="mb-4">
                                                    <img src={previewImage} alt="Preview" className="mx-auto h-48 object-contain rounded-lg shadow-sm" />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => {
                                                            setData('image', null);
                                                            setPreviewImage(null);
                                                        }}
                                                        className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                                                    >
                                                        Hapus Gambar
                                                    </button>
                                                </div>
                                            ) : (
                                                <i className="fas fa-cloud-upload-alt text-4xl text-gray-400 mb-3"></i>
                                            )}
                                            <div className="flex text-sm text-gray-600 justify-center">
                                                <label htmlFor="image" className="relative cursor-pointer bg-white rounded-md font-medium text-secondary hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                    <span>Upload file</span>
                                                    <input 
                                                        id="image" 
                                                        name="image" 
                                                        type="file" 
                                                        className="sr-only" 
                                                        accept="image/png, image/jpeg, image/jpg"
                                                        onChange={e => setData('image', e.target.files[0])}
                                                    />
                                                </label>
                                                <p className="pl-1">atau drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500">PNG, JPG, JPEG hingga 5MB</p>
                                        </div>
                                    </div>
                                    {errors.image && <p className="mt-1 text-xs sm:text-sm text-red-600">{errors.image}</p>}
                                </div>

                                {/* Mandatory Profile Fields */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        <i className="fas fa-user-check mr-2 text-secondary"></i>Data Profil Wajib
                                    </label>
                                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                        <p className="text-sm text-secondary mb-3 font-medium">Pilih data profil yang wajib dilengkapi peserta sebelum mendaftar:</p>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {Object.entries(profileFields).map(([key, label]) => (
                                                <label key={key} className="inline-flex items-center bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm hover:bg-gray-50 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded text-secondary focus:ring-blue-500 border-gray-300"
                                                        value={key}
                                                        checked={data.mandatory_profile_fields.includes(key)}
                                                        onChange={e => handleCheckboxChange(key, e.target.checked)}
                                                    />
                                                    <span className="ml-2 text-sm text-gray-700">{label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4 border-t border-gray-200 flex justify-end">
                                    <button 
                                        type="submit" 
                                        className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-secondary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={processing}
                                    >
                                        {processing ? (
                                            <>
                                                <i className="fas fa-spinner fa-spin mr-2"></i>
                                                Menyimpan...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-save mr-2"></i>
                                                Simpan Aktivitas
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
