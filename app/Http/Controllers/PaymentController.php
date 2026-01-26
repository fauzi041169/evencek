<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\FinancialSetting;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\User;
use App\Models\ActivityBatch;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\Voucher;
use App\Models\Setting;
use App\Models\PaymentChannel;
use App\Models\WithdrawalRequest;
use App\Http\Controllers\MidtransPaymentController;
use App\Jobs\SendPaymentReceiptMail;
use App\Jobs\SendPaymentApprovedWhatsapp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PaymentController extends Controller
{
    public function index(Request $request)
    {
        try {
            $activity = Activity::findOrFail($request->activity_id);
            $paymentMethods = PaymentMethod::where('is_active', true)->get();

            // Check if user already has a payment for this activity
            $existingPayment = Payment::where('user_id', auth()->id())
                ->where('activity_id', $activity->id)
                ->first();

            $payments = Payment::with(['paymentMethod', 'activity', 'user'])
                ->where('activity_id', $activity->id)
                ->orderBy('created_at', 'desc')
                ->paginate(15);

            return Inertia::render('Payments/Index', [
                'activity' => $activity,
                'paymentMethods' => $paymentMethods,
                'existingPayment' => $existingPayment,
                'payments' => $payments,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in payment index: '.$e->getMessage());

            return redirect()->back()->with('error', 'Terjadi kesalahan saat memuat halaman pembayaran');
        }
    }

    public function create(Activity $activity)
    {
        try {
            // Check profile completeness
            $user = auth()->user();
            if (! $user->relationLoaded('profile')) {
                $user->load('profile');
            }

            $validationKeys = ['name', 'email']; // Default mandatory

            // Add keys from import_template
            $template = $activity->import_template;
            if ($template) {
                // Map for standard fields normalization (consistent with ActivityEnrollmentController)
                $map = [
                    'email' => 'email',
                    'name' => 'name',
                    'nama_lengkap' => 'name',
                    'no_hp' => 'no_hp',
                    'nik' => 'nik',
                    'pekerjaan' => 'pekerjaan',
                    'instansi' => 'instansi',
                    'jabatan' => 'jabatan',
                    'alamat' => 'alamat',
                    'jenis_kelamin' => 'jenis_kelamin',
                    'tempat_lahir' => 'birth_place',
                    'tgl_lahir' => 'birth_date',
                    'foto' => 'foto',
                    'phone' => 'no_hp',
                    'gender' => 'jenis_kelamin',
                    'birth_place' => 'birth_place',
                    'birth_date' => 'birth_date',
                    'provinsi' => 'province_id',
                    'kabupaten' => 'regency_id',
                    'kecamatan' => 'district_id',
                    'province' => 'province_id',
                    'regency' => 'regency_id',
                    'district' => 'district_id',
                    'city' => 'regency_id',
                    'address' => 'alamat',
                    'photo' => 'foto',
                    'position' => 'jabatan',
                    'institution' => 'instansi',
                    'occupation' => 'pekerjaan',
                ];

                $cols = array_map('trim', explode(',', $template));
                foreach ($cols as $col) {
                    if (str_ends_with($col, '*')) {
                        $key = substr($col, 0, -1);
                        // Normalize key
                        $key = preg_replace('/^\d+\./', '', $key);
                        $key = strtolower(trim($key));
                        $key = preg_replace('/[\x00-\x1F\x7F\xA0]/u', '', $key);

                        if (str_starts_with($key, 'user:')) {
                            $key = substr($key, 5);
                        }
                        if (str_starts_with($key, 'profile:')) {
                            $key = substr($key, 8);
                        }

                        if ($key !== 'password') {
                            // Try to map to DB key
                            if (isset($map[$key])) {
                                $validationKeys[] = $map[$key];
                            } elseif (isset($map[str_replace(' ', '_', $key)])) {
                                $validationKeys[] = $map[str_replace(' ', '_', $key)];
                            } else {
                                $validationKeys[] = $key;
                            }
                        }
                    }
                }
            }

            // Add explicit mandatory fields
            if ($activity->mandatory_profile_fields) {
                $validationKeys = array_merge($validationKeys, $activity->mandatory_profile_fields);
            }

            $validationKeys = array_unique($validationKeys);
            // Allow payment even if photo is missing (will be required later)
            $validationKeys = array_diff($validationKeys, ['foto']);

            // Perform Unified Validation (Skip if this is a bulk payment/import request)
            if (! request()->boolean('is_bulk')) {
                $missingProfileData = $user->getIncompleteProfileData($validationKeys);
                $missingFields = array_column($missingProfileData, 'label');
                $missingFieldKeys = array_column($missingProfileData, 'key');

                if (! empty($missingFields)) {
                    $errorMsg = 'Profil Anda belum lengkap. Lengkapi data berikut: '.implode(', ', array_unique($missingFields));

                    if (request()->wantsJson() || request()->boolean('modal')) {
                        // Return 422 for API (wantsJson), but 200 for modal to avoid console error noise
                        $status = request()->boolean('modal') ? 200 : 422;
                        return response()->json([
                            'success' => false,
                            'message' => $errorMsg,
                            'missing_fields' => $missingFields,
                            'missing_keys' => $missingFieldKeys,
                        ], $status);
                    }

                    return redirect()->route('activity.show', $activity->id)
                        ->with('error', $errorMsg)
                        ->with('missing_profile_fields', $missingFieldKeys);
                }
            }
            // Fix: Clean up stale bulk session data if this is not a bulk payment request
            // We use boolean() to correctly handle is_bulk=0 or missing param
            if (! request()->boolean('is_bulk')) {
                session()->forget(['import_bulk_payment', 'import_bulk_payment_payload']);
            }

            if (request()->boolean('is_bulk') && ! session('import_bulk_payment') && ! session('import_bulk_payment_payload')) {
                $msg = 'Sesi pembayaran massal telah berakhir. Silakan ulangi proses impor dari awal.';

                if (request()->boolean('modal') || request()->ajax() || request()->boolean('embed')) {
                    return response(
                        '<div class="p-6 text-center text-sm text-red-700 bg-red-50 rounded-xl">'.$msg.'</div>',
                        200
                    );
                }

                if (request()->expectsJson()) {
                    return response()->json(['success' => false, 'message' => $msg], 422);
                }

                return redirect()->route('activity.participants.index', $activity->id)
                    ->with('error', $msg);
            }

            // Check for active batch
            $activeBatch = $activity->activeBatch;

            // Determine effective batch context
            // Prioritize existing pending/verification enrollment to allow paying for previous batches if user is already registered
            $pendingEnrollment = ActivityUser::where('user_id', auth()->id())
                ->where('activity_id', $activity->id)
                ->whereIn('status', [ActivityUser::STATUS_VERIFICATION])
                ->orderBy('created_at', 'desc')
                ->first();

            $targetBatchId = null;
            if ($pendingEnrollment) {
                $targetBatchId = $pendingEnrollment->activity_batch_id;
            } elseif (request()->has('batch_id')) {
                $targetBatchId = request()->input('batch_id');
            } elseif ($activeBatch) {
                $targetBatchId = $activeBatch->id;
            }

            // CHECK FREE ACTIVITY / BATCH
            // Calculate effective price
            // Fix: If activity price is explicitly 0, treat as free (Master Override) regardless of batch price
            if ((int)$activity->price === 0) {
                $effectivePrice = 0;
            } else {
                $effectivePrice = (int) $activity->price;
                if ($targetBatchId) {
                    $targetBatch = ActivityBatch::find($targetBatchId);
                    // Only use batch price if it is NOT NULL. If it is 0, it overrides activity price.
                    if ($targetBatch && $targetBatch->price !== null) {
                        $effectivePrice = (int) $targetBatch->price;
                    }
                }
            }

            // Update activity object with effective price for view display
            $activity->price = $effectivePrice;

            Log::info('DEBUG PAYMENT CREATE', [
                'activity_id' => $activity->id,
                'effective_price' => $effectivePrice,
                'is_less_equal_zero' => ($effectivePrice <= 0),
                'target_batch_id' => $targetBatchId,
            ]);

            // If price is 0, skip payment and ensure enrollment is active
            if ($effectivePrice <= 0) {
                 // Check/Update Enrollment
                 $enrollment = ActivityUser::where('user_id', auth()->id())
                    ->where('activity_id', $activity->id)
                    ->when($targetBatchId, function($q) use ($targetBatchId) {
                        return $q->where('activity_batch_id', $targetBatchId);
                    })
                    ->first();

                 if (! $enrollment) {
                     // Fix: Create enrollment if missing (e.g. skipped by EnrollmentController logic)
                     $enrollment = ActivityUser::create([
                         'user_id' => auth()->id(),
                         'activity_id' => $activity->id,
                         'activity_batch_id' => $targetBatchId,
                         'status' => ActivityUser::STATUS_ACTIVE,
                     ]);
                 } elseif ($enrollment->status != ActivityUser::STATUS_ACTIVE) {
                     $enrollment->status = ActivityUser::STATUS_ACTIVE;
                     $enrollment->save();
                 }

                 if (request()->expectsJson() || request()->boolean('modal')) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Kegiatan gratis, tidak memerlukan pembayaran.',
                        'redirect_url' => route('activity.show', $activity->id)
                    ]);
                }
                return redirect()->route('activity.show', $activity->id)
                    ->with('info', 'Kegiatan gratis, tidak memerlukan pembayaran.');
            }



            if ($activity->user && $activity->user->isCreator() && ! $activity->user->hasActiveSubscription()) {
                if ($activity->hasAutomaticPayment()) {
                    $minAuto = (int) (FinancialSetting::current()->min_auto_price ?? 15000);
                    if ($activity->price > 0 && $activity->price < $minAuto) {
                        return redirect()->route('activity.show', $activity->id)
                            ->with('error', 'Untuk pembayaran otomatis, harga kegiatan minimal Rp'.number_format($minAuto, 0, ',', '.').'.');
                    }
                    if ($activity->price > 0) {
                        if (request()->expectsJson() || request()->boolean('modal')) {
                            return response()->json([
                                'success' => true,
                                'redirect_url' => route('midtrans.payment.create', [
                                    'activity' => $activity->id,
                                    'is_bulk' => request()->boolean('is_bulk'),
                                    'batch_id' => request()->input('batch_id'),
                                ])
                            ]);
                        }
                        return redirect()->route('midtrans.payment.create', [
                            'activity' => $activity->id,
                            'is_bulk' => request()->boolean('is_bulk'),
                            'batch_id' => request()->input('batch_id'),
                        ]);
                    }
                }
                // Untuk gratis, kembali ke detail (tidak perlu pembayaran)
                if ($activity->price == 0) {
                    if (request()->expectsJson() || request()->boolean('modal')) {
                        return response()->json([
                            'success' => true,
                            'message' => 'Kegiatan gratis, tidak memerlukan pembayaran.',
                            'redirect_url' => route('activity.show', $activity->id)
                        ]);
                    }
                    return redirect()->route('activity.show', $activity->id)
                        ->with('info', 'Kegiatan gratis, tidak memerlukan pembayaran.');
                }
            }
            // Check payment method type - redirect to Midtrans jika automatic
            if ($activity->hasAutomaticPayment() && ! request()->boolean('force_manual')) {
                if (request()->expectsJson() || request()->boolean('modal')) {
                    return response()->json([
                        'success' => true,
                        'redirect_url' => route('midtrans.payment.create', [
                            'activity' => $activity->id,
                            'is_bulk' => request()->boolean('is_bulk'),
                            'batch_id' => request()->input('batch_id'),
                        ])
                    ]);
                }
                return redirect()->route('midtrans.payment.create', [
                    'activity' => $activity->id,
                    'is_bulk' => request()->boolean('is_bulk'),
                    'batch_id' => request()->input('batch_id'),
                ]);
            }

            // Untuk kegiatan dengan payment_method_type = NULL atau manual, gunakan flow manual
            $paymentQuery = Payment::where('user_id', auth()->id())
                ->where('activity_id', $activity->id);

            if ($targetBatchId) {
                $paymentQuery->where('activity_batch_id', $targetBatchId);
            } else {
                $paymentQuery->whereNull('activity_batch_id');
            }

            // Fix: Retrieve all matching payments to distinguish between Bulk and Mandiri
            $payments = $paymentQuery->orderBy('created_at', 'desc')->get();
            $isBulkRequest = request()->boolean('is_bulk');

            // Find the correct payment record based on request type
            $existingPayment = $payments->first(function ($p) use ($isBulkRequest) {
                $notes = json_decode($p->notes, true);
                $isBulkPayment = is_array($notes) && ! empty($notes['bulk_import']);

                return $isBulkRequest === $isBulkPayment;
            });

            $bulk = session('import_bulk_payment');

            // Fix: Reset payment to single mode if this is a fresh "mandiri" request
            // but the existing payment has leftover bulk data.
            // Note: With the new filtering logic above, this might be less common,
            // but we keep it for cases where only one record exists.
            if ($existingPayment && ! $isBulkRequest && $existingPayment->status === 'pending' && empty($existingPayment->midtrans_transaction_id)) {
                $notes = json_decode($existingPayment->notes, true);
                if (is_array($notes) && ! empty($notes['bulk_import'])) {
                    // If we found a bulk payment but request is NOT bulk,
                    // and we didn't find a clean mandiri payment (because we are here),
                    // it means the user ONLY has a bulk payment.
                    // We should NOT reset it if it's a valid bulk payment they are managing.
                    // We should force create a NEW payment for Mandiri.
                    $existingPayment = null;
                }
            }

            if ($existingPayment) {
                if ($existingPayment->user_id !== auth()->id()) {
                    abort(403, 'Anda tidak memiliki akses ke pembayaran ini');
                }
                if (is_array($bulk) && $existingPayment->status === 'pending' && empty($existingPayment->midtrans_transaction_id)) {
                    $uidsRaw = (array) data_get($bulk, 'pending_user_ids', []);
                    if (empty($uidsRaw)) {
                        if (request()->expectsJson() || request()->boolean('modal')) {
                            $status = request()->boolean('modal') ? 200 : 422;
                            return response()->json(['success' => false, 'message' => 'Tidak ada peserta baru yang perlu ditagih.'], $status);
                        }
                        return redirect()->route('activity.participants.index', $activity->id)
                            ->with('error', 'Tidak ada peserta baru yang perlu ditagih.');
                    }
                    $uidsRaw = array_filter(array_unique(array_map('intval', $uidsRaw)));
                    $validUids = User::whereIn('id', $uidsRaw)->pluck('id')->toArray();
                    if (empty($validUids)) {
                        $validUids = $uidsRaw;
                    }
                    $limit = (int) data_get($bulk, 'allowed_count', count($validUids));
                    $amount = (int) data_get($bulk, 'gross_amount', (int) $activity->price);
                    $existingPayment->amount = $amount;
                    $existingPayment->notes = json_encode([
                        'bulk_import' => true,
                        'allowed_count' => $limit,
                        'user_ids' => $validUids,
                        'successfully_imported_count' => (int) data_get($bulk, 'successfully_imported_count', count($validUids)),
                    ]);
                    $existingPayment->save();
                    $count = 0;
                    foreach ($validUids as $uid) {
                        if ($count >= $limit) {
                            break;
                        }
                        try {
                            if ((int) $uid <= 0) {
                                continue;
                            }

                            if (! User::whereKey($uid)->exists()) {
                                Log::warning('Bulk payment: skipped non-existing user during enrollment', [
                                    'user_id' => $uid,
                                    'activity_id' => $activity->id,
                                    'payment_id' => $existingPayment->id,
                                ]);
                                continue;
                            }

                            $bulkMatch = [
                                'user_id' => (int) $uid,
                                'activity_id' => $activity->id,
                            ];
                            if (isset($bulk['activity_batch_id'])) {
                                $bulkMatch['activity_batch_id'] = $bulk['activity_batch_id'];
                            } elseif ($targetBatchId) {
                                $bulkMatch['activity_batch_id'] = $targetBatchId;
                            } else {
                                $bulkMatch['activity_batch_id'] = null;
                            }

                            $distributedUser = ActivityUser::firstOrNew($bulkMatch);

                            if ($distributedUser->status !== ActivityUser::STATUS_ACTIVE) {
                                $distributedUser->status = ActivityUser::STATUS_VERIFICATION;
                            }

                            if (! $distributedUser->exists) {
                                $distributedUser->created_at = now();
                            }
                            $distributedUser->updated_at = now();
                            $distributedUser->save();

                            $proofPath = $existingPayment->proof_of_payment;
                            if ($proofPath) {
                                $ext = pathinfo($proofPath, PATHINFO_EXTENSION);
                                $uniqueName = 'payment_bulk_'.$activity->id.'_'.$uid.'_'.uniqid().'.'.$ext;
                                $uniquePathRelative = 'payment-proofs/'.$uniqueName;

                                // Handle legacy assets/ path or standard storage path
                                if (\Illuminate\Support\Str::startsWith($proofPath, 'assets/')) {
                                    if (file_exists(public_path($proofPath))) {
                                        Storage::disk('public')->put($uniquePathRelative, file_get_contents(public_path($proofPath)));
                                    }
                                } else {
                                    // Standard storage path
                                    $storagePath = ltrim($proofPath, '/');
                                    if (\Illuminate\Support\Str::startsWith($storagePath, 'storage/')) {
                                        $storagePath = substr($storagePath, 8);
                                    }

                                    if (Storage::disk('public')->exists($storagePath)) {
                                        Storage::disk('public')->copy($storagePath, $uniquePathRelative);
                                    } elseif (file_exists(public_path('storage/'.$storagePath))) {
                                        // Fallback for file existing in public/storage but not accessible via Storage facade
                                        Storage::disk('public')->put($uniquePathRelative, file_get_contents(public_path('storage/'.$storagePath)));
                                    }
                                }

                                    $userPaymentMatch = [
                                        'user_id' => $uid,
                                        'activity_id' => $activity->id,
                                    ];
                                    if (isset($bulkMatch['activity_batch_id'])) {
                                        $userPaymentMatch['activity_batch_id'] = $bulkMatch['activity_batch_id'];
                                    $userPaymentMatch['activity_batch_id'] = null;
                                    }

                                    // Prevent overwriting APPROVED payments unless force update is needed
                                    // For bulk import, we generally skip if already approved.
                                    $existingMemberPayment = Payment::where('user_id', $uid)
                                        ->where('activity_id', $activity->id)
                                        ->when(isset($userPaymentMatch['activity_batch_id']), function($q) use ($userPaymentMatch) {
                                            return $q->where('activity_batch_id', $userPaymentMatch['activity_batch_id']);
                                        })
                                        ->first();

                                    if ($existingMemberPayment && $existingMemberPayment->status === 'approved') {
                                        Log::info("Skipping bulk payment distribution for User $uid - Already Approved");
                                        continue;
                                    }

                                    Payment::updateOrCreate(
                                        $userPaymentMatch,
                                        [
                                            'payment_method_id' => $existingPayment->payment_method_id,
                                            'amount' => $amount,
                                            'proof_of_payment' => $uniquePathRelative,
                                            'status' => 'pending',
                                            'notes' => 'Distributed from bulk upload by user '.auth()->id(),
                                            'verified_by' => null,
                                            'verified_at' => null,
                                        ]
                                    );
                                }
                        } catch (\Throwable $e) {
                            Log::error("Failed to enroll or distribute bulk payment to user $uid: ".$e->getMessage(), [
                                'user_id' => $uid,
                                'activity_id' => $activity->id,
                                'payment_id' => $existingPayment->id,
                            ]);
                        }

                        $count++;
                    }
                } else {
                    // Biarkan user tetap ke halaman upload bukti pembayaran manual
                    // agar bisa mengganti/mengunggah bukti tanpa diarahkan ke detail
                }
            }
            // Ambil rekening penerimaan milik creator kegiatan (semua jika ada)
            // Cek apakah ada pengaturan manual payment spesifik di activity
            if (!empty($activity->manual_payment_details) && is_array($activity->manual_payment_details)) {
                $creatorBankAccounts = $activity->manual_payment_details;
                $creatorBank = !empty($creatorBankAccounts) ? $creatorBankAccounts[0] : null;
            } else {
                $creatorBank = $this->getSavedBankAccount($activity->user_id);
                $creatorBankAccounts = $this->getSavedBankAccounts($activity->user_id) ?? [];
            }
            
            if (! is_array($creatorBankAccounts)) {
                $creatorBankAccounts = (array) $creatorBankAccounts;
            }

            // Ambil semua metode pembayaran aktif dan tampilkan HANYA yang cocok dengan bank kreator
            $paymentMethods = PaymentMethod::where('is_active', true)->get();

            $creatorBanks = [];
            foreach ($creatorBankAccounts as $acc) {
                if (is_array($acc) && ! empty($acc['bank_name'])) {
                    $creatorBanks[] = strtolower($acc['bank_name']);
                }
            }
            if (empty($creatorBanks) && $creatorBank && ! empty($creatorBank['bank_name'])) {
                $creatorBanks[] = strtolower($creatorBank['bank_name']);
            }

            // Pastikan setiap bank kreator memiliki entri PaymentMethod agar kartu dapat ditampilkan
            if (! empty($creatorBanks)) {
                foreach ($creatorBanks as $bankNameRaw) {
                    $bankLabel = trim($bankNameRaw);
                    if ($bankLabel === '') {
                        continue;
                    }
                    // Cari apakah sudah ada metode dengan nama mengandung bank tersebut
                    $exists = PaymentMethod::where('name', 'like', '%'.$bankLabel.'%')->exists();
                    if (! $exists) {
                        // Buat entri generic untuk bank ini, detail rekening akan diisi dari kreator saat render
                        PaymentMethod::firstOrCreate(
                            ['name' => 'Transfer Bank '.strtoupper($bankLabel)],
                            [
                                'account_number' => null,
                                'account_name' => null,
                                'is_active' => true,
                            ]
                        );
                    }
                }
                // Refresh daftar metode setelah kemungkinan penambahan
                $paymentMethods = PaymentMethod::where('is_active', true)->get();
            }

            if (! empty($creatorBanks)) {
                $paymentMethods = $paymentMethods->filter(function ($method) use ($creatorBanks) {
                    $name = strtolower($method->name ?? '');
                    foreach ($creatorBanks as $bn) {
                        if ($bn !== '' && strpos($name, $bn) !== false) {
                            return true;
                        }
                    }

                    return false;
                })->values();

                // Override detail rekening dengan data kreator
                $paymentMethods->transform(function ($method) use ($creatorBankAccounts) {
                    $methodName = strtolower($method->name);
                    foreach ($creatorBankAccounts as $acc) {
                        if (isset($acc['bank_name']) && strpos($methodName, strtolower($acc['bank_name'])) !== false) {
                            $method->account_name = $acc['account_name'] ?? $method->account_name;
                            $method->account_number = $acc['account_number'] ?? $method->account_number;
                            break;
                        }
                    }
                    return $method;
                });
            } else {
                // If creator has no keys, do not empty the list. 
                // Fallback to ALL active methods (System Default) or create a generic one.
                if ($paymentMethods->isEmpty()) {
                     PaymentMethod::firstOrCreate(
                        ['name' => 'Transfer Bank (Manual)'],
                        [
                            'account_number' => null,
                            'account_name' => null,
                            'is_active' => true,
                        ]
                    );
                    $paymentMethods = PaymentMethod::where('is_active', true)->get();
                }
            }

            $bulk = session('import_bulk_payment') ?? session('import_bulk_payment_payload');

            // Get default sender data from last payment or user profile
            $lastPayment = Payment::where('user_id', auth()->id())
                ->whereNotNull('sender_name')
                ->orderBy('created_at', 'desc')
                ->first();

            $defaultSenderName = $lastPayment?->sender_name ?? auth()->user()->name;

            if (request()->expectsJson() || request()->boolean('modal')) {
                return response()->json([
                    'activity' => $activity,
                    'paymentMethods' => $paymentMethods,
                    'creatorBank' => $creatorBank,
                    'creatorBankAccounts' => $creatorBankAccounts,
                    'bulk_import_payment' => $bulk,
                    'defaultSenderName' => $defaultSenderName,
                ]);
            }

            return Inertia::render('Payments/ManualForm', [
                'activity' => $activity,
                'paymentMethods' => $paymentMethods,
                'creatorBank' => $creatorBank,
                'creatorBankAccounts' => $creatorBankAccounts,
                'bulk_import_payment' => $bulk,
                'is_modal' => request()->boolean('modal'),
                'defaultSenderName' => $defaultSenderName,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error in payment create: '.$e->getMessage(), [
                'activity_id' => $activity->id,
                'payment_method_type' => $activity->payment_method_type,
                'trace' => $e->getTraceAsString(),
            ]);
            
            if (request()->expectsJson() || request()->boolean('modal')) {
                return response('<div class="alert alert-danger">Terjadi kesalahan saat memuat halaman pembayaran: ' . $e->getMessage() . '</div>', 500);
            }

            return redirect()->route('activity.show', $activity->id)
                ->with('error', 'Terjadi kesalahan saat memuat halaman pembayaran: '.$e->getMessage());
        }
    }

    public function getPaymentMethodsJson(Activity $activity)
    {
        try {
            // Replicate logic from create method
            if (!empty($activity->manual_payment_details) && is_array($activity->manual_payment_details)) {
                $creatorBankAccounts = $activity->manual_payment_details;
                $creatorBank = !empty($creatorBankAccounts) ? $creatorBankAccounts[0] : null;
            } else {
                $creatorBank = $this->getSavedBankAccount($activity->user_id);
                $creatorBankAccounts = $this->getSavedBankAccounts($activity->user_id) ?? [];
            }

            if (! is_array($creatorBankAccounts)) {
                $creatorBankAccounts = (array) $creatorBankAccounts;
            }

            $paymentMethods = PaymentMethod::where('is_active', true)->get();

            $creatorBanks = [];
            foreach ($creatorBankAccounts as $acc) {
                if (is_array($acc) && ! empty($acc['bank_name'])) {
                    $creatorBanks[] = strtolower($acc['bank_name']);
                }
            }
            if (empty($creatorBanks) && $creatorBank && ! empty($creatorBank['bank_name'])) {
                $creatorBanks[] = strtolower($creatorBank['bank_name']);
            }

            if (! empty($creatorBanks)) {
                // Ensure generic methods exist
                foreach ($creatorBanks as $bankNameRaw) {
                    $bankLabel = trim($bankNameRaw);
                    if ($bankLabel === '') continue;
                    // Cari apakah sudah ada metode dengan nama mengandung bank tersebut
                    $exists = PaymentMethod::where('name', 'like', '%'.$bankLabel.'%')->exists();
                    if (! $exists) {
                        PaymentMethod::firstOrCreate(
                            ['name' => 'Transfer Bank '.strtoupper($bankLabel)],
                            [
                                'account_number' => null,
                                'account_name' => null,
                                'is_active' => true,
                            ]
                        );
                    }
                }
                // Refresh daftar metode setelah kemungkinan penambahan
                $paymentMethods = PaymentMethod::where('is_active', true)->get();

                $paymentMethods = $paymentMethods->filter(function ($method) use ($creatorBanks) {
                    $name = strtolower($method->name ?? '');
                    foreach ($creatorBanks as $bn) {
                        if ($bn !== '' && strpos($name, $bn) !== false) {
                            return true;
                        }
                    }
                    return false;
                })->values();

                // Override detail rekening dengan data kreator
                $paymentMethods->transform(function ($method) use ($creatorBankAccounts) {
                    $methodName = strtolower($method->name);
                    foreach ($creatorBankAccounts as $acc) {
                        if (isset($acc['bank_name']) && strpos($methodName, strtolower($acc['bank_name'])) !== false) {
                            $method->account_name = $acc['account_name'] ?? $method->account_name;
                            $method->account_number = $acc['account_number'] ?? $method->account_number;
                            break;
                        }
                    }
                    return $method;
                });
            } else {
                // If creator has no keys, do not empty the list. 
                // Fallback to ALL active methods (System Default) or create a generic one.
                if ($paymentMethods->isEmpty()) {
                     PaymentMethod::firstOrCreate(
                        ['name' => 'Transfer Bank (Manual)'],
                        [
                            'account_number' => null,
                            'account_name' => null,
                            'is_active' => true,
                        ]
                    );
                    $paymentMethods = PaymentMethod::where('is_active', true)->get();
                }
                // Do not filter, just use what is available
            }

            // Get default sender data from last payment or user profile
            $lastPayment = Payment::where('user_id', auth()->id())
                ->whereNotNull('sender_name')
                ->orderBy('created_at', 'desc')
                ->first();

            $defaultSenderName = $lastPayment?->sender_name ?? auth()->user()->name;

            return response()->json([
                'success' => true,
                'paymentMethods' => $paymentMethods,
                'creatorBank' => $creatorBank,
                'creatorBankAccounts' => $creatorBankAccounts,
                'defaultSenderName' => $defaultSenderName,
            ]);

        } catch (\Exception $e) {
             Log::error('Error fetching payment methods: '.$e->getMessage());
             return response()->json(['success' => false, 'message' => 'Error fetching payment methods'], 500);
        }
    }

    public function store(Request $request, Activity $activity)
    {
        Log::info('PaymentController::store initiated', [
            'user_id' => auth()->id(),
            'activity_id' => $activity->id,
            'request_method' => $request->method(),
        ]);

        try {
            // Check for active batch
            $activeBatch = $activity->activeBatch;
            $hasBatches = $activity->batches()->exists();

            // Determine effective batch context
            // Prioritize existing pending/verification enrollment to allow paying for previous batches if user is already registered
            $pendingEnrollment = ActivityUser::where('user_id', auth()->id())
                ->where('activity_id', $activity->id)
                ->whereIn('status', [ActivityUser::STATUS_VERIFICATION])
                ->orderBy('created_at', 'desc')
                ->first();

            $targetBatchId = null;
            if ($pendingEnrollment) {
                $targetBatchId = $pendingEnrollment->activity_batch_id;
            } elseif ($activeBatch) {
                $targetBatchId = $activeBatch->id;
            }

            // Validate targetBatchId exists to prevent FK errors (e.g. if batch was deleted)
            if ($targetBatchId && ! ActivityBatch::where('id', $targetBatchId)->exists()) {
                $targetBatchId = null;
            }

            // If batches exist but none is active and no pending enrollment, reject registration/payment
            if ($hasBatches && ! $activeBatch && ! $pendingEnrollment) {
                if ($request->expectsJson() || $request->boolean('modal')) {
                    return response()->json(['success' => false, 'message' => 'Pendaftaran untuk kegiatan ini sedang ditutup (Tidak ada gelombang/sesi aktif).'], 422);
                }
                return redirect()->back()->with('error', 'Pendaftaran untuk kegiatan ini sedang ditutup (Tidak ada gelombang/sesi aktif).');
            }

            // Check profile completeness (SKIP if this is a bulk payment/import request)
            if (! $request->boolean('is_bulk')) {
                $user = auth()->user();
                if (! $user->relationLoaded('profile')) {
                    $user->load('profile');
                }

                $validationKeys = ['name', 'email']; // Default basic mandatory only

                // Add keys from import_template
                $template = $activity->import_template;
                if ($template) {
                    $cols = array_map('trim', explode(',', $template));
                    foreach ($cols as $col) {
                        if (str_ends_with($col, '*')) {
                            $key = substr($col, 0, -1);
                            // Normalize key
                            $key = preg_replace('/^\d+\./', '', $key);
                            $key = strtolower(trim($key));
                            $key = preg_replace('/[\x00-\x1F\x7F\xA0]/u', '', $key);

                            if (str_starts_with($key, 'user:')) {
                                $key = substr($key, 5);
                            }
                            if (str_starts_with($key, 'profile:')) {
                                $key = substr($key, 8);
                            }

                            // Mapping English/Common keys to DB columns
                            $keyMap = [
                                'position' => 'jabatan',
                                'occupation' => 'pekerjaan',
                                'job' => 'pekerjaan',
                                'institution' => 'instansi',
                                'company' => 'instansi',
                                'agency' => 'instansi',
                                'organization' => 'instansi',
                                'gender' => 'jenis_kelamin',
                                'sex' => 'jenis_kelamin',
                                'phone' => 'no_hp',
                                'mobile' => 'no_hp',
                                'whatsapp' => 'no_hp',
                                'hp' => 'no_hp',
                                'address' => 'alamat',
                                'dob' => 'birth_date',
                                'birth date' => 'birth_date',
                                'date of birth' => 'birth_date',
                                'tgl lahir' => 'birth_date',
                                'pob' => 'birth_place',
                                'birth place' => 'birth_place',
                                'place of birth' => 'birth_place',
                                'tempat lahir' => 'birth_place',
                                'nik' => 'nik',
                                'ktp' => 'nik',
                                'id number' => 'nik',
                            ];

                            if (isset($keyMap[$key])) {
                                $key = $keyMap[$key];
                            }

                            if ($key !== 'password') {
                                $validationKeys[] = $key;
                            }
                        }
                    }
                }

                // REMOVED: merging mandatory_profile_fields to strictly follow template as requested
                
                $validationKeys = array_unique($validationKeys);

                // Perform Unified Validation
                $missingProfileData = $user->getIncompleteProfileData($validationKeys);
                $missingFields = array_column($missingProfileData, 'label');
                $missingFieldKeys = array_column($missingProfileData, 'key');

                if (! empty($missingFields)) {
                    $errorMsg = 'Profil Anda belum lengkap. Lengkapi data berikut: '.implode(', ', array_unique($missingFields));

                    if ($request->expectsJson() || $request->boolean('modal')) {
                        return response()->json([
                            'success' => false,
                            'message' => $errorMsg,
                            'missing_fields' => $missingFields,
                            'missing_keys' => $missingFieldKeys
                        ], 422);
                    }
                    return redirect()->route('activity.detail', $activity->id)
                        ->with('error', $errorMsg)
                        ->with('missing_profile_fields', $missingFieldKeys);
                }
            }

            // Check participant limit for creator's activity
            if ($activity->user && $activity->user->isCreator()) {
                $currentParticipantCount = ActivityUser::where('activity_id', $activity->id)
                    ->where('status', ActivityUser::STATUS_ACTIVE)
                    ->count();

                $canAccept = $activity->user->canAcceptParticipants($activity, $currentParticipantCount);
                if (! $canAccept['allowed']) {
                    if ($request->expectsJson() || $request->boolean('modal')) {
                        return response()->json(['success' => false, 'message' => $canAccept['message']], 422);
                    }
                    return redirect()->back()
                        ->with('error', $canAccept['message']);
                }
            }

            // Jika activity gratis, langsung daftarkan user tanpa validasi pembayaran
            if ($activity->price == 0) {
                $matchAttributes = [
                    'user_id' => auth()->id(),
                    'activity_id' => $activity->id,
                ];
                if ($targetBatchId) {
                    $matchAttributes['activity_batch_id'] = $targetBatchId;
                } else {
                    $matchAttributes['activity_batch_id'] = null;
                }

                $activityUser = ActivityUser::firstOrNew($matchAttributes);
                if (! $activityUser->exists) {
                    $activityUser->created_at = now();
                }
                $activityUser->status = 1; // langsung aktif
                $activityUser->updated_at = now();
                $activityUser->save();

                if ($request->expectsJson() || $request->boolean('modal')) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Anda berhasil mendaftar ke kegiatan gratis.',
                        'redirect_url' => route('activity.show', $activity->id)
                    ]);
                }

                return redirect()->route('activity.show', $activity->id)
                    ->with('success', 'Anda berhasil mendaftar ke kegiatan gratis.');
            }

            // Check payment method type - redirect ke Midtrans jika automatic
            if ($activity->hasAutomaticPayment()) {
                if ($request->expectsJson() || $request->boolean('modal')) {
                    return response()->json([
                        'success' => true,
                        'redirect_url' => route('midtrans.payment.create', $activity->id)
                    ]);
                }
                return redirect()->route('midtrans.payment.create', $activity->id);
            }

            // Check if user already has a payment for this activity
            $paymentQuery = Payment::where('user_id', auth()->id())
                ->where('activity_id', $activity->id);

            if ($targetBatchId) {
                $paymentQuery->where('activity_batch_id', $targetBatchId);
            } else {
                $paymentQuery->whereNull('activity_batch_id');
            }

            // Fix: Retrieve all matching payments to distinguish between Bulk and Mandiri
            $payments = $paymentQuery->orderBy('created_at', 'desc')->get();
            $isBulkRequest = request()->boolean('is_bulk'); // This might be from form input or URL

            // However, in store(), we rely more on the session 'import_bulk_payment'
            // because the user might have manipulated the form.
            // But let's check the session first.
            $bulkSession = session('import_bulk_payment') ?? session('import_bulk_payment_payload');
            $isBulkSession = is_array($bulkSession);

            // Find the correct payment record based on session type
            $existingPayment = $payments->first(function ($p) use ($isBulkSession) {
                $notes = json_decode($p->notes, true);
                $isBulkPayment = is_array($notes) && ! empty($notes['bulk_import']);

                return $isBulkSession === $isBulkPayment;
            });

            // Jika sudah ada pembayaran manual pending, lanjutkan untuk update bukti
            // Jika pembayaran otomatis, arahkan ke halaman detail pembayaran
            if ($existingPayment) {
                if (! $existingPayment->midtrans_transaction_id) {
                    // manual: lanjutkan proses upload untuk update existingPayment
                } else {
                    if ($request->expectsJson() || $request->boolean('modal')) {
                        return response()->json([
                            'success' => true,
                            'message' => 'Anda sudah memiliki pembayaran untuk kegiatan ini.',
                            'payment_id' => $existingPayment->id
                        ]);
                    }
                    return redirect()->route('activity.show', $activity->id)
                        ->with('info', 'Anda sudah memiliki pembayaran untuk kegiatan ini. Detail ditampilkan di popup pada halaman kegiatan.');
                }
            }

            // Log request data
            Log::info('Payment Request Data:', [
                'request_all' => $request->all(),
                'files' => $request->allFiles(),
                'activity_id' => $activity->id,
                'user_id' => auth()->id(),
            ]);



            DB::beginTransaction();

            // Validate request
            $validated = $request->validate([
                'payment_method_id' => 'required|exists:payment_methods,id',
                'payment_proof' => 'required|image|mimes:jpeg,png,jpg,gif|max:51200',
                'notes' => 'nullable|string|max:255',
                'sender_name' => 'nullable|string|max:255',
                'sender_bank' => 'nullable|string|max:255',
            ]);

            // Log validated data
            Log::info('Validated Data:', $validated);

            // Fix: Clean up stale bulk session data if this is not a bulk payment request
            if (! $request->boolean('is_bulk')) {
                session()->forget(['import_bulk_payment', 'import_bulk_payment_payload']);
            }

            // Fix: Check bulk session integrity to prevent accidental self-registration
            // If form indicates bulk but session is missing, abort.
            if ($request->boolean('is_bulk')) {
                $bulkCheck = session('import_bulk_payment') ?? session('import_bulk_payment_payload');
                if (! is_array($bulkCheck)) {
                    if ($request->expectsJson() || $request->boolean('modal')) {
                        return response()->json(['success' => false, 'message' => 'Sesi pembayaran massal telah berakhir. Silakan ulangi proses impor dari awal.'], 422);
                    }
                    return redirect()->route('activity.participants.index', $activity->id)
                        ->with('error', 'Sesi pembayaran massal telah berakhir. Silakan ulangi proses impor dari awal.');
                }
            }

            // Handle file upload
            if ($request->hasFile('payment_proof')) {
                $file = $request->file('payment_proof');
                $filename = time().'_'.$file->getClientOriginalName();

                // Store in the payment-proofs directory using Storage facade
                $path = $file->storeAs('payment-proofs', $filename, 'public');

                $bulk = session('import_bulk_payment') ?? session('import_bulk_payment_payload');
                $amount = (int) $activity->price;
                $notesField = $validated['notes'] ?? null;
                if (is_array($bulk)) {
                    $amount = (int) ($bulk['gross_amount'] ?? $amount);
                    $notesField = json_encode([
                        'bulk_import' => true,
                        'allowed_count' => (int) data_get($bulk, 'allowed_count', 0),
                        'user_ids' => (array) data_get($bulk, 'pending_user_ids', []),
                        'successfully_imported_count' => (int) data_get($bulk, 'successfully_imported_count', 0),
                    ]);
                }
                if ($existingPayment && ! $existingPayment->midtrans_transaction_id && ! is_array($bulk)) {
                    Log::info('Updating existing manual payment', ['payment_id' => $existingPayment->id]);
                    $existingPayment->update([
                        'payment_method_id' => $validated['payment_method_id'],
                        'amount' => $amount,
                        'proof_of_payment' => $path,
                        'sender_name' => $validated['sender_name'] ?? null,
                        'status' => 'pending',
                        'verified_by' => null,
                        'verified_at' => null,
                        'notes' => $notesField ?? $existingPayment->notes,
                    ]);
                    $payment = $existingPayment->fresh();
                } else {
                    Log::info('Creating new manual payment', ['is_bulk' => is_array($bulk)]);
                    // For bulk payments or new payments, always create a new record
                    // This prevents overwriting a personal 'mandiri' payment with a bulk group payment
                    $paymentMatch = [
                        'user_id' => auth()->id(),
                        'activity_id' => $activity->id,
                    ];
                    if (is_array($bulk) && isset($bulk['activity_batch_id'])) {
                        $paymentMatch['activity_batch_id'] = $bulk['activity_batch_id'];
                    } elseif ($targetBatchId) {
                        $paymentMatch['activity_batch_id'] = $targetBatchId;
                    } else {
                        $paymentMatch['activity_batch_id'] = null;
                    }

                    $payment = Payment::create(array_merge($paymentMatch, [
                        'payment_method_id' => $validated['payment_method_id'],
                        'amount' => $amount,
                        'proof_of_payment' => $path,
                        'sender_name' => $validated['sender_name'] ?? null,
                        'status' => 'pending',
                        'notes' => $notesField,
                    ]));
                }

                Log::info('Payment record created:', $payment->toArray());

                $activityUser = null;
                $uids = [];
                $limit = 0;
                if (! is_array($bulk)) {
                    $auMatch = [
                        'user_id' => auth()->id(),
                        'activity_id' => $activity->id,
                    ];
                    if ($targetBatchId) {
                        $auMatch['activity_batch_id'] = $targetBatchId;
                    } else {
                        $auMatch['activity_batch_id'] = null;
                    }

                    $auData = [
                        'status' => ActivityUser::STATUS_VERIFICATION,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];

                    // Ambil custom_data dari payment notes jika ada (disimpan saat enrollment)
                    if ($payment->notes) {
                        $notes = json_decode($payment->notes, true);
                        if (is_array($notes) && isset($notes['custom_data'])) {
                            $auData['custom_data'] = $notes['custom_data'];
                        }
                    }

                    $activityUser = ActivityUser::updateOrCreate(
                        $auMatch,
                        $auData
                    );
                } else {
                    $uids = (array) data_get($bulk, 'pending_user_ids', []);
                    $uids = array_values(array_unique($uids));
                    $limit = (int) data_get($bulk, 'allowed_count', count($uids));
                    // Jika peng-upload ada di daftar impor, ikut diantrikan, jika tidak, jangan daftarkan otomatis
                    if (in_array(auth()->id(), $uids)) {
                        $auMatch = [
                            'user_id' => auth()->id(),
                            'activity_id' => $activity->id,
                        ];
                        if (isset($bulk['activity_batch_id'])) {
                            $auMatch['activity_batch_id'] = $bulk['activity_batch_id'];
                        } elseif ($activeBatch) {
                            $auMatch['activity_batch_id'] = $activeBatch->id;
                        } else {
                            $auMatch['activity_batch_id'] = null;
                        }

                        $activityUser = ActivityUser::updateOrCreate(
                            $auMatch,
                            [
                                'status' => ActivityUser::STATUS_VERIFICATION,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]
                        );
                    }
                }
                if (is_array($bulk)) {
                    $uids = (array) data_get($bulk, 'pending_user_ids', []);
                    $uids = array_values(array_unique($uids));
                    // Filter UIDs to ensure they exist in users table to prevent FK violations
                    $validUids = User::whereIn('id', $uids)->pluck('id')->toArray();

                    $count = 0;
                    foreach ($validUids as $uid) {
                        if ($count >= $limit) {
                            break;
                        }
                        $bulkMatch = [
                            'user_id' => $uid,
                            'activity_id' => $activity->id,
                        ];
                        if (isset($bulk['activity_batch_id'])) {
                            $bulkMatch['activity_batch_id'] = $bulk['activity_batch_id'];
                        } elseif ($targetBatchId) {
                            $bulkMatch['activity_batch_id'] = $targetBatchId;
                        } else {
                            $bulkMatch['activity_batch_id'] = null;
                        }

                        $distributedUser = ActivityUser::updateOrCreate(
                            $bulkMatch,
                            [
                                'status' => ActivityUser::STATUS_VERIFICATION,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]
                        );

                        // Distribute payment proof to individual user (Store Method)
                        try {
                            if (isset($path) && $path) {
                                if (Storage::disk('public')->exists($path)) {
                                    $ext = pathinfo($path, PATHINFO_EXTENSION);
                                    $uniqueName = 'payment_bulk_'.$activity->id.'_'.$uid.'_'.uniqid().'.'.$ext;
                                    $uniquePathRelative = 'payment-proofs/'.$uniqueName;
                                    
                                    Storage::disk('public')->copy($path, $uniquePathRelative);

                                    // Create/Update Payment Record for User
                                    $userPaymentMatch = [
                                        'user_id' => $uid,
                                        'activity_id' => $activity->id,
                                    ];
                                    if (isset($bulkMatch['activity_batch_id'])) {
                                        $userPaymentMatch['activity_batch_id'] = $bulkMatch['activity_batch_id'];
                                    } else {
                                        $userPaymentMatch['activity_batch_id'] = null;
                                    }

                                    // Prevent overwriting APPROVED payments
                                    $existingMemberPayment = Payment::where('user_id', $uid)
                                        ->where('activity_id', $activity->id)
                                        ->when(isset($userPaymentMatch['activity_batch_id']), function($q) use ($userPaymentMatch) {
                                            return $q->where('activity_batch_id', $userPaymentMatch['activity_batch_id']);
                                        })
                                        ->first();

                                    if ($existingMemberPayment && $existingMemberPayment->status === 'approved') {
                                        Log::info("Skipping bulk payment distribution for User $uid - Already Approved");
                                        continue;
                                    }

                                    Payment::updateOrCreate(
                                        $userPaymentMatch,
                                        [
                                            'payment_method_id' => $validated['payment_method_id'],
                                            'amount' => $amount,
                                            'proof_of_payment' => $uniquePathRelative,
                                            'sender_name' => $validated['sender_name'] ?? null,
                                            'status' => 'pending',
                                            'notes' => json_encode([
                                                'user_ids' => $validUids,
                                                'bulk_import' => true,
                                                'uploaded_by' => auth()->id(),
                                                'description' => 'Distributed from bulk upload',
                                            ]),
                                            'verified_by' => null,
                                            'verified_at' => null,
                                        ]
                                    );
                                }
                            }
                        } catch (\Exception $e) {
                            Log::error("Failed to distribute payment proof to user $uid: ".$e->getMessage());
                        }

                        $count++;
                    }
                }

                Log::info('Activity User record created/updated:', $activityUser ? $activityUser->toArray() : ['message' => 'Bulk import queued for verification']);

                DB::commit();
                Log::info('Transaction committed successfully');

                // Clear bulk session data to prevent data leakage to subsequent registrations
                session()->forget(['import_bulk_payment', 'import_bulk_payment_payload']);

                // Setelah bayar manual, arahkan kembali ke halaman detail kegiatan
                if ($request->expectsJson() || $request->boolean('modal')) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Bukti pembayaran berhasil dikirim. Silakan tunggu verifikasi dari admin.',
                        'payment_id' => $existingPayment ? $existingPayment->id : ($payment ? $payment->id : null)
                    ]);
                }

                return redirect()->route('activity.detail', $activity->id)
                    ->with('success', 'Bukti pembayaran berhasil dikirim. Silakan tunggu verifikasi dari admin.');
            }

            if ($request->expectsJson() || $request->boolean('modal')) {
                return response()->json(['success' => false, 'message' => 'Gagal mengunggah bukti pembayaran'], 422);
            }

            return redirect()->back()->with('error', 'Gagal mengunggah bukti pembayaran');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Payment Error: '.$e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            if ($request->expectsJson() || $request->boolean('modal')) {
                return response()->json(['success' => false, 'message' => 'Terjadi kesalahan saat mengirim bukti pembayaran: '.$e->getMessage()], 500);
            }

            return redirect()->back()
                ->with('error', 'Terjadi kesalahan saat mengirim bukti pembayaran: '.$e->getMessage())
                ->withInput();
        }
    }

    public function show(Payment $payment)
    {
        try {
            // Eager load activity untuk menghindari N+1 query
            $payment->load('activity');

            // Check access: user can see their own payment, admin/superadmin can see all,
            // or creator/committee members can see payments for their activities
            $canViewOwnPayment = auth()->id() === $payment->user_id;
            $canViewAllPayments = auth()->user()->hasPermission('view_payments');
            $canViewOwnActivityPayments = auth()->user()->hasPermission('view_payments_own_activity') &&
                                         $payment->activity &&
                                         $payment->activity->canManageRegistration(auth()->id());

            $canView = $canViewOwnPayment || $canViewAllPayments || $canViewOwnActivityPayments;

            // Debug logging untuk creator
            if (auth()->user()->isCreator()) {
                Log::info('Creator payment view check', [
                    'payment_id' => $payment->id,
                    'creator_id' => auth()->id(),
                    'activity_id' => $payment->activity_id,
                    'activity_owner_id' => $payment->activity ? $payment->activity->user_id : null,
                    'is_activity_owner' => $payment->activity ? ($payment->activity->user_id == auth()->id()) : false,
                    'has_view_payments_own_activity' => auth()->user()->hasPermission('view_payments_own_activity'),
                    'can_manage_registration' => $payment->activity ? $payment->activity->canManageRegistration(auth()->id()) : false,
                    'canView' => $canView,
                ]);
            }

            if (! $canView) {
                abort(403, 'Anda tidak memiliki akses ke pembayaran ini');
            }

            $activity = $payment->activity;

            // Jika pembayaran Midtrans, cek status terkini dari Midtrans API
            if ($payment->midtrans_transaction_id && $payment->status === 'pending') {
                try {
                    $midtransController = new MidtransPaymentController;
                    $midtransController->checkPaymentStatus($payment);
                    $payment->refresh();
                } catch (\Exception $e) {
                    Log::warning('Error checking Midtrans payment status in show', [
                        'payment_id' => $payment->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            // Check enrollment status
            $userEnrollment = ActivityUser::where('user_id', $payment->user_id)
                ->where('activity_id', $payment->activity_id)
                ->first();
            $isEnrolled = $userEnrollment && $userEnrollment->status == ActivityUser::STATUS_ACTIVE;
            $isRegistered = $userEnrollment ? true : false;
            $enrollmentStatus = $userEnrollment ? $userEnrollment->status : null;

            // Determine current status for display
            if ($isEnrolled) {
                $currentStatus = 'enrolled';
            } elseif ($userEnrollment && $userEnrollment->status == ActivityUser::STATUS_VERIFICATION) {
                $currentStatus = 'verification';
            } elseif ($userEnrollment && $userEnrollment->status == ActivityUser::STATUS_REJECTED) {
                $currentStatus = 'rejected';
            } else {
                $currentStatus = 'not enrolled';
            }

            return redirect()->route('activity.show', $payment->activity_id)
                ->with('info', 'Detail pembayaran kini ditampilkan melalui popup pada halaman kegiatan.');
        } catch (\Exception $e) {
            Log::error('Error in payment show: '.$e->getMessage(), [
                'payment_id' => $payment->id,
                'user_id' => auth()->id(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->back()->with('error', 'Terjadi kesalahan saat memuat detail pembayaran');
        }
    }

    public function lookupByActivityUser(\Illuminate\Http\Request $request)
    {
        try {
            $request->validate([
                'activity_id' => 'required|string|exists:activities,id',
                'user_id' => 'required|string|exists:users,id',
            ]);

            $activityId = $request->input('activity_id');
            $userId = $request->input('user_id');
            $activity = Activity::find($activityId);
            if (! $activity) {
                return response()->json(['success' => false, 'message' => 'Kegiatan tidak ditemukan'], 404);
            }

            // Handle Free Activity
            // Check if activity or the user's batch is free
            $isFree = false;
            if ($activity->price == 0) {
                $isFree = true;
            }
            
            // Check specific batch price if user is enrolled in one
            $activityUser = ActivityUser::where('activity_id', $activity->id)
                ->where('user_id', $userId)
                ->orderBy('id', 'desc')
                ->first();
                
            if ($activityUser && $activityUser->activity_batch_id) {
                $batch = ActivityBatch::find($activityUser->activity_batch_id);
                if ($batch && $batch->price !== null) {
                    $isFree = $batch->price == 0;
                }
            }

            if ($isFree) {
                 return response()->json([
                    'success' => true, 
                    'message' => 'Kegiatan gratis (tidak memerlukan pembayaran)',
                    'is_free' => true,
                    'payment' => null
                ]);
            }

            $currentUser = auth()->user();
            $targetUserId = $userId;
            $canView = $currentUser
                && (
                    // Izinkan pengguna melihat pembayaran miliknya sendiri
                    ($currentUser->id === $targetUserId)
                    // Atau memiliki hak akses melihat pembayaran pada aktivitas terkait
                    || $currentUser->canViewPayment($activity)
                );
            if (! $canView) {
                return response()->json(['success' => false, 'message' => 'Anda tidak memiliki akses'], 403);
            }

            $payment = null;
            $directPayment = null;
            $bulkCandidate = null;
            $groupPayment = null;

            // Strategy 1: Direct Individual Payment
            // Prioritize Approved > Pending > Rejected > Others
            // We fetch all to determine the best candidate
            $directPayments = Payment::with(['paymentMethod'])
                ->where('activity_id', $activity->id)
                ->where('user_id', $targetUserId)
                ->orderByDesc('id')
                ->get();

            if ($directPayments->isNotEmpty()) {
                // Try to find approved or pending first
                $directPayment = $directPayments->first(function ($p) {
                    return in_array($p->status, ['approved', 'pending']);
                });
                
                // If not found, take the latest one (even if rejected)
                if (! $directPayment) {
                    $directPayment = $directPayments->first();
                }
            }

            // Strategy 2: Check via Bulk Payment (Notes)
            // Look for a valid bulk payment that includes this user
            $bulkCandidate = Payment::where('activity_id', $activity->id)
                ->whereIn('status', ['approved', 'pending'])
                ->whereNotNull('notes')
                ->where(function($q) {
                    $q->where('notes', 'like', '%"bulk_import"%')
                      ->orWhere('notes', 'like', '%"user_ids"%');
                })
                ->orderByDesc('id')
                ->get()
                ->first(function ($p) use ($targetUserId) {
                    if (is_string($p->notes)) {
                        $decoded = json_decode($p->notes, true);
                        if (is_array($decoded)) {
                            // Check user_ids at root level (Store method format)
                            $uids = [];
                            if (!empty($decoded['user_ids'])) {
                                $uids = $decoded['user_ids'];
                            } 
                            // Check nested in bulk_import (Possible legacy format)
                            elseif (!empty($decoded['bulk_import']) && is_array($decoded['bulk_import']) && !empty($decoded['bulk_import']['user_ids'])) {
                                $uids = $decoded['bulk_import']['user_ids'];
                            }

                            if (!empty($uids)) {
                                $uids = array_map('strval', (array) $uids);
                                return in_array((string) $targetUserId, $uids, true);
                            }
                        }
                    }
                    return false;
                });
            
            // Strategy 3: Check via ActivityParticipantGroup
            if ($activityUser && $activityUser->activity_participant_group_id) {
                 $groupUserIds = ActivityUser::where('activity_id', $activity->id)
                    ->where('activity_participant_group_id', $activityUser->activity_participant_group_id)
                    ->pluck('user_id')
                    ->toArray();

                if (! empty($groupUserIds)) {
                    // Find any payment from these users (including the payer/leader)
                    $groupPayment = Payment::with(['paymentMethod'])
                        ->where('activity_id', $activity->id)
                        ->whereIn('user_id', $groupUserIds)
                        ->whereIn('status', ['approved', 'pending'])
                        ->orderByDesc('amount')
                        ->orderByDesc('id')
                        ->first();
                }
            }

            // Final selection preference:
            // 1) Bulk payment (explicit user_ids)
            // 2) Group payment (participant group)
            // 3) Direct payment (mandiri)
            if ($bulkCandidate) {
                $payment = $bulkCandidate->loadMissing('paymentMethod');
            } elseif ($groupPayment) {
                $payment = $groupPayment;
            } else {
                $payment = $directPayment;
            }

            if (! $payment) {
                return response()->json(['success' => false, 'message' => 'Pembayaran tidak ditemukan'], 404);
            }


            $isManual = (bool) ($payment->payment_method_id && ! $payment->midtrans_transaction_id);
            $proofPath = $payment->proof_of_payment;
            $proofUrl = null;
            if ($proofPath && $proofPath !== 'imported') {
                $fullPath = \Illuminate\Support\Str::startsWith($proofPath, 'assets/')
                    ? public_path($proofPath)
                    : public_path('storage/'.ltrim($proofPath, '/'));
                
                if (file_exists($fullPath)) {
                    $proofUrl = \Illuminate\Support\Str::startsWith($proofPath, 'assets/')
                        ? asset($proofPath)
                        : asset('storage/'.ltrim($proofPath, '/'));
                }
            }

            $approvedByName = null;
            if (in_array((string) $payment->status, ['approved', 'rejected'], true)) {
                if (! empty($payment->verified_by)) {
                    $approver = User::find($payment->verified_by);
                    $approvedByName = $approver ? ($approver->name ?? ('User #'.$approver->id)) : null;
                } elseif (! empty($payment->midtrans_transaction_id) && $payment->status === 'approved') {
                    $approvedByName = 'Sistem Midtrans';
                }
            }

            // Determine registration method and group members
            $registrationMethod = 'mandiri';
            $groupMembers = [];

            // Priority 1: ActivityParticipantGroup defines "kelompok"
            if ($activityUser && $activityUser->activity_participant_group_id) {
                $registrationMethod = 'kelompok';
                $groupMembers = ActivityUser::where('activity_id', $activity->id)
                    ->where('activity_participant_group_id', $activityUser->activity_participant_group_id)
                    ->with('user:id,name,email') // Eager load user
                    ->get()
                    ->filter(function ($au) {
                        return $au->user !== null;
                    }) // Filter orphaned records
                    ->map(function ($au) {
                        return [
                            'id' => $au->user_id,
                            'name' => $au->user ? $au->user->name : 'Unknown',
                            'email' => $au->user ? $au->user->email : '',
                        ];
                    })
                    ->values()
                    ->toArray();
            }

            // Priority 2: Fallback to notes (bulk import / legacy group)
            if ($registrationMethod === 'mandiri' && $payment->notes) {
                $decoded = $this->decodeNotesToArray($payment->notes);
                if (is_array($decoded)) {
                    $uids = [];
                    if (! empty($decoded['user_ids']) && is_array($decoded['user_ids'])) {
                        $uids = $decoded['user_ids'];
                    } elseif (! empty($decoded['bulk_import']) && is_array($decoded['bulk_import']) && ! empty($decoded['bulk_import']['user_ids'])) {
                        $uids = $decoded['bulk_import']['user_ids'];
                    }

                    if (! empty($uids)) {
                        $uidsNormalized = array_map('strval', $uids);
                        $isTargetMember = in_array((string) $targetUserId, $uidsNormalized, true);
                        if ($isTargetMember) {
                            $registrationMethod = 'kelompok';

                            // Filter users to ensure they are still participants in this activity
                            $groupMembers = User::whereIn('id', $uids)
                                ->whereIn('id', function ($query) use ($activity) {
                                    $query->select('user_id')
                                        ->from((new ActivityUser)->getTable())
                                        ->where('activity_id', $activity->id);
                                })
                                ->select('id', 'name', 'email')
                                ->get()
                                ->toArray();
                        }
                    }
                }
            }

            // Determine uploader
            $uploaderUser = $payment->user;
            if ($payment->notes) {
                $notes = $this->decodeNotesToArray($payment->notes);
                if (is_array($notes) && isset($notes['uploaded_by'])) {
                    $realUploader = User::with('profile')->find($notes['uploaded_by']);
                    if ($realUploader) {
                        $uploaderUser = $realUploader;
                    }
                }
            }

            // Adjust displayed amount
            $displayedAmount = (int) $payment->amount;

            $verifierNote = $payment->verifier_note;
            $publicNotes = null;
            $rejectionReason = null;

            if (is_string($verifierNote) && trim($verifierNote) !== '') {
                if ($payment->status === 'rejected') {
                    $rejectionReason = $verifierNote;
                } elseif ($payment->status === 'approved') {
                    $publicNotes = $verifierNote;
                }
            }

            return response()->json([
                'success' => true,
                'payment' => [
                    'id' => $payment->id,
                    'status' => $payment->status,
                    'amount' => $displayedAmount,
                    'original_amount' => (int) $payment->amount, // Keep original for reference if needed
                    'method_name' => $payment->paymentMethod->name ?? ($payment->midtrans_transaction_id ? 'Midtrans' : 'Gratis'),
                    'is_manual' => $isManual,
                    'proof_url' => $proofUrl,
                    'has_proof_file' => !empty($payment->proof_of_payment) && $payment->proof_of_payment !== 'imported',
                    'midtrans_snap_token' => $payment->midtrans_snap_token,
                    'midtrans_transaction_id' => $payment->midtrans_transaction_id,
                    'verified_by' => $payment->verified_by,
                    'verified_at' => in_array((string) $payment->status, ['approved', 'rejected'], true) ? optional($payment->verified_at)->format('Y-m-d H:i') : null,
                    'approved_by_name' => $approvedByName,
                    'group_members' => $groupMembers,
                    'registration_method' => $registrationMethod,
                    'verifier_note' => $verifierNote,
                    'notes' => $publicNotes,
                    'rejection_reason' => $rejectionReason,
                    'uploader' => [
                        'name' => $uploaderUser->name ?? 'Unknown',
                        'email' => $uploaderUser->email ?? '-',
                        'phone' => $uploaderUser->phone ?? ($uploaderUser->profile->no_hp ?? '-'),
                    ],
                ],
                'can_verify' => $currentUser->canVerifyPayment($activity),
            ]);
        } catch (\Throwable $e) {
            \Log::error('Lookup payment error', ['error' => $e->getMessage()]);

            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan'], 500);
        }
    }

    public function updateProof(Request $request, Payment $payment)
    {
        $canVerify = auth()->user()->canVerifyPayment($payment->activity);
        
        if (! $canVerify) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            return back()->with('error', 'Anda tidak memiliki akses untuk mengubah bukti pembayaran ini');
        }

        $request->validate([
            'proof_file' => 'required|image|max:10240', // 10MB max
        ]);

        if ($request->hasFile('proof_file')) {
            try {
                $file = $request->file('proof_file');
                $filename = 'proof_' . time() . '_' . $file->getClientOriginalName();
                $path = $file->storeAs('payment-proofs', $filename, 'public');
                
                // Delete old file if exists and not imported
                if ($payment->proof_of_payment && $payment->proof_of_payment !== 'imported') {
                    if (Storage::disk('public')->exists($payment->proof_of_payment)) {
                        Storage::disk('public')->delete($payment->proof_of_payment);
                    }
                }

                $payment->update([
                    'proof_of_payment' => $path,
                ]);

                // CASCADE UPDATE: Update proof for all group members
                $activityUser = ActivityUser::where('activity_id', $payment->activity_id)
                    ->where('user_id', $payment->user_id)
                    ->first();
                
                $relatedUserIds = [];

                // 1. Explicit Group
                if ($activityUser && $activityUser->activity_participant_group_id) {
                    $relatedUserIds = ActivityUser::where('activity_id', $payment->activity_id)
                        ->where('activity_participant_group_id', $activityUser->activity_participant_group_id)
                        ->pluck('user_id')
                        ->toArray();
                } else {
                    // 2. Implicit Group (via Payment Notes)
                    $decoded = $this->decodeNotesToArray($payment->notes);
                    if (is_array($decoded)) {
                        $uids = $decoded['user_ids'] ?? ($decoded['bulk_import']['user_ids'] ?? []);
                        if (is_array($uids) && !empty($uids)) {
                             // Verify current user is in the list
                             if (in_array((string)$payment->user_id, array_map('strval', $uids))) {
                                 $relatedUserIds = $uids;
                             }
                        }
                    }
                }

                $otherUserIds = array_diff($relatedUserIds, [$payment->user_id]);
                
                if (! empty($otherUserIds)) {
                        Log::info('Cascading proof update to group members', [
                            'parent_payment_id' => $payment->id,
                            'group_type' => $activityUser && $activityUser->activity_participant_group_id ? 'explicit' : 'implicit',
                            'affected_users' => $otherUserIds
                        ]);

                        foreach ($otherUserIds as $uid) {
                            try {
                                // Find or create payment for this user
                                $memberPayment = Payment::firstOrNew([
                                    'user_id' => $uid,
                                    'activity_id' => $payment->activity_id,
                                    'activity_batch_id' => $payment->activity_batch_id
                                ]);

                                // Copy file to unique path for this user
                                $ext = pathinfo($path, PATHINFO_EXTENSION);
                                $uniqueName = 'payment_group_'.$payment->activity_id.'_'.$uid.'_'.uniqid().'.'.$ext;
                                $uniquePathRelative = 'payment-proofs/'.$uniqueName;
                                
                                if (Storage::disk('public')->exists($path)) {
                                    Storage::disk('public')->copy($path, $uniquePathRelative);
                                    
                                    // Delete old proof if exists
                                    if ($memberPayment->exists && $memberPayment->proof_of_payment && $memberPayment->proof_of_payment !== 'imported') {
                                        if (Storage::disk('public')->exists($memberPayment->proof_of_payment)) {
                                            Storage::disk('public')->delete($memberPayment->proof_of_payment);
                                        }
                                    }

                                    $memberPayment->proof_of_payment = $uniquePathRelative;
                                    // Sync other fields if new
                                    if (!$memberPayment->exists) {
                                        $memberPayment->amount = $payment->amount;
                                        $memberPayment->status = 'pending'; 
                                        $memberPayment->payment_method_id = $payment->payment_method_id;
                                    }
                                    $memberPayment->save();
                                }
                            } catch (\Exception $e) {
                                Log::error("Failed to cascade proof to user $uid: " . $e->getMessage());
                            }
                        }
                    }

                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => true,
                        'message' => 'Bukti pembayaran berhasil diperbarui',
                        'proof_url' => asset('storage/' . $path)
                    ]);
                }

                return back()->with('success', 'Bukti pembayaran berhasil diperbarui');
            } catch (\Exception $e) {
                Log::error('Failed to update payment proof', ['error' => $e->getMessage()]);
                return back()->with('error', 'Gagal mengunggah file: ' . $e->getMessage());
            }
        }

        return back()->with('error', 'Tidak ada file yang diunggah');
    }

    public function update(Request $request, Payment $payment)
    {
        // Check permission
        $canVerify = auth()->user()->canVerifyPayment($payment->activity);
        
        // Debug logging similar to verify
        if (auth()->user()->isCreator() || ($payment->activity && $payment->activity->canManageRegistration(auth()->id()))) {
            Log::info('Creator/Committee payment update check', [
                'payment_id' => $payment->id,
                'user_id' => auth()->id(),
                'canVerify' => $canVerify,
            ]);
        }

        if (!$canVerify) {
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki akses untuk mengubah data pembayaran ini',
                ], 403);
            }
            return back()->with('error', 'Anda tidak memiliki akses untuk mengubah data pembayaran ini');
        }

        $validated = $request->validate([
            'notes' => 'nullable|string|max:255',
            'amount' => 'nullable|numeric|min:0',
            'proof_file' => 'nullable|image|max:10240', // 10MB max
            'payment_method_id' => 'nullable|exists:payment_methods,id',
            'sender_name' => 'nullable|string|max:255',
        ]);

        try {
            DB::beginTransaction();

            $updateData = [];

            // Handle Proof File
            if ($request->hasFile('proof_file')) {
                $file = $request->file('proof_file');
                $filename = 'proof_' . time() . '_' . $file->getClientOriginalName();
                $path = $file->storeAs('payment-proofs', $filename, 'public');
                
                // Delete old file if exists and not imported
                if ($payment->proof_of_payment && $payment->proof_of_payment !== 'imported') {
                    if (Storage::disk('public')->exists($payment->proof_of_payment)) {
                        Storage::disk('public')->delete($payment->proof_of_payment);
                    }
                }

                $updateData['proof_of_payment'] = $path;
            }

            // Handle Notes
            $newNotes = $payment->notes;
            if (array_key_exists('notes', $validated)) {
                $plainNote = $validated['notes'] === null ? '' : trim($validated['notes']);
                $decodedExisting = null;
                if (is_string($payment->notes)) {
                    $decoded = json_decode($payment->notes, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $decodedExisting = $decoded;
                    }
                }

                if (is_array($decodedExisting)) {
                    $decodedExisting['verifier_note'] = $plainNote;
                    $newNotes = json_encode($decodedExisting);
                } else {
                    $newNotes = $plainNote;
                }
                $updateData['notes'] = $newNotes;
            }

            // Handle Amount
            if (isset($validated['amount'])) {
                $updateData['amount'] = $validated['amount'];
            }

            // Handle Payment Method
            if (isset($validated['payment_method_id'])) {
                $updateData['payment_method_id'] = $validated['payment_method_id'];
            }

            // Handle Sender Name
            if (isset($validated['sender_name'])) {
                $updateData['sender_name'] = $validated['sender_name'];
            }

            // Jika ada upload bukti baru dan status bukan approved, kembalikan ke pending
            if (isset($updateData['proof_of_payment']) && $payment->status !== 'approved') {
                $updateData['status'] = 'pending';
            }

            if (!empty($updateData)) {
                $payment->update($updateData);
            }

            // Jika status kembali ke pending karena upload bukti, pastikan ActivityUser ada (status verifikasi)
            if (isset($updateData['status']) && $updateData['status'] === 'pending' && isset($updateData['proof_of_payment'])) {
                $auMatch = [
                    'user_id' => $payment->user_id,
                    'activity_id' => $payment->activity_id,
                ];
                if ($payment->activity_batch_id) {
                    $auMatch['activity_batch_id'] = $payment->activity_batch_id;
                } else {
                    $auMatch['activity_batch_id'] = null;
                }
                
                $auData = [
                    'status' => ActivityUser::STATUS_VERIFICATION,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];

                if ($payment->notes) {
                    $notes = json_decode($payment->notes, true);
                    if (is_array($notes) && isset($notes['custom_data'])) {
                        $auData['custom_data'] = $notes['custom_data'];
                    }
                }

                ActivityUser::updateOrCreate($auMatch, $auData);
            }
            
            // CASCADE UPDATE: Sync changes to all group members
            $activityUser = ActivityUser::where('activity_id', $payment->activity_id)
                ->where('user_id', $payment->user_id)
                ->orderBy('id', 'desc')
                ->first();

            $relatedUserIds = [];

            // 1. Explicit Group
            if ($activityUser && $activityUser->activity_participant_group_id) {
                $relatedUserIds = ActivityUser::where('activity_id', $payment->activity_id)
                    ->where('activity_participant_group_id', $activityUser->activity_participant_group_id)
                    ->pluck('user_id')
                    ->toArray();
            } else {
                // 2. Implicit Group
                $decoded = $this->decodeNotesToArray($payment->notes);
                if (is_array($decoded)) {
                    $uids = $decoded['user_ids'] ?? ($decoded['bulk_import']['user_ids'] ?? []);
                    if (is_array($uids) && !empty($uids)) {
                         if (in_array((string)$payment->user_id, array_map('strval', $uids))) {
                             $relatedUserIds = $uids;
                         }
                    }
                }
            }
            
            $otherUserIds = array_diff($relatedUserIds, [$payment->user_id]);

            if (!empty($otherUserIds)) {
                Log::info('Cascading payment details update to group members', [
                    'parent_payment_id' => $payment->id,
                    'group_type' => $activityUser && $activityUser->activity_participant_group_id ? 'explicit' : 'implicit',
                    'affected_users' => $otherUserIds
                ]);

                foreach ($otherUserIds as $uid) {
                    try {
                        $memberPayment = Payment::firstOrNew([
                            'user_id' => $uid,
                            'activity_id' => $payment->activity_id,
                            'activity_batch_id' => $payment->activity_batch_id
                        ]);

                        // Sync Amount
                        if (isset($updateData['amount'])) {
                            $memberPayment->amount = $updateData['amount'];
                        }

                        // Sync Payment Method
                        if (isset($updateData['payment_method_id'])) {
                            $memberPayment->payment_method_id = $updateData['payment_method_id'];
                        }

                        // Sync Sender Name
                        if (isset($updateData['sender_name'])) {
                            $memberPayment->sender_name = $updateData['sender_name'];
                        }
                        
                        // Sync Notes - FORCE OVERWRITE to ensure consistency
                        // "samakan isi format dan nilai untk semua angoota jadi satu prsis"
                        if (isset($updateData['notes'])) {
                             $memberPayment->notes = $updateData['notes'];
                        }

                        // Sync Proof File if updated
                        if (isset($updateData['proof_of_payment'])) {
                            $sourcePath = $updateData['proof_of_payment'];
                            $ext = pathinfo($sourcePath, PATHINFO_EXTENSION);
                            $uniqueName = 'payment_group_'.$payment->activity_id.'_'.$uid.'_'.uniqid().'.'.$ext;
                            $uniquePathRelative = 'payment-proofs/'.$uniqueName;
                            
                            if (Storage::disk('public')->exists($sourcePath)) {
                                Storage::disk('public')->copy($sourcePath, $uniquePathRelative);
                                
                                // Delete old proof
                                if ($memberPayment->exists && $memberPayment->proof_of_payment && $memberPayment->proof_of_payment !== 'imported') {
                                    if (Storage::disk('public')->exists($memberPayment->proof_of_payment)) {
                                        Storage::disk('public')->delete($memberPayment->proof_of_payment);
                                    }
                                }
                                
                                $memberPayment->proof_of_payment = $uniquePathRelative;
                            }
                        }

                        if (!$memberPayment->exists) {
                            // Set defaults for new payment
                            $memberPayment->status = 'pending';
                            $memberPayment->payment_method_id = $payment->payment_method_id;
                            if (!isset($memberPayment->amount)) $memberPayment->amount = $payment->amount;
                        }

                        $memberPayment->save();

                    } catch (\Exception $e) {
                        Log::error("Failed to cascade update to user $uid: " . $e->getMessage());
                    }
                }
            }

            DB::commit();

            if ($request->expectsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Data pembayaran berhasil disimpan',
                    'payment' => $payment->fresh(),
                    'proof_url' => isset($updateData['proof_of_payment']) ? asset('storage/' . $updateData['proof_of_payment']) : null
                ]);
            }

            return back()->with('success', 'Data pembayaran berhasil disimpan');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating payment: ' . $e->getMessage());
            
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menyimpan data: ' . $e->getMessage()
                ], 500);
            }
            return back()->with('error', 'Gagal menyimpan data');
        }
    }

    public function verify(Request $request, Payment $payment)
    {
        try {
            // Eager load activity untuk menghindari N+1 query
            $payment->load('activity');

            Log::info('Payment verification attempt', [
                'payment_id' => $payment->id,
                'user_id' => auth()->id(),
                'user_role' => auth()->user()->role,
                'request_data' => $request->all(),
                'activity_id' => $payment->activity_id,
                'activity_loaded' => $payment->relationLoaded('activity'),
                'activity_owner_id' => $payment->activity ? $payment->activity->user_id : null,
            ]);

            // Check if user has permission to verify payments using centralized method
            $canVerify = auth()->user()->canVerifyPayment($payment->activity);

            // Debug logging untuk creator dan panitia
            if (auth()->user()->isCreator() || ($payment->activity && $payment->activity->canManageRegistration(auth()->id()))) {
                Log::info('Creator/Committee payment verification check', [
                    'payment_id' => $payment->id,
                    'user_id' => auth()->id(),
                    'user_role' => auth()->user()->role,
                    'activity_id' => $payment->activity_id,
                    'activity_owner_id' => $payment->activity ? $payment->activity->user_id : null,
                    'is_activity_owner' => $payment->activity ? ($payment->activity->user_id == auth()->id()) : false,
                    'is_committee_member' => $payment->activity ? $payment->activity->canManageRegistration(auth()->id()) : false,
                    'has_verify_payment_own_activity' => auth()->user()->hasPermission('verify_payment_own_activity'),
                    'can_manage_registration' => $payment->activity ? $payment->activity->canManageRegistration(auth()->id()) : false,
                    'canVerify' => $canVerify,
                ]);
            }

            if (! $canVerify) {
                Log::warning('Unauthorized payment verification attempt', [
                    'payment_id' => $payment->id,
                    'user_id' => auth()->id(),
                    'user_role' => auth()->user()->role,
                    'activity_id' => $payment->activity_id,
                ]);
                if ($request->expectsJson()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Anda tidak memiliki akses untuk memverifikasi pembayaran ini',
                    ], 403);
                }

                return redirect()->back()->with('error', 'Anda tidak memiliki akses untuk memverifikasi pembayaran ini');
            }

            $validated = $request->validate([
                'status' => 'required|in:approved,rejected',
                'notes' => 'nullable|string|max:255',
                'amount' => 'nullable|numeric|min:0',
                'payment_method_id' => 'nullable|exists:payment_methods,id',
                'sender_name' => 'nullable|string|max:255',
            ]);

            Log::info('Payment validation passed', [
                'payment_id' => $payment->id,
                'validated_data' => $validated,
            ]);

            DB::beginTransaction();

            $newNotes = $payment->notes;
            if (array_key_exists('notes', $validated) && $validated['notes'] !== null && $validated['notes'] !== '') {
                $plainNote = trim($validated['notes']);
                $decodedExisting = null;
                if (is_string($payment->notes)) {
                    $decoded = json_decode($payment->notes, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                        $decodedExisting = $decoded;
                    }
                }

                if (is_array($decodedExisting)) {
                    $decodedExisting['verifier_note'] = $plainNote;
                    $newNotes = json_encode($decodedExisting);
                } else {
                    $newNotes = $plainNote;
                }
            }

            $updateData = [
                'status' => $validated['status'],
                'verified_by' => auth()->id(),
                'verified_at' => now(),
                'notes' => $newNotes,
            ];

            if (isset($validated['amount'])) {
                $updateData['amount'] = $validated['amount'];
            }
            if (isset($validated['payment_method_id'])) {
                $updateData['payment_method_id'] = $validated['payment_method_id'];
            }
            if (isset($validated['sender_name'])) {
                $updateData['sender_name'] = $validated['sender_name'];
            }

            $payment->update($updateData);

            Log::info('Payment record updated', [
                'payment_id' => $payment->id,
                'new_status' => $validated['status'],
            ]);

            // Common logic to identify group members and registration method
            $shouldActivateUploader = true;
            $meta = null;
            $relatedUserIds = [];
            $registrationMethod = 'mandiri';

            $activityUser = ActivityUser::where('activity_id', $payment->activity_id)
                ->where('user_id', $payment->user_id)
                ->orderBy('id', 'desc')
                ->first();

            // 1. Determine "kelompok" via ActivityParticipantGroup
            if ($activityUser && $activityUser->activity_participant_group_id) {
                $registrationMethod = 'kelompok';
                // Strictly filter by activity and group ID to ensure NO spillover to other groups
                $relatedUserIds = ActivityUser::where('activity_id', $payment->activity_id)
                    ->where('activity_participant_group_id', $activityUser->activity_participant_group_id)
                    ->pluck('user_id')
                    ->toArray();
                
                Log::info('Group members identified for cascading validation', [
                    'group_id' => $activityUser->activity_participant_group_id,
                    'count' => count($relatedUserIds),
                    'user_ids' => $relatedUserIds
                ]);
            }

            // 2. Fallback to implicit/bulk-import notes
            if ($registrationMethod === 'mandiri') {
                $decoded = $this->decodeNotesToArray($payment->notes);
                if (is_array($decoded) && (!empty($decoded['user_ids']) || !empty($decoded['bulk_import']['user_ids']))) {
                    // Start from THIS payment if it has the list
                    $uidsMeta = $decoded['user_ids'] ?? ($decoded['bulk_import']['user_ids'] ?? []);
                    if (!empty($uidsMeta)) {
                         $registrationMethod = 'kelompok';
                         $meta = $decoded;
                         $shouldActivateUploader = in_array($payment->user_id, $uidsMeta);
                         $relatedUserIds = $uidsMeta;
                    }
                } else {
                    // SEARCH FOR PARENT PAYMENT: If this payment doesn't have the list, maybe another payment (the parent) has THIS user in its list
                     try {
                        $parentPayment = Payment::where('activity_id', $payment->activity_id)
                            ->where('notes', 'like', '%user_ids%')
                            ->get()
                            ->first(function($p) use ($payment) {
                                $notes = json_decode($p->notes, true);
                                if (!is_array($notes)) return false;
                                
                                $uids = $notes['user_ids'] ?? ($notes['bulk_import']['user_ids'] ?? []);
                                if (is_array($uids)) {
                                    return in_array((string)$payment->user_id, array_map('strval', $uids));
                                }
                                return false;
                            });
                        
                        if ($parentPayment) {
                             $notes = json_decode($parentPayment->notes, true);
                             $groupUids = $notes['user_ids'] ?? ($notes['bulk_import']['user_ids'] ?? []);
                             if (!empty($groupUids)) {
                                 $registrationMethod = 'kelompok';
                                 $meta = $notes;
                                 $shouldActivateUploader = in_array($payment->user_id, $groupUids);
                                 $relatedUserIds = $groupUids;
                             }
                        }
                    } catch (\Exception $e) {
                        \Log::warning('Error searching parent payment in verify: ' . $e->getMessage());
                    }
                }
            }

            // Filter: Ensure all relatedUserIds actually exist in users table
            if (! empty($relatedUserIds)) {
                $validUsers = User::whereIn('id', $relatedUserIds)->pluck('id')->toArray();
                $relatedUserIds = $validUsers;
            }

            if ($validated['status'] == 'approved') {
                // Activate Uploader/Current User
                if ($shouldActivateUploader) {
                    $existingParticipant = ActivityUser::where('user_id', $payment->user_id)
                        ->where('activity_id', $payment->activity_id)
                        ->orderBy('id', 'desc')
                        ->first();

                    // Extract custom_data from payment notes
                    $customData = null;
                    if ($payment->notes) {
                        $notes = json_decode($payment->notes, true);
                        if (is_array($notes) && isset($notes['custom_data'])) {
                            $customData = $notes['custom_data'];
                        }
                    }

                    if ($existingParticipant) {
                        $existingParticipant->status = ActivityUser::STATUS_ACTIVE;
                        if ($customData) {
                            // Merge with existing custom_data if any
                            $existingCustom = $existingParticipant->custom_data ?? [];
                            if (is_string($existingCustom)) {
                                $decoded = json_decode($existingCustom, true);
                                $existingCustom = is_array($decoded) ? $decoded : [];
                            }
                            $existingParticipant->custom_data = array_merge($existingCustom, $customData);
                        }
                        $existingParticipant->updated_at = now();
                        $existingParticipant->save();
                    } else {
                        $matchAttributes = [
                            'user_id' => $payment->user_id,
                            'activity_id' => $payment->activity_id,
                        ];
                        if ($payment->activity_batch_id) {
                            $matchAttributes['activity_batch_id'] = $payment->activity_batch_id;
                        } else {
                            $matchAttributes['activity_batch_id'] = null;
                        }

                        $createData = array_merge($matchAttributes, [
                            'status' => ActivityUser::STATUS_ACTIVE,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);

                        if ($customData) {
                            $createData['custom_data'] = $customData;
                        }

                        ActivityUser::create($createData);
                    }
                }

                // Process Related Members (Auto-Approve Payments & Activate Enrollment)
                if (! empty($relatedUserIds)) {
                    $uids = $relatedUserIds;
                    
                    // Update Payments for related users
                    // STRICTLY LIMIT to this activity and these specific user IDs
                    $otherUserIds = array_diff($uids, [$payment->user_id]);
                    if (! empty($otherUserIds)) {
                        $paymentsToUpdate = Payment::whereIn('user_id', $otherUserIds)
                            ->where('activity_id', $payment->activity_id)
                            ->where('status', 'pending')
                            ->get();

                        foreach ($paymentsToUpdate as $pToUpdate) {
                            $pNote = $pToUpdate->notes;
                            $suffix = " | Auto-approved via group member #{$payment->id}";
                            
                            // Safe merge
                            $pDecoded = null;
                            if (is_string($pNote)) {
                                $d = json_decode($pNote, true);
                                if (json_last_error() === JSON_ERROR_NONE && is_array($d)) {
                                    $pDecoded = $d;
                                }
                            }

                            if ($pDecoded) {
                                $currentV = $pDecoded['verifier_note'] ?? '';
                                $pDecoded['verifier_note'] = $currentV . $suffix;
                                $pNote = json_encode($pDecoded);
                            } else {
                                $pNote = ((string)$pNote) . $suffix;
                            }

                            $pUpdateData = [
                                'status' => 'approved',
                                'verified_by' => auth()->id(),
                                'verified_at' => now(),
                                'notes' => $pNote,
                                // Sync key fields from Parent to ensure consistency
                                'payment_method_id' => $payment->payment_method_id,
                                'sender_name' => $payment->sender_name,
                            ];
                            if (isset($validated['amount'])) {
                                $pUpdateData['amount'] = $validated['amount'];
                            } else {
                                $pUpdateData['amount'] = $payment->amount;
                            }
                            
                            $pToUpdate->update($pUpdateData);
                        }

                        Log::info('Auto-approved related group payments', [
                            'parent_payment_id' => $payment->id,
                            'related_user_ids' => $otherUserIds,
                        ]);
                    }

                    // Activate Enrollment for all related users
                    $limit = (is_array($meta) ? (int) ($meta['allowed_count'] ?? count($uids)) : count($uids));
                    $count = 0;
                    foreach ($uids as $uid) {
                        if ($uid == $payment->user_id) {
                            continue;
                        } // Already done above

                        if ($count >= $limit) {
                            break;
                        }
                        $existingMember = ActivityUser::where('user_id', (int) $uid)
                            ->where('activity_id', $payment->activity_id)
                            ->orderBy('id', 'desc')
                            ->first();

                        if ($existingMember) {
                            $existingMember->status = ActivityUser::STATUS_ACTIVE;
                            $existingMember->updated_at = now();
                            $existingMember->save();
                        } else {
                            $bulkMatch = [
                                'user_id' => (int) $uid,
                                'activity_id' => $payment->activity_id,
                            ];
                            if ($payment->activity_batch_id) {
                                $bulkMatch['activity_batch_id'] = $payment->activity_batch_id;
                            } else {
                                $bulkMatch['activity_batch_id'] = null;
                            }

                            ActivityUser::create(array_merge($bulkMatch, [
                                'status' => ActivityUser::STATUS_ACTIVE,
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]));
                        }
                        $count++;
                    }
                }
                Log::info('ActivityUser status updated to 1 (approved)', [
                    'user_id' => $payment->user_id,
                    'activity_id' => $payment->activity_id,
                    'activity_batch_id' => $payment->activity_batch_id,
                ]);

                try {
                    // Antrikan email bukti pembayaran/invoice ke user
                    SendPaymentReceiptMail::dispatch($payment->fresh());
                    Log::info('Queued payment receipt email dispatched (manual approval)', [
                        'payment_id' => $payment->id,
                        'email' => $payment->user->email,
                    ]);
                } catch (\Throwable $e) {
                    Log::error('Failed to dispatch payment receipt email job (manual approval)', [
                        'payment_id' => $payment->id,
                        'error' => $e->getMessage(),
                    ]);
                }

                // Kirim notifikasi WhatsApp jika dikonfigurasi
                try {
                    $user = $payment->user;
                    $phone = null;
                    if ($user && $user->profile && ! empty($user->profile->no_hp)) {
                        $digits = preg_replace('/[^0-9+]/', '', $user->profile->no_hp);
                        if (! empty($digits) && $digits[0] === '0') {
                            $phone = '+62'.substr($digits, 1);
                        } elseif (! empty($digits)) {
                            $phone = str_starts_with($digits, '+') ? $digits : ('+'.ltrim($digits, '+'));
                        }
                    }
                    SendPaymentApprovedWhatsapp::dispatch($payment->fresh(), $phone);
                    Log::info('Queued WhatsApp notification dispatched (manual approval)', [
                        'payment_id' => $payment->id,
                        'phone' => $phone,
                    ]);
                } catch (\Throwable $e) {
                    \Log::error('Failed to dispatch WhatsApp job (manual approval)', [
                        'payment_id' => $payment->id,
                        'error' => $e->getMessage(),
                    ]);
                }
            } elseif ($validated['status'] == 'rejected') {
                $usersToReject = [$payment->user_id];
                if (! empty($relatedUserIds)) {
                    $usersToReject = array_unique(array_merge($usersToReject, $relatedUserIds));
                }

                $rejectQuery = ActivityUser::whereIn('user_id', $usersToReject)
                    ->where('activity_id', $payment->activity_id);

                if ($payment->activity_batch_id) {
                    $rejectQuery->where('activity_batch_id', $payment->activity_batch_id);
                } else {
                    $rejectQuery->whereNull('activity_batch_id');
                }

                $rejectQuery->update(['status' => ActivityUser::STATUS_REJECTED]); // Ditolak
                Log::info('ActivityUser status updated to 2 (rejected) for group', [
                    'user_ids' => $usersToReject,
                    'activity_id' => $payment->activity_id,
                    'activity_batch_id' => $payment->activity_batch_id,
                ]);

                // Update Payments for related users (Reject them too)
                $otherUserIds = array_diff($usersToReject, [$payment->user_id]);
                if (! empty($otherUserIds)) {
                    $paymentsToReject = Payment::whereIn('user_id', $otherUserIds)
                        ->where('activity_id', $payment->activity_id)
                        ->whereIn('status', ['pending', 'approved'])
                        ->get();

                    foreach ($paymentsToReject as $pToReject) {
                        $pNote = $pToReject->notes;
                        $suffix = " | Auto-rejected via group member #{$payment->id}";

                        // Safe merge
                        $pDecoded = null;
                        if (is_string($pNote)) {
                            $d = json_decode($pNote, true);
                            if (json_last_error() === JSON_ERROR_NONE && is_array($d)) {
                                $pDecoded = $d;
                            }
                        }

                        if ($pDecoded) {
                            $currentV = $pDecoded['verifier_note'] ?? '';
                            $pDecoded['verifier_note'] = $currentV . $suffix;
                            $pNote = json_encode($pDecoded);
                        } else {
                            $pNote = ((string)$pNote) . $suffix;
                        }

                        $pRejectData = [
                            'status' => 'rejected',
                            'verified_by' => auth()->id(),
                            'verified_at' => now(),
                            'notes' => $pNote,
                            // Sync key fields from Parent
                            'payment_method_id' => $payment->payment_method_id,
                            'sender_name' => $payment->sender_name,
                        ];
                        if (isset($validated['amount'])) {
                            $pRejectData['amount'] = $validated['amount'];
                        } else {
                            $pRejectData['amount'] = $payment->amount;
                        }

                        $pToReject->update($pRejectData);
                    }

                    Log::info('Auto-rejected related group payments', [
                        'parent_payment_id' => $payment->id,
                        'related_user_ids' => $otherUserIds,
                    ]);
                }
            }

            DB::commit();
            Log::info('Payment verification transaction committed', ['payment_id' => $payment->id]);

            // Jika request AJAX/JSON, kembalikan respons ringan tanpa redirect
            if ($request->expectsJson()) {
                $payment->refresh();

                return response()->json([
                    'success' => true,
                    'message' => 'Status pembayaran berhasil diperbarui',
                    'payment' => [
                        'id' => $payment->id,
                        'status' => $payment->status,
                        'verified_at' => optional($payment->verified_at)->format('Y-m-d H:i:s'),
                        'verified_by' => $payment->verified_by,
                    ],
                ]);
            }

            return back()->with('success', 'Status pembayaran berhasil diperbarui');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error verifying payment: '.$e->getMessage(), [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'request_data' => $request->all(),
            ]);
            if ($request->expectsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Terjadi kesalahan saat memperbarui status pembayaran',
                ], 500);
            }

            return back()->with('error', 'Terjadi kesalahan saat memperbarui status pembayaran');
        }
    }

    /**
     * Manage all payments (Admin, Superadmin, Creator, and Committee members)
     */
    public function manage(Request $request)
    {
        try {
            // Allow access to admin/superadmin OR creator/committee/division leader
            // Loosened: creators are allowed even if permission seeding is missing, but data is still filtered below
            if (! auth()->user()->hasPermission('view_payments')) {
                $user = auth()->user();
                $hasOwnViewPermission = $user->hasPermission('view_payments_own_activity') || $user->isCreator();
                if (! $hasOwnViewPermission) {
                    abort(403, 'Anda tidak memiliki akses ke halaman manajemen pembayaran');
                }

                // Check if user relates to any activity (owner, committee, division leader)
                $canAccessPage = Activity::where('user_id', $user->id)
                    ->orWhereHas('committeeStructures', function ($query) use ($user) {
                        $query->where('user_id', $user->id);
                    })
                    ->exists();

                // Also check division leaders
                if (! $canAccessPage) {
                    $userProfile = $user->profile;
                    $canAccessPage = Activity::whereHas('divisions', function ($query) use ($user, $userProfile) {
                        $query->where('leader_name', $user->name);
                        if ($userProfile && $userProfile->no_hp) {
                            $query->orWhere('leader_phone', $userProfile->no_hp);
                        }
                    })->exists();
                }

                if (! $canAccessPage && ! $user->isCreator()) {
                    abort(403, 'Anda tidak memiliki akses ke halaman manajemen pembayaran');
                }
            }

            $query = Payment::with(['user:id,name,email', 'activity:id,name,user_id', 'paymentMethod:id,name', 'verifier:id,name'])
                ->select(['id', 'user_id', 'activity_id', 'payment_method_id', 'amount', 'status', 'notes', 'midtrans_transaction_id', 'verified_by', 'verified_at', 'created_at']);

            // Jika bukan admin/superadmin, batasi hanya pembayaran dari kegiatan miliknya/diampunya
            $currentUser = auth()->user();
            if (
                ! $currentUser->hasPermission('view_payments') &&
                ($currentUser->hasPermission('view_payments_own_activity') || $currentUser->isCreator())
            ) {
                $userProfile = $currentUser->profile;
                $query->whereHas('activity', function ($aq) use ($currentUser, $userProfile) {
                    $aq->where('user_id', $currentUser->id)
                        ->orWhereHas('committeeStructures', function ($cq) use ($currentUser) {
                            $cq->where('user_id', $currentUser->id);
                        })
                        ->orWhereHas('divisions', function ($dq) use ($currentUser, $userProfile) {
                            $dq->where('leader_name', $currentUser->name);
                            if ($userProfile && $userProfile->no_hp) {
                                $dq->orWhere('leader_phone', $userProfile->no_hp);
                            }
                        });
                });
            }

            // Filter by status (normalize input)
            if ($request->has('status') && $request->status !== '') {
                $status = strtolower(trim((string) $request->status));
                $allowedStatuses = ['pending', 'approved', 'rejected'];
                if (in_array($status, $allowedStatuses, true)) {
                    $query->where('status', $status);
                }
            }

            // Filter by payment method type (Midtrans vs Manual)
            if ($request->has('payment_type') && $request->payment_type !== '') {
                if ($request->payment_type === 'midtrans') {
                    $query->whereNotNull('midtrans_transaction_id');
                } elseif ($request->payment_type === 'manual') {
                    $query->whereNull('midtrans_transaction_id')->whereNotNull('payment_method_id');
                }
            }

            // Search by activity name or user name/email
            // Group conditions to avoid overriding other filters with OR precedence
            if ($request->has('search') && $request->search !== '') {
                $search = trim((string) $request->search);
                $query->where(function ($qq) use ($search) {
                    $qq->whereHas('activity', function ($q) use ($search) {
                        $q->where('name', 'like', '%'.$search.'%');
                    })->orWhereHas('user', function ($q) use ($search) {
                        $q->where('name', 'like', '%'.$search.'%')
                            ->orWhere('email', 'like', '%'.$search.'%');
                    });
                });
            }

            // Sort
            $sortBy = $request->get('sort_by', 'created_at');
            $sortOrder = strtolower($request->get('sort_order', 'desc')) === 'asc' ? 'asc' : 'desc';
            $allowedSorts = ['created_at', 'amount', 'status'];
            if (! in_array($sortBy, $allowedSorts, true)) {
                $sortBy = 'created_at';
            }
            $query->orderBy($sortBy, $sortOrder);

            // Paginate
            $payments = $query->paginate(20)->withQueryString();

            // Statistik sesuai batasan akses
            $statsBase = Payment::query();
            if (
                ! $currentUser->hasPermission('view_payments') &&
                ($currentUser->hasPermission('view_payments_own_activity') || $currentUser->isCreator())
            ) {
                $userProfile = $currentUser->profile;
                $statsBase->whereHas('activity', function ($aq) use ($currentUser, $userProfile) {
                    $aq->where('user_id', $currentUser->id)
                        ->orWhereHas('committeeStructures', function ($cq) use ($currentUser) {
                            $cq->where('user_id', $currentUser->id);
                        })
                        ->orWhereHas('divisions', function ($dq) use ($currentUser, $userProfile) {
                            $dq->where('leader_name', $currentUser->name);
                            if ($userProfile && $userProfile->no_hp) {
                                $dq->orWhere('leader_phone', $userProfile->no_hp);
                            }
                        });
                });
            }

            // Hitung metrik dasar
            $stats = [
                'total' => (clone $statsBase)->count(),
                'pending' => (clone $statsBase)->where('status', 'pending')->count(),
                'approved' => (clone $statsBase)->where('status', 'approved')->count(),
                'rejected' => (clone $statsBase)->where('status', 'rejected')->count(),
                'midtrans' => (clone $statsBase)->whereNotNull('midtrans_transaction_id')->count(),
                'manual' => (clone $statsBase)->whereNull('midtrans_transaction_id')->whereNotNull('payment_method_id')->count(),
            ];

            // Terapkan aturan potongan biaya admin untuk Creator (saldo = netto)
            $settings = FinancialSetting::current();
            $isRestrictedView = (
                ! $currentUser->hasPermission('view_payments') &&
                ($currentUser->hasPermission('view_payments_own_activity') || $currentUser->isCreator())
            ) || $currentUser->isCreator();

            if ($isRestrictedView) {
                // Ambil pembayaran yang sudah disetujui dan hitung netto per transaksi
                $approvedPayments = (clone $statsBase)
                    ->where('status', 'approved')
                    ->get(['amount', 'midtrans_transaction_id']);

                $totalNetIncome = $approvedPayments->sum(function ($p) use ($settings) {
                    $amount = (float) $p->amount;
                    $isAutomatic = ! empty($p->midtrans_transaction_id);

                    return $isAutomatic
                        ? $settings->computeNetAutomatic($amount)
                        : $settings->computeNet($amount);
                });

                // Kurangi dengan penarikan yang sudah dibayar oleh user ini
                $paidWithdrawalsSum = WithdrawalRequest::where('status', 'paid')
                    ->where('user_id', $currentUser->id)
                    ->sum('amount');

                // Pisahkan total pendapatan dan saldo (netto - penarikan dibayar)
                $stats['income_amount'] = (float) $totalNetIncome;
                $stats['balance_amount'] = max(0, $totalNetIncome - (float) $paidWithdrawalsSum);
                // Backward compatibility
                $stats['total_amount'] = $stats['balance_amount'];
            } else {
                // Admin/Superadmin melihat total bruto, saldo = bruto - penarikan dibayar
                $grossIncome = (clone $statsBase)->where('status', 'approved')->sum('amount');
                $paidWithdrawalsSum = WithdrawalRequest::where('status', 'paid')
                    ->where('user_id', $currentUser->id)
                    ->sum('amount');

                $stats['income_amount'] = (float) $grossIncome;
                $stats['balance_amount'] = max(0, (float) $grossIncome - (float) $paidWithdrawalsSum);
                // Backward compatibility
                $stats['total_amount'] = $stats['balance_amount'];
            }

            // Load saved bank account for current user (from storage file)
            $bankAccount = $this->getSavedBankAccount(auth()->id());

            return Inertia::render('Payments/Manage', [
                'payments' => $payments,
                'stats' => $stats,
                'bankAccount' => $bankAccount,
            ]);
        } catch (\Exception $e) {
            Log::error('Error in payment manage: '.$e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->back()->with('error', 'Terjadi kesalahan saat memuat halaman manajemen pembayaran');
        }
    }

    /**
     * Handle withdrawal request submission from payments manage page
     */
    public function withdrawRequest(Request $request)
    {
        try {
            $user = auth()->user();
            if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin() || $user->isCreator())) {
                abort(403, 'Anda tidak memiliki akses untuk mengajukan penarikan');
            }

            $validated = $request->validate([
                'amount' => 'required|numeric|min:1000',
                'notes' => 'nullable|string|max:255',
                // Optional bank account info from modal
                'bank_name' => 'nullable|string|max:100',
                'account_name' => 'nullable|string|max:150',
                'account_number' => 'nullable|string|max:50',
            ]);

            // Compose notes to include bank account info (no migration needed)
            $notes = $validated['notes'] ?? null;
            $bankParts = [];
            if (! empty($validated['bank_name'])) {
                $bankParts[] = $validated['bank_name'];
            }
            if (! empty($validated['account_name'])) {
                $bankParts[] = $validated['account_name'];
            }
            if (! empty($validated['account_number'])) {
                $bankParts[] = $validated['account_number'];
            }
            if (! empty($bankParts)) {
                $bankSummary = 'Rekening: '.implode(' • ', $bankParts);
                $notes = trim(($notes ? $notes.' | ' : '').$bankSummary);
            }

            // Simpan permintaan penarikan ke database
            $withdrawal = WithdrawalRequest::create([
                'user_id' => $user->id,
                'amount' => (int) $validated['amount'],
                'notes' => $notes,
                // Status awal pengajuan diubah ke 'proses' sesuai kebutuhan
                'status' => 'proses',
            ]);

            \Log::info('Withdrawal request submitted', [
                'withdrawal_id' => $withdrawal->id,
                'user_id' => $user->id,
                'amount' => $withdrawal->amount,
                'notes' => $withdrawal->notes,
                'bank_name' => $validated['bank_name'] ?? null,
                'account_name' => $validated['account_name'] ?? null,
                'account_number' => $validated['account_number'] ?? null,
            ]);

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Permintaan penarikan dana telah dikirim.',
                    'withdrawal' => [
                        'id' => $withdrawal->id,
                        'created_at' => $withdrawal->created_at->format('d/m/Y H:i'),
                        'amount' => $withdrawal->amount,
                        'formatted_amount' => number_format($withdrawal->amount, 0, ',', '.'),
                        'status' => ucfirst($withdrawal->status),
                        'notes' => $withdrawal->notes,
                        'user_name' => $user->name,
                    ],
                ]);
            }

            return redirect()->route('payments.withdraw.history')
                ->with('success', 'Permintaan penarikan dana telah dikirim.');
        } catch (\Exception $e) {
            \Log::error('Error submitting withdrawal request: '.$e->getMessage());

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Terjadi kesalahan saat mengirim permintaan penarikan dana.',
                ], 500);
            }

            return redirect()->route('payments.manage')
                ->with('error', 'Terjadi kesalahan saat mengirim permintaan penarikan dana.');
        }
    }

    /**
     * Save user's withdrawal bank account in storage (JSON file).
     */
    public function saveBankAccount(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin() || $user->isCreator())) {
            abort(403, 'Anda tidak memiliki akses menyimpan rekening penarikan');
        }

        $validated = $request->validate([
            'bank_name' => 'required|string|max:100',
            'account_name' => 'required|string|max:150',
            'account_number' => 'required|string|max:50',
            'target_user_id' => 'nullable|string|exists:users,id',
        ]);

        // Catatan: nama rekening tidak lagi dipaksa sama dengan nama user.
        // Informasi ini hanya menjadi peringatan visual bagi admin saat memproses transfer.

        try {
            $targetUserId = $user->id;
            if (($user->isAdmin() || $user->isSuperAdmin()) && $request->filled('target_user_id')) {
                $targetUserId = (int) $validated['target_user_id'];
            }
            $newAccount = [
                'bank_name' => $validated['bank_name'],
                'account_name' => $validated['account_name'],
                'account_number' => $validated['account_number'],
            ];
            $dir = 'withdrawal_bank_accounts';
            if (! Storage::disk('local')->exists($dir)) {
                Storage::disk('local')->makeDirectory($dir);
            }
            $path = $dir.'/'.$targetUserId.'.json';
            $existingRaw = Storage::disk('local')->exists($path) ? Storage::disk('local')->get($path) : null;
            $existingData = null;
            if ($existingRaw) {
                $existingData = json_decode($existingRaw, true);
            }
            // Normalize existing data to array of accounts
            $accounts = [];
            if (is_array($existingData)) {
                if (isset($existingData['accounts']) && is_array($existingData['accounts'])) {
                    $accounts = $existingData['accounts'];
                } elseif (isset($existingData['bank_name'], $existingData['account_name'], $existingData['account_number'])) {
                    // Legacy single-account format
                    $accounts = [[
                        'bank_name' => $existingData['bank_name'],
                        'account_name' => $existingData['account_name'],
                        'account_number' => $existingData['account_number'],
                    ]];
                }
            }
            // Prevent duplicate based on bank_name + account_number
            $isDuplicate = false;
            foreach ($accounts as $acc) {
                if (strcasecmp($acc['bank_name'], $newAccount['bank_name']) === 0 && $acc['account_number'] === $newAccount['account_number']) {
                    $isDuplicate = true;
                    break;
                }
            }
            if (! $isDuplicate) {
                $accounts[] = $newAccount;
            }
            $final = [
                'user_id' => $user->id,
                'accounts' => $accounts,
                'updated_at' => now()->toIso8601String(),
            ];
            Storage::disk('local')->put($path, json_encode($final));

            return redirect()->back()->with('success', 'Rekening berhasil disimpan.');
        } catch (\Exception $e) {
            Log::error('Failed saving bank account: '.$e->getMessage());

            return redirect()->back()->with('error', 'Gagal menyimpan rekening. Silakan coba lagi.');
        }
    }

    /**
     * Update a saved withdrawal bank account for current user.
     */
    public function updateBankAccount(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin() || $user->isCreator())) {
            abort(403, 'Anda tidak memiliki akses mengubah rekening penarikan');
        }

        $validated = $request->validate([
            'old_bank_name' => 'required|string|max:100',
            'old_account_number' => 'required|string|max:50',
            'bank_name' => 'required|string|max:100',
            'account_name' => 'required|string|max:150',
            'account_number' => 'required|string|max:50',
            'target_user_id' => 'nullable|string|exists:users,id',
        ]);

        try {
            $targetUserId = $user->id;
            if (($user->isAdmin() || $user->isSuperAdmin()) && $request->filled('target_user_id')) {
                $targetUserId = (int) $validated['target_user_id'];
            }
            $path = 'withdrawal_bank_accounts/'.$targetUserId.'.json';
            if (! Storage::disk('local')->exists($path)) {
                return redirect()->back()->with('error', 'Tidak ada rekening tersimpan.');
            }
            $raw = Storage::disk('local')->get($path);
            $data = json_decode($raw, true) ?: [];
            $accounts = [];
            if (isset($data['accounts']) && is_array($data['accounts'])) {
                $accounts = $data['accounts'];
            } elseif (isset($data['bank_name'], $data['account_name'], $data['account_number'])) {
                $accounts = [[
                    'bank_name' => $data['bank_name'],
                    'account_name' => $data['account_name'],
                    'account_number' => $data['account_number'],
                ]];
            }

            $updated = false;
            foreach ($accounts as &$acc) {
                if (strcasecmp($acc['bank_name'], $validated['old_bank_name']) === 0 && $acc['account_number'] === $validated['old_account_number']) {
                    $acc = [
                        'bank_name' => $validated['bank_name'],
                        'account_name' => $validated['account_name'],
                        'account_number' => $validated['account_number'],
                    ];
                    $updated = true;
                    break;
                }
            }

            if (! $updated) {
                return redirect()->back()->with('error', 'Rekening tidak ditemukan untuk diubah.');
            }

            $final = [
                'user_id' => $user->id,
                'accounts' => $accounts,
                'updated_at' => now()->toIso8601String(),
            ];
            Storage::disk('local')->put($path, json_encode($final));

            return redirect()->back()->with('success', 'Rekening berhasil diubah.');
        } catch (\Exception $e) {
            Log::error('Failed updating bank account: '.$e->getMessage());

            return redirect()->back()->with('error', 'Gagal mengubah rekening. Silakan coba lagi.');
        }
    }

    /**
     * Delete a saved withdrawal bank account for current user.
     */
    public function deleteBankAccount(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin() || $user->isCreator())) {
            abort(403, 'Anda tidak memiliki akses menghapus rekening penarikan');
        }

        $validated = $request->validate([
            'bank_name' => 'required|string|max:100',
            'account_number' => 'required|string|max:50',
            'target_user_id' => 'nullable|string|exists:users,id',
        ]);

        try {
            $targetUserId = $user->id;
            if (($user->isAdmin() || $user->isSuperAdmin()) && $request->filled('target_user_id')) {
                $targetUserId = (int) $validated['target_user_id'];
            }
            $path = 'withdrawal_bank_accounts/'.$targetUserId.'.json';
            if (! Storage::disk('local')->exists($path)) {
                return redirect()->back()->with('error', 'Tidak ada rekening tersimpan.');
            }
            $raw = Storage::disk('local')->get($path);
            $data = json_decode($raw, true) ?: [];
            $accounts = [];
            if (isset($data['accounts']) && is_array($data['accounts'])) {
                $accounts = $data['accounts'];
            } elseif (isset($data['bank_name'], $data['account_name'], $data['account_number'])) {
                $accounts = [[
                    'bank_name' => $data['bank_name'],
                    'account_name' => $data['account_name'],
                    'account_number' => $data['account_number'],
                ]];
            }

            $newAccounts = array_values(array_filter($accounts, function ($acc) use ($validated) {
                return ! (strcasecmp($acc['bank_name'], $validated['bank_name']) === 0 && $acc['account_number'] === $validated['account_number']);
            }));

            if (count($newAccounts) === count($accounts)) {
                return redirect()->back()->with('error', 'Rekening tidak ditemukan untuk dihapus.');
            }

            $final = [
                'user_id' => $user->id,
                'accounts' => $newAccounts,
                'updated_at' => now()->toIso8601String(),
            ];
            Storage::disk('local')->put($path, json_encode($final));

            return redirect()->back()->with('success', 'Rekening berhasil dihapus.');
        } catch (\Exception $e) {
            Log::error('Failed deleting bank account: '.$e->getMessage());

            return redirect()->back()->with('error', 'Gagal menghapus rekening. Silakan coba lagi.');
        }
    }

    /**
     * Read saved bank account JSON for given user id.
     */
    protected function getSavedBankAccount(string|int|null $userId): ?array
    {
        // Backward-compatible: return the first account (if multiple)
        if (! $userId) {
            return null;
        }
        $path = 'withdrawal_bank_accounts/'.$userId.'.json';
        if (! Storage::disk('local')->exists($path)) {
            return null;
        }
        $raw = Storage::disk('local')->get($path);
        try {
            $data = json_decode($raw, true);
            if (is_array($data)) {
                if (isset($data['accounts']) && is_array($data['accounts']) && count($data['accounts']) > 0) {
                    return $data['accounts'][0];
                }
                if (isset($data['bank_name'], $data['account_name'], $data['account_number'])) {
                    return $data;
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Invalid bank account JSON for user '.$userId);
        }

        return null;
    }

    protected function getSavedBankAccounts(string|int|null $userId): array
    {
        if (! $userId) {
            return [];
        }
        $path = 'withdrawal_bank_accounts/'.$userId.'.json';
        if (! Storage::disk('local')->exists($path)) {
            return [];
        }
        $raw = Storage::disk('local')->get($path);
        try {
            $data = json_decode($raw, true);
            if (is_array($data)) {
                if (isset($data['accounts']) && is_array($data['accounts'])) {
                    return $data['accounts'];
                }
                if (isset($data['bank_name'], $data['account_name'], $data['account_number'])) {
                    return [[
                        'bank_name' => $data['bank_name'],
                        'account_name' => $data['account_name'],
                        'account_number' => $data['account_number'],
                    ]];
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Invalid bank account JSON for user '.$userId);
        }

        return [];
    }

    /**
     * Tampilkan riwayat penarikan saldo
     */
    public function withdrawHistory(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin() || $user->isCreator())) {
            abort(403, 'Anda tidak memiliki akses ke riwayat penarikan');
        }

        $query = WithdrawalRequest::with(['user', 'verifier'])->orderBy('created_at', 'desc');

        // Creator hanya melihat permintaan miliknya (kecuali jika admin/superadmin)
        if ($user->isCreator() && ! $user->isAdmin() && ! $user->isSuperAdmin()) {
            $query->where('user_id', $user->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $withdrawals = $query->paginate(20)->withQueryString();

        // Hitung saldo berdasarkan pembayaran yang disetujui, mengikuti batasan akses seperti di manage
        $statsBase = Payment::query();
        if ($user->isCreator()) {
            $userProfile = $user->profile;
            $statsBase->whereHas('activity', function ($aq) use ($user, $userProfile) {
                $aq->where('user_id', $user->id)
                    ->orWhereHas('committeeStructures', function ($cq) use ($user) {
                        $cq->where('user_id', $user->id);
                    })
                    ->orWhereHas('divisions', function ($dq) use ($user, $userProfile) {
                        $dq->where('leader_name', $user->name);
                        if ($userProfile && $userProfile->no_hp) {
                            $dq->orWhere('leader_phone', $userProfile->no_hp);
                        }
                    });
            });
        }

        $settings = FinancialSetting::current();
        if ($user->isCreator()) {
            // Ambil kolom yang diperlukan untuk membedakan transaksi otomatis vs manual
            $approvedPayments = (clone $statsBase)
                ->where('status', 'approved')
                ->get(['amount', 'midtrans_transaction_id', 'activity_id']);
            $totalNetIncome = $approvedPayments->sum(function ($p) use ($settings) {
                $amount = (float) $p->amount;
                $isAutomatic = ! empty($p->midtrans_transaction_id);

                return $isAutomatic
                    ? $settings->computeNetAutomaticForActivity($amount, (int) $p->activity_id)
                    : $settings->computeNet($amount);
            });

            // Kurangi dengan total penarikan yang sudah dibayar (expense)
            $paidWithdrawalsSum = WithdrawalRequest::where('status', 'paid')
                ->where('user_id', $user->id)
                ->sum('amount');

            $stats = [
                'total_amount' => max(0, $totalNetIncome - (float) $paidWithdrawalsSum),
            ];
        } else {
            // Admin melihat saldo pribadinya (jika ada pengajuan penarikan atas nama admin)
            $grossIncome = (clone $statsBase)->where('status', 'approved')->sum('amount');
            $paidWithdrawalsSum = WithdrawalRequest::where('status', 'paid')
                ->where('user_id', $user->id)
                ->sum('amount');
            $stats = [
                'total_amount' => max(0, (float) $grossIncome - (float) $paidWithdrawalsSum),
            ];
        }

        $bankAccount = $this->getSavedBankAccount(auth()->id());

        return Inertia::render('Payments/WithdrawHistory', [
            'withdrawals' => $withdrawals,
            'stats' => $stats,
            'bankAccount' => $bankAccount,
        ]);
    }

    /**
     * Detail riwayat penarikan saldo
     */
    public function withdrawShow(WithdrawalRequest $withdrawal)
    {
        $user = auth()->user();

        // Jika belum login, arahkan ke login
        if (! $user) {
            return redirect()->route('login')
                ->with('error', 'Silakan login untuk melihat detail penarikan.');
        }

        // Izinkan admin/superadmin, creator, atau pemilik pengajuan melihat detail
        if (! ($user->isAdmin() || $user->isSuperAdmin() || $user->isCreator() || $user->id === $withdrawal->user_id)) {
            return redirect()->route('payments.withdraw.history')
                ->with('error', 'Anda tidak memiliki akses ke detail penarikan ini');
        }

        $withdrawal->load(['user', 'verifier']);

        return Inertia::render('Payments/WithdrawShow', [
            'withdrawal' => $withdrawal,
        ]);
    }

    /**
     * Mark withdrawal request as paid with transfer proof (Admin/Superadmin only)
     */
    public function withdrawMarkPaid(WithdrawalRequest $withdrawal, Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin())) {
            abort(403, 'Anda tidak memiliki akses untuk menyelesaikan pembayaran penarikan');
        }

        try {
            // Validate optional transfer proof
            $validated = $request->validate([
                'proof' => 'nullable|mimes:jpeg,png,jpg,gif,pdf|max:51200',
            ]);

            $proofPath = null;
            if ($request->hasFile('proof')) {
                $file = $request->file('proof');
                $filename = time().'_'.preg_replace('/[^A-Za-z0-9_\-.]/', '_', $file->getClientOriginalName());
                $storagePath = 'withdrawals/proofs/'.$withdrawal->id.'/'.$filename;
                
                // Cek jika ukuran file > 20MB (20 * 1024 * 1024 bytes) dan tipe gambar
                if ($file->getSize() > 20 * 1024 * 1024 && str_starts_with($file->getMimeType(), 'image/')) {
                    try {
                        // Gunakan Intervention Image untuk resize/kompresi
                        $manager = new ImageManager(new Driver());
                        $image = $manager->read($file);
                        
                        // Resize gambar agar tidak terlalu besar (max width 2500px), aspect ratio terjaga
                        $image->scaleDown(width: 2500);
                        
                        // Simpan sementara untuk diupload ke storage
                        $tempPath = sys_get_temp_dir() . '/' . $filename;
                        $image->save($tempPath, quality: 80);
                        
                        // Simpan ke storage (public disk)
                        Storage::disk('public')->putFileAs('withdrawals/proofs/'.$withdrawal->id, new \Illuminate\Http\File($tempPath), $filename);
                        
                        // Hapus file temp
                        @unlink($tempPath);
                    } catch (\Exception $e) {
                        Log::warning('Gagal resize gambar bukti transfer: '.$e->getMessage());
                        // Fallback: simpan file asli jika gagal resize
                        Storage::disk('public')->putFileAs('withdrawals/proofs/'.$withdrawal->id, $file, $filename);
                    }
                } else {
                    Storage::disk('public')->putFileAs('withdrawals/proofs/'.$withdrawal->id, $file, $filename);
                }
                
                $proofPath = $storagePath;
            }

            DB::beginTransaction();
            // Update withdrawal status and verifier info
            $withdrawal->status = 'paid';
            $withdrawal->verified_by = $user->id;
            $withdrawal->verified_at = now();
            // Simpan path bukti di notes agar tidak perlu migrasi kolom baru
            if ($proofPath) {
                $notes = is_string($withdrawal->notes) ? json_decode($withdrawal->notes, true) : [];
                if (!is_array($notes)) $notes = [];
                $notes['proof_path'] = $proofPath;
                $withdrawal->notes = json_encode($notes);
            }
            
            $withdrawal->save();
            DB::commit();

            return redirect()->back()->with('success', 'Penarikan berhasil ditandai sebagai dibayar.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error marking withdrawal as paid: '.$e->getMessage());
            return redirect()->back()->with('error', 'Terjadi kesalahan: '.$e->getMessage());
        }
    }
    /**
     * Neraca Keuangan: gabungkan pendapatan (pembayaran kegiatan, langganan) dan pengeluaran (penarikan)
     */
    public function financialLedger(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin() || $user->isCreator())) {
            abort(403, 'Anda tidak memiliki akses ke Neraca Keuangan');
        }

        // Base query untuk pembayaran yang diizinkan
        $paymentsQuery = Payment::with(['user', 'activity'])
            ->where('status', 'approved');

        if (! $user->isAdmin() && ! $user->isSuperAdmin()) {
            // Creator hanya melihat pembayaran dari kegiatan miliknya/diampunya
            $userProfile = $user->profile;
            $paymentsQuery->whereHas('activity', function ($aq) use ($user, $userProfile) {
                $aq->where('user_id', $user->id)
                    ->orWhereHas('committeeStructures', function ($cq) use ($user) {
                        $cq->where('user_id', $user->id);
                    })
                    ->orWhereHas('divisions', function ($dq) use ($user, $userProfile) {
                        $dq->where('leader_name', $user->name);
                        if ($userProfile && $userProfile->no_hp) {
                            $dq->orWhere('leader_phone', $userProfile->no_hp);
                        }
                    });
            });
        }

        $payments = $paymentsQuery->orderBy('created_at', 'desc')->get();

        // Subscriptions income hanya ditampilkan untuk admin/superadmin
        $subscriptions = collect();
        if ($user->isAdmin() || $user->isSuperAdmin()) {
            $subscriptions = Subscription::with(['user', 'plan'])
                ->where('status', 'active')
                ->orderBy('created_at', 'desc')
                ->get();
        }

        // Withdrawal (pengeluaran)
        $withdrawalsQuery = WithdrawalRequest::with(['user', 'verifier'])
            ->where('status', 'paid');
        if ($user->isCreator()) {
            $withdrawalsQuery->where('user_id', $user->id);
        }
        $withdrawals = $withdrawalsQuery->orderBy('created_at', 'desc')->get();

        // Susun entri neraca
        $ledgerEntries = collect();

        $settings = FinancialSetting::current();
        foreach ($payments as $p) {
            $amount = (float) $p->amount;
            if ($user->isCreator()) {
                $isAutomatic = ! empty($p->midtrans_transaction_id);
                $amount = $isAutomatic
                    ? $settings->computeNetAutomaticForActivity($amount, (int) $p->activity_id)
                    : $settings->computeNet($amount);
            }
            $ledgerEntries->push([
                'date' => $p->created_at,
                'type' => 'payment',
                'category' => 'income',
                'amount' => $amount,
                'title' => 'Pembayaran Kegiatan',
                'description' => $p->activity ? ($p->activity->name.' (User: '.($p->user->name ?? '-').')') : ('User: '.($p->user->name ?? '-')),
                'status' => $p->status,
                'link' => route('payments.show', $p->id),
            ]);
        }

        foreach ($subscriptions as $s) {
            $amount = (float) ($s->plan->price ?? 0);
            $hasPaid = ! empty($s->midtrans_order_id) || ! empty($s->midtrans_payment_token);
            if (! $hasPaid) {
                $amount = 0.0;
            }
            $ledgerEntries->push([
                'date' => $s->created_at,
                'type' => 'subscription',
                'category' => 'income',
                'amount' => $amount,
                'title' => 'Pembayaran Langganan',
                'description' => ($s->plan->name ?? 'Paket').' (User: '.($s->user->name ?? '-').')',
                'status' => $s->status,
                'link' => route('subscription.payments.manage'),
            ]);
        }

        foreach ($withdrawals as $w) {
            $ledgerEntries->push([
                'date' => $w->created_at,
                'type' => 'withdrawal',
                'category' => 'expense',
                'amount' => (float) $w->amount,
                'title' => 'Penarikan Dana',
                'description' => 'Oleh: '.($w->user->name ?? '-').(empty($w->notes) ? '' : (' | Catatan: '.$w->notes)),
                'status' => $w->status,
                'link' => route('payments.withdraw.show', $w->id),
            ]);
        }

        // Hitung ringkasan
        $totalIncome = $ledgerEntries->where('category', 'income')->sum('amount');
        $totalExpense = $ledgerEntries->where('category', 'expense')->sum('amount');
        $balance = $totalIncome - $totalExpense;

        // Urutkan entri berdasarkan tanggal desc
        $ledgerEntries = $ledgerEntries->sortByDesc('date')->values();

        return Inertia::render('Payments/Ledger', [
            'entries' => $ledgerEntries,
            'summary' => [
                'income' => $totalIncome,
                'expense' => $totalExpense,
                'balance' => $balance,
            ],
        ]);
    }

    /**
     * Halaman Aturan Keuangan: pengaturan harga langganan, diskon, voucher, biaya admin, dll.
     * Hanya untuk Admin/Superadmin.
     */
    public function financialRules(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin())) {
            abort(403, 'Anda tidak memiliki akses ke Aturan Keuangan');
        }
        $financial = FinancialSetting::current();
        $plansQuery = SubscriptionPlan::query();
        try {
            if (\Illuminate\Support\Facades\Schema::hasColumn('subscription_plans', 'is_active')) {
                $plansQuery->where('is_active', true);
            }
        } catch (\Throwable $e) {
        }
        $orderCol = 'id';
        try {
            $orderCol = \Illuminate\Support\Facades\Schema::hasColumn('subscription_plans', 'sort_order') ? 'sort_order' : 'id';
        } catch (\Throwable $e) {
            $orderCol = 'id';
        }
        $plans = $plansQuery->orderBy($orderCol)->get();
        $activities = collect();
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('activities')) {
                $actQuery = Activity::query();
                $orderCol = \Illuminate\Support\Facades\Schema::hasColumn('activities', 'name') ? 'name' : 'id';
                $selectCols = \Illuminate\Support\Facades\Schema::hasColumn('activities', 'name') ? ['id', 'name'] : ['id'];
                $activities = $actQuery->orderBy($orderCol)->get($selectCols);
            }
        } catch (\Throwable $e) {
            $activities = collect();
        }
        $specialOverrides = [];
        try {
            $rules = is_array($financial->discount_rules) ? $financial->discount_rules : [];
            $specialOverrides = is_array($rules['activity_auto_deductions'] ?? null) ? $rules['activity_auto_deductions'] : [];
        } catch (\Throwable $e) {
            $specialOverrides = [];
        }
        $voucherCount = 0;
        $vouchers = [];
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('vouchers')) {
                $hasIsActive = \Illuminate\Support\Facades\Schema::hasColumn('vouchers', 'is_active');
                $hasEndDate = \Illuminate\Support\Facades\Schema::hasColumn('vouchers', 'end_date');
                $hasStartDate = \Illuminate\Support\Facades\Schema::hasColumn('vouchers', 'start_date');
                $hasApplicable = \Illuminate\Support\Facades\Schema::hasColumn('vouchers', 'applicable');
                $hasType = \Illuminate\Support\Facades\Schema::hasColumn('vouchers', 'type');
                $hasAmount = \Illuminate\Support\Facades\Schema::hasColumn('vouchers', 'amount');
                $hasCreatedAt = \Illuminate\Support\Facades\Schema::hasColumn('vouchers', 'created_at');

                $countQuery = Voucher::query();
                if ($hasIsActive) {
                    $countQuery->where('is_active', true);
                }
                if ($hasEndDate) {
                    $countQuery->where(function ($q) {
                        $q->whereNull('end_date')->orWhere('end_date', '>=', now()->toDateString());
                    });
                }
                $voucherCount = $countQuery->count();

                $listQuery = Voucher::query();
                $orderCol = $hasCreatedAt ? 'created_at' : 'id';
                $selectCols = ['code'];
                if ($hasType) {
                    $selectCols[] = 'type';
                }
                if ($hasAmount) {
                    $selectCols[] = 'amount';
                }
                if ($hasApplicable) {
                    $selectCols[] = 'applicable';
                }
                if ($hasStartDate) {
                    $selectCols[] = 'start_date';
                }
                if ($hasEndDate) {
                    $selectCols[] = 'end_date';
                }
                if ($hasIsActive) {
                    $selectCols[] = 'is_active';
                }
                $vouchers = $listQuery->orderBy($orderCol, 'desc')->get($selectCols);
            }
        } catch (\Throwable $e) {
            $voucherCount = 0;
            $vouchers = [];
        }
        $subsCount = 0;
        try {
            $subsCount = \Illuminate\Support\Facades\Schema::hasTable('subscription_plans')
                ? SubscriptionPlan::query()->count()
                : 0;
        } catch (\Throwable $e) {
            $subsCount = 0;
        }
        $subscriptionServiceEnabled = '0';
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('settings')) {
                $subscriptionServiceEnabled = Setting::get('subscription_service_enabled', '0');
            }
        } catch (\Throwable $e) {
            $subscriptionServiceEnabled = '0';
        }
        $settings = [
            'admin_fee_percent' => $financial->admin_fee_percent,
            'admin_fee_flat' => $financial->admin_fee_flat,
            'discount_rules_count' => is_array($financial->discount_rules) ? count($financial->discount_rules) : 0,
            'voucher_active_count' => $voucherCount,
            'subscription_plans_count' => $subsCount,
        ];

        return Inertia::render('Payments/Rules', [
            'settings' => $settings,
            'financial' => $financial,
            'plans' => $plans,
            'vouchers' => $vouchers,
            'activities' => $activities,
            'specialOverrides' => $specialOverrides,
            'subscription_service_enabled' => $subscriptionServiceEnabled,
        ]);
    }

    public function setSubscriptionVisibility(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin())) {
            abort(403);
        }
        $enabled = $request->string('enabled')->toString();
        $enabled = ($enabled === '1') ? '1' : '0';
        Setting::set('subscription_service_enabled', $enabled, 'string', 'general', 'Visibilitas menu berlangganan');
        if ($request->expectsJson()) {
            return response()->json(['success' => true, 'enabled' => $enabled]);
        }

        return redirect()->back();
    }

    /**
     * Buat voucher baru dari halaman aturan keuangan (Admin/Superadmin)
     */
    public function financialRulesCreateVoucher(\Illuminate\Http\Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin())) {
            abort(403, 'Anda tidak memiliki akses untuk membuat voucher');
        }

        $validated = $request->validate([
            'code' => 'required|string|min:3|max:32|alpha_dash|unique:vouchers,code',
            'type' => 'required|in:percent,fixed',
            'amount' => 'required|integer|min:1',
            'applicable' => 'required|in:activity,subscription,both',
            'max_uses' => 'nullable|integer|min:1',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'is_active' => 'nullable|boolean',
        ]);

        $data = $validated;
        $data['code'] = strtoupper(trim($data['code']));
        $data['is_active'] = isset($validated['is_active']) ? (bool) $validated['is_active'] : true;

        Voucher::create($data);

        return redirect()->route('payments.rules')
            ->with('success', 'Voucher baru berhasil dibuat.');
    }

    /**
     * Simpan pengaturan aturan keuangan (Admin/Superadmin)
     */
    public function financialRulesSave(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin())) {
            abort(403, 'Anda tidak memiliki akses untuk menyimpan pengaturan');
        }

        $validated = $request->validate([
            // Gunakan persen sebagai biaya admin utama (0-100)
            'admin_fee_percent' => 'required|numeric|min:0|max:100',
            // Nominal tetap tidak digunakan; set ke 0
            'admin_fee_flat' => 'nullable|integer|min:0',
            // Potongan tetap tambahan khusus transaksi otomatis/Midtrans
            'auto_fixed_deduction' => 'nullable|integer|min:0',
            // Minimal harga kegiatan untuk pembayaran otomatis
            'min_auto_price' => 'nullable|integer|min:0',
        ]);

        $financial = FinancialSetting::query()->first();
        if (! $financial) {
            $financial = new FinancialSetting;
        }
        // Simpan persen sebagai biaya admin utama; nolkan nominal tetap
        $financial->admin_fee_percent = (float) ($validated['admin_fee_percent'] ?? 0);
        $financial->admin_fee_flat = 0;
        $financial->auto_fixed_deduction = (int) ($validated['auto_fixed_deduction'] ?? ($financial->auto_fixed_deduction ?? 5000));
        $financial->min_auto_price = (int) ($validated['min_auto_price'] ?? ($financial->min_auto_price ?? 15000));
        $financial->save();

        return redirect()->route('payments.rules')
            ->with('success', 'Pengaturan keuangan berhasil disimpan.');
    }

    public function financialRulesSaveAutoOverride(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin())) {
            abort(403, 'Anda tidak memiliki akses untuk menyimpan pengaturan biaya khusus');
        }
        $validated = $request->validate([
            'activity_id' => 'required|exists:activities,id',
            'type' => 'nullable|in:fixed,percent',
            'deduction' => 'nullable|integer|min:0',
            'amount' => 'nullable|numeric|min:0',
        ]);
        $financial = FinancialSetting::query()->first();

        if (! $financial) {
            $financial = new FinancialSetting;
        }
        $rules = is_array($financial->discount_rules) ? $financial->discount_rules : [];
        $overrides = is_array($rules['activity_auto_deductions'] ?? null) ? $rules['activity_auto_deductions'] : [];
        $type = (string) ($validated['type'] ?? 'fixed');
        $amount = $validated['amount'] ?? $validated['deduction'] ?? 0;
        if ($type === 'percent') {
            $overrides[(int) $validated['activity_id']] = ['type' => 'percent', 'amount' => (float) $amount];
        } else {
            $overrides[(int) $validated['activity_id']] = ['type' => 'fixed', 'amount' => (int) $amount];
        }
        $rules['activity_auto_deductions'] = $overrides;
        $financial->discount_rules = $rules;
        $financial->save();

        return redirect()->route('payments.rules')
            ->with('success', 'Biaya otomatis khusus kegiatan berhasil disimpan.');
    }

    public function financialRulesDeleteAutoOverride(Activity $activity, Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin())) {
            abort(403, 'Anda tidak memiliki akses untuk menghapus pengaturan biaya khusus');
        }
        $financial = FinancialSetting::query()->first();
        if (! $financial) {
            return redirect()->route('payments.rules');
        }
        $rules = is_array($financial->discount_rules) ? $financial->discount_rules : [];
        $overrides = is_array($rules['activity_auto_deductions'] ?? null) ? $rules['activity_auto_deductions'] : [];
        unset($overrides[(int) $activity->id], $overrides[(string) $activity->id]);
        $rules['activity_auto_deductions'] = $overrides;
        $financial->discount_rules = $rules;
        $financial->save();

        return redirect()->route('payments.rules')
            ->with('success', 'Biaya otomatis khusus kegiatan dihapus.');
    }

    /**
     * Simpan harga paket langganan (Admin/Superadmin)
     */
    public function financialRulesSaveSubscriptionPrices(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin())) {
            abort(403, 'Anda tidak memiliki akses untuk menyimpan harga langganan');
        }

        $validated = $request->validate([
            'plans' => 'required|array',
            'plans.*.price' => 'required|integer|min:0',
        ]);

        foreach ($validated['plans'] as $planId => $data) {
            $plan = SubscriptionPlan::find($planId);
            if ($plan) {
                $plan->price = (int) $data['price'];
                $plan->save();
            }
        }

        return redirect()->route('payments.rules')
            ->with('success', 'Harga langganan berhasil diperbarui.');
    }

    /**
     * Simpan layanan paket langganan: limit aktivitas manual, maksimal peserta per aktivitas, dan biaya.
     */
    public function financialRulesSavePlanFacilities(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin())) {
            abort(403, 'Anda tidak memiliki akses untuk menyimpan layanan paket');
        }

        $validated = $request->validate([
            'plans' => 'required|array',
            'plans.*.manual_activities_limit' => 'nullable|integer|min:0',
            'plans.*.max_participants_per_activity' => 'nullable|integer|min:0',
            'plans.*.price' => 'nullable|integer|min:0',
        ]);
        $plansInput = $request->input('plans', []);
        foreach ($plansInput as $planId => $data) {
            $plan = SubscriptionPlan::find($planId);
            if (! $plan) {
                continue;
            }

            // Update features JSON for manual activities limit
            $features = is_array($plan->features) ? $plan->features : [];
            $manualUnlimited = isset($data['manual_activities_limit_unlimited']) && (string) $data['manual_activities_limit_unlimited'] === '1';
            if ($manualUnlimited) {
                unset($features['manual_activities_limit']);
            } elseif (array_key_exists('manual_activities_limit', $data)) {
                $features['manual_activities_limit'] = $data['manual_activities_limit'] === '' ? null : (int) $data['manual_activities_limit'];
            }
            $plan->features = $features;

            // Update max participants per activity if provided
            $participantsUnlimited = isset($data['max_participants_per_activity_unlimited']) && (string) $data['max_participants_per_activity_unlimited'] === '1';
            if ($participantsUnlimited) {
                $plan->max_participants_per_activity = null;
            } elseif (array_key_exists('max_participants_per_activity', $data)) {
                $plan->max_participants_per_activity = $data['max_participants_per_activity'] === '' ? null : (int) $data['max_participants_per_activity'];
            }

            // Optionally update price from this form
            if (array_key_exists('price', $data)) {
                $plan->price = (int) ($data['price'] ?? (int) $plan->price);
            }

            $plan->save();
        }

        $creatorFree = $request->input('creator_free');
        if (is_array($creatorFree)) {
            $financial = FinancialSetting::query()->first();
            if (! $financial) {
                $financial = new FinancialSetting;
            }
            $rules = is_array($financial->discount_rules) ? $financial->discount_rules : [];
            $cfUnlimited = isset($creatorFree['max_participants_per_activity_unlimited']) && (string) $creatorFree['max_participants_per_activity_unlimited'] === '1';
            $cfManualUnlimited = isset($creatorFree['manual_activities_limit_unlimited']) && (string) $creatorFree['manual_activities_limit_unlimited'] === '1';
            $rules['creator_free'] = [
                'manual_activities_limit' => $cfManualUnlimited ? null : (isset($creatorFree['manual_activities_limit']) && $creatorFree['manual_activities_limit'] !== ''
                    ? (int) $creatorFree['manual_activities_limit']
                    : null),
                'max_participants_per_activity' => $cfUnlimited ? null : (isset($creatorFree['max_participants_per_activity']) && $creatorFree['max_participants_per_activity'] !== ''
                    ? (int) $creatorFree['max_participants_per_activity']
                    : null),
                'price' => 0,
            ];
            $financial->discount_rules = $rules;
            $financial->save();
        }

        return redirect()->route('payments.rules')
            ->with('success', 'Layanan paket langganan berhasil diperbarui.');
    }

    /**
     * Simpan konfigurasi Creator Free (tanpa langganan): maksimal peserta per aktivitas, dll.
     */
    public function financialRulesSaveCreatorFree(Request $request)
    {
        $user = auth()->user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin())) {
            abort(403, 'Anda tidak memiliki akses untuk menyimpan konfigurasi Creator Free');
        }

        $validated = $request->validate([
            'manual_activities_limit' => 'nullable|integer|min:0',
            'max_participants_per_activity' => 'nullable|integer|min:0',
        ]);

        $financial = FinancialSetting::query()->first();
        if (! $financial) {
            $financial = new FinancialSetting;
        }

        $rules = is_array($financial->discount_rules) ? $financial->discount_rules : [];
        $rules['creator_free'] = [
            'manual_activities_limit' => (int) ($validated['manual_activities_limit'] ?? 0),
            'max_participants_per_activity' => isset($validated['max_participants_per_activity'])
                ? (int) $validated['max_participants_per_activity']
                : null,
            'price' => 0,
        ];
        $financial->discount_rules = $rules;
        $financial->save();

        return redirect()->route('payments.rules')
            ->with('success', 'Konfigurasi Creator Free berhasil diperbarui.');
    }

    // --- Payment Channel Management ---

    public function channels()
    {
        $channels = PaymentChannel::all();

        return Inertia::render('Payments/Channels', [
            'channels' => $channels,
        ]);
    }

    public function toggleChannel(PaymentChannel $channel)
    {
        $channel->is_active = ! $channel->is_active;
        $channel->save();

        if (request()->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Status channel '.$channel->name.' berhasil diperbarui.',
                'is_active' => $channel->is_active,
            ]);
        }

        return back()->with('success', 'Status channel '.$channel->name.' berhasil diperbarui.');
    }

    public function updateChannel(Request $request, PaymentChannel $channel)
    {
        $validated = $request->validate([
            'fee' => 'required|numeric|min:0',
            'fee_type' => 'required|in:fixed,percent',
        ]);

        $channel->update($validated);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Pengaturan biaya channel '.$channel->name.' berhasil diperbarui.',
                'channel' => $channel,
            ]);
        }

        return back()->with('success', 'Pengaturan biaya channel '.$channel->name.' berhasil diperbarui.');
    }

    public function syncChannels(Request $request)
    {
        // Placeholder for sync logic
        return redirect()->route('payments.channels')->with('success', 'Channel pembayaran berhasil disinkronisasi.');
    }

    public function edit(Payment $payment)
    {
        return Inertia::render('Payments/Edit', [
            'payment' => $payment,
        ]);
    }

    public function destroy(Payment $payment)
    {
        $payment->delete();
        return redirect()->back()->with('success', 'Pembayaran berhasil dihapus.');
    }

    private function decodeNotesToArray($notes): ?array
    {
        if (is_array($notes)) {
            return $notes;
        }

        if (! is_string($notes) || trim($notes) === '') {
            return null;
        }

        $decoded = json_decode($notes, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return $decoded;
        }

        // Attempt recovery when JSON has extra suffix/prefix text
        $start = strpos($notes, '{');
        $end = strrpos($notes, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $candidate = substr($notes, $start, $end - $start + 1);
            $decoded = json_decode($candidate, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }
}
