<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\ActivityBatch;
use App\Models\ActivityUser;
use App\Models\FinancialSetting;
use App\Models\Payment;
use App\Models\PaymentChannel;
use App\Models\User;
use App\Models\Voucher;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Midtrans\Config;
use Midtrans\Snap;

class MidtransPaymentController extends Controller
{
    private function normalizeChannelCode(?string $code): ?string
    {
        if (! $code) {
            return null;
        }
        $map = [
            // Virtual Accounts
            'bca_va' => 'bca_va',
            'bni_va' => 'bni_va',
            'bri_va' => 'bri_va',
            'permata_va' => 'permata_va',
            'cimb_va' => 'cimb_va',
            'danamon_va' => 'other_va',
            'bsi_va' => 'other_va',
            'mandiri_bill' => 'echannel',
            // e-wallet / qris
            'gopay' => 'gopay',
            'shopeepay' => 'shopeepay',
            'qris' => 'qris',
            'ovo' => 'ovo',
            'dana' => 'dana',
            // cstore
            'indomaret' => 'indomaret',
            'alfamart' => 'alfamart',
            // cardless credit
            'akulaku' => 'akulaku',
            'kredivo' => 'kredivo',
            // credit card
            'credit_card' => 'credit_card',
        ];

        return $map[strtolower($code)] ?? $code;
    }

    public function getChannels()
    {
        $channels = PaymentChannel::where('is_active', true)
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'channels' => $channels,
        ]);
    }

    public function __construct()
    {
        $this->configureMidtrans();
    }

    /**
     * Configure Midtrans SDK
     */
    private function configureMidtrans()
    {
        // BACA dari config, bukan env(). Saat config:cache aktif, env() di luar config file akan bernilai null.
        $serverKey = config('services.midtrans.server_key');
        $clientKey = config('services.midtrans.client_key');
        $isProductionRaw = config('services.midtrans.is_production', false);
        $isProduction = filter_var($isProductionRaw, FILTER_VALIDATE_BOOLEAN);
        $disableSslRaw = config('services.midtrans.disable_ssl', false);
        $disableSsl = filter_var($disableSslRaw, FILTER_VALIDATE_BOOLEAN);

        // Validasi kredensial
        if (empty($serverKey)) {
            Log::error('Midtrans Server Key is not configured');
            throw new \Exception('Midtrans Server Key tidak dikonfigurasi. Silakan set MIDTRANS_SERVER_KEY di file .env');
        }

        if (empty($clientKey)) {
            Log::error('Midtrans Client Key is not configured');
            throw new \Exception('Midtrans Client Key tidak dikonfigurasi. Silakan set MIDTRANS_CLIENT_KEY di file .env');
        }

        // Validasi format server key dan client key
        // Sandbox keys biasanya dimulai dengan "SB-Mid-" atau "Mid-server-" untuk sandbox
        // Production keys biasanya dimulai dengan "Mid-server-" untuk production
        if (strpos($serverKey, 'Mid-server-') === false && strpos($serverKey, 'SB-Mid-server-') === false) {
            Log::warning('Midtrans Server Key format mungkin tidak valid', [
                'server_key_preview' => substr($serverKey, 0, 15).'...',
            ]);
        }

        if (strpos($clientKey, 'Mid-client-') === false && strpos($clientKey, 'SB-Mid-client-') === false) {
            Log::warning('Midtrans Client Key format mungkin tidak valid', [
                'client_key_preview' => substr($clientKey, 0, 15).'...',
            ]);
        }

        Config::$serverKey = $serverKey;
        Config::$clientKey = $clientKey;
        Config::$isProduction = $isProduction;
        Config::$isSanitized = true;
        Config::$is3ds = true;

        // Reset curlOptions untuk menghindari konflik
        // Selalu sertakan CURLOPT_HTTPHEADER agar kompatibel dengan midtrans-php ApiRequestor
        Config::$curlOptions = [
            CURLOPT_HTTPHEADER => [],
        ];

        if (app()->environment('local') || config('app.debug') || ! $isProduction) {
            Config::$curlOptions[CURLOPT_SSL_VERIFYPEER] = false;
            Config::$curlOptions[CURLOPT_SSL_VERIFYHOST] = false;
        }

        if ($disableSsl) {
            Config::$curlOptions[CURLOPT_SSL_VERIFYPEER] = false;
            Config::$curlOptions[CURLOPT_SSL_VERIFYHOST] = false;

            Log::warning('Midtrans SSL verification disabled via config', [
                'is_production' => $isProduction,
                'environment' => app()->environment(),
            ]);
        }

        Log::info('Midtrans configured', [
            'is_production' => $isProduction,
            'server_key_set' => ! empty(Config::$serverKey),
            'client_key_set' => ! empty(Config::$clientKey),
            'server_key_preview' => substr(Config::$serverKey, 0, 20).'...',
            'client_key_preview' => substr(Config::$clientKey, 0, 20).'...',
            'environment' => app()->environment(),
            'curl_options_keys' => array_keys(Config::$curlOptions),
        ]);
    }

    /**
     * Update Snap token with specific payment method
     */
    public function updateSnapToken(Request $request)
    {
        $request->validate([
            'payment_id' => 'required|exists:payments,id',
            'channel_code' => 'required|string',
        ]);

        if (! auth()->user()->hasPermission('make_payment')) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        $payment = Payment::find($request->payment_id);

        // Verify ownership
        if ($payment->user_id !== auth()->id()) {
            return response()->json(['status' => 'error', 'message' => 'Unauthorized'], 403);
        }

        Log::info('Updating Snap token for payment', [
            'payment_id' => $payment->id,
            'channel_code' => $request->channel_code,
            'user_id' => auth()->id(),
        ]);

        $activity = $payment->activity;
        $user = auth()->user();
        $phoneNumber = $this->getUserPhoneNumber($user);

        // Determine base amount (amount without previous admin fee)
        $baseAmount = $payment->amount;
        if ($payment->admin_fee > 0) {
            $baseAmount = $payment->amount - $payment->admin_fee;
        }

        // Calculate Admin Fee based on Channel
        $channel = PaymentChannel::where('code', $request->channel_code)->first();
        $adminFee = 0;

        if ($channel) {
            if ($channel->fee_type === 'percent') {
                $adminFee = round($baseAmount * ($channel->fee / 100));
            } else {
                $adminFee = $channel->fee;
            }
        }

        $payment->admin_fee = $adminFee;
        $payment->amount = $baseAmount + $adminFee;

        // Prepare transaction details
        // We use a clone with baseAmount so the activity item price shows the base price,
        // and we add the admin fee as a separate item below.
        $paymentForSnap = clone $payment;
        $paymentForSnap->amount = $baseAmount;

        $transactionDetails = $this->prepareTransactionDetails($activity, $user, $paymentForSnap, 'auto', $phoneNumber);

        // Add Admin Fee to details if applicable
        if ($adminFee > 0) {
            $transactionDetails['transaction_details']['gross_amount'] += $adminFee;
            $transactionDetails['item_details'][] = [
                'id' => 'admin-fee',
                'price' => (int) $adminFee,
                'quantity' => 1,
                'name' => 'Biaya Layanan ('.($channel ? $channel->name : 'Payment Fee').')',
            ];
        }

        $transactionDetails['enabled_payments'] = [$this->normalizeChannelCode($request->channel_code)];
        $returnTo = request('return_to', session('import_return_to'));

        if ($returnTo) {
            $transactionDetails['callbacks'] = [
                'finish' => route('midtrans.payment.finish', ['return_to' => $returnTo, 'activity_id' => $activity->id]),
                'unfinish' => route('midtrans.payment.unfinish', ['return_to' => $returnTo, 'activity_id' => $activity->id]),
                'error' => route('midtrans.payment.error', ['return_to' => $returnTo, 'activity_id' => $activity->id]),
            ];
        } else {
            $returnToParticipants = session('import_bulk_payment') || session('import_bulk_payment_payload');
            if ($returnToParticipants) {
                $transactionDetails['callbacks'] = [
                    'finish' => route('midtrans.payment.finish', ['return_to' => 'participants', 'activity_id' => $activity->id]),
                    'unfinish' => route('midtrans.payment.unfinish', ['return_to' => 'participants', 'activity_id' => $activity->id]),
                    'error' => route('midtrans.payment.error', ['return_to' => 'participants', 'activity_id' => $activity->id]),
                ];
            }
        }

        // Create new Snap token
        try {
            // Re-configure Midtrans before creating token to ensure SSL options are applied
            $this->configureMidtrans();

            $snapToken = $this->createSnapToken($transactionDetails);

            // Update payment with new details
            $payment->midtrans_transaction_id = $transactionDetails['transaction_details']['order_id'];
            $payment->midtrans_snap_token = $snapToken;
            $payment->save();

            return response()->json([
                'status' => 'success',
                'snapToken' => $snapToken,
                'order_id' => $payment->midtrans_transaction_id,
                'amount' => $payment->amount,
                'admin_fee' => $payment->admin_fee,
                'formatted_amount' => number_format($payment->amount, 0, ',', '.'),
                'formatted_fee' => number_format($payment->admin_fee, 0, ',', '.'),
            ]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Create Midtrans payment and show Snap popup
     */
    public function create(Request $request, Activity $activity)
    {
        $isAjax = ($request->query('ajax') == '1') || $request->boolean('is_ajax') || $request->ajax() || $request->expectsJson();
        $isModal = ($request->query('modal') == '1' || $request->boolean('modal'));

        if (! auth()->user()->hasPermission('make_payment')) {
            if ($isAjax || $isModal) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak memiliki izin untuk melakukan pembayaran.',
                ], 403);
            }

            return redirect()->route('activity.detail', $activity->id)
                ->with('error', 'Anda tidak memiliki izin untuk melakukan pembayaran.');
        }

        if (method_exists($activity, 'hasAutomaticPayment') && ! $activity->hasAutomaticPayment()) {
            $manualUrl = route('payments.activity.create', array_merge(['activity' => $activity->id], $request->query()));

            if ($isAjax || $isModal) {
                return response()->json([
                    'success' => true,
                    'redirect' => $manualUrl,
                ]);
            }

            return redirect()->to($manualUrl);
        }

        // Check profile completeness
        $user = auth()->user();
        if (! $user->relationLoaded('profile')) {
            $user->load('profile');
        }

        // Unified Profile Validation
        $template = $activity->import_template;
        $customKeys = [];

        if ($template) {
            $map = [
                'email' => 'email',
                'name' => 'name',
                'no_hp' => 'no_hp',
                'nik' => 'nik',
                'gender' => 'jenis_kelamin',
                'birth_place' => 'birth_place',
                'birth_date' => 'birth_date',
                'province' => 'province_id',
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
                    $rawKey = trim(substr($col, 0, -1));
                    $key = preg_replace('/^\d+\./', '', $rawKey);
                    $key = strtolower(trim($key));

                    if (str_starts_with($key, 'user:')) {
                        $key = substr($key, 5);
                    }
                    if (str_starts_with($key, 'profile:')) {
                        $key = substr($key, 8);
                    }

                    if ($key === 'password') {
                        continue;
                    }

                    if (isset($map[$key])) {
                        $customKeys[] = $map[$key];
                    } elseif (isset($map[str_replace(' ', '_', $key)])) {
                        $customKeys[] = $map[str_replace(' ', '_', $key)];
                    } else {
                        $customKeys[] = $key;
                    }
                }
            }
        }

        // Include keys from modern custom_fields relationship
        if ($activity->custom_fields && is_array($activity->custom_fields)) {
            foreach ($activity->custom_fields as $cf) {
                if (! empty($cf['is_required']) && ! empty($cf['key'])) {
                    $customKeys[] = $cf['key'];
                }
            }
        }

        $mandatoryFields = $activity->mandatory_profile_fields ?? [];
        $allRequiredKeys = array_unique(array_merge(['email', 'foto'], $mandatoryFields, $customKeys));

        $missingProfileData = $user->getIncompleteProfileData($allRequiredKeys);
        $missingFields = array_column($missingProfileData, 'label');
        $missingFieldKeys = array_column($missingProfileData, 'key');

        if (! empty($missingFields) && ! $request->boolean('is_bulk')) {
            $msg = 'Profil Anda belum lengkap. Lengkapi data berikut: '.implode(', ', array_unique($missingFields));

            if ($isAjax || $isModal) {
                return response()->json([
                    'status' => 'error',
                    'message' => $msg,
                    'missing_fields' => $missingFields,
                    'missing_profile_fields' => $missingFieldKeys,
                    'is_profile_incomplete' => true,
                ], 422);
            }

            return redirect()->route('activity.detail', $activity->id)
                ->with('error', $msg)
                ->with('missing_profile_fields', $missingFieldKeys);
        }

        // Fix: Clean up stale bulk session data if this is not a bulk payment request
        // This prevents "mandiri" registrations from accidentally picking up previous "group" import data
        if (! $request->boolean('is_bulk')) {
            session()->forget(['import_bulk_payment', 'import_bulk_payment_payload']);
        }

        // Fix: Security Check for Bulk Import
        // If URL indicates bulk but session is missing, abort to prevent accidental self-registration.
        if ($request->boolean('is_bulk') && ! session('import_bulk_payment') && ! session('import_bulk_payment_payload')) {
            $msg = 'Sesi pembayaran massal telah berakhir. Silakan ulangi proses impor dari awal.';
            if ($isAjax && ! $isModal) {
                return response()->json(['status' => 'error', 'message' => $msg], 403);
            }
            if ($isModal) {
                return response('<div class="flex flex-col items-center justify-center h-full py-12 px-4 text-center"><i class="fas fa-exclamation-circle text-red-500 text-4xl mb-3"></i><p class="text-gray-900 font-medium mb-1">'.$msg.'</p></div>');
            }

            return redirect()->route('activity.participants.index', $activity->id)
                ->with('error', $msg);
        }

        // Validasi activity
        if (! $activity->hasAutomaticPayment()) {
            // Alihkan langsung ke alur pembayaran manual agar peserta tidak terblokir
            return redirect()->route('payments.activity.create', $activity->id)
                ->with('info', 'Kegiatan ini menggunakan pembayaran manual. Silakan unggah bukti transfer.');
        }

        // Check for active batch or requested batch
        $targetBatchId = $request->input('batch_id');
        $activeBatch = null;

        if ($targetBatchId) {
            $activeBatch = ActivityBatch::where('activity_id', $activity->id)
                ->where('id', $targetBatchId)
                ->first();
        }

        // Fallback to default active batch if not found or not requested
        if (! $activeBatch) {
            $activeBatch = $activity->activeBatch;
        }

        // Calculate effective price
        $price = $activity->price;
        if ($activeBatch && $activeBatch->price !== null) {
            $price = $activeBatch->price;
        }

        // Check minimum payment amount for automatic payment (Adjust for bulk if applicable)
        $financialSettings = FinancialSetting::current();
        $minAutoPrice = $financialSettings ? $financialSettings->min_auto_price : 10000;

        $bulk = session('import_bulk_payment') ?? session('import_bulk_payment_payload');
        $checkPrice = $price;
        if ($request->boolean('is_bulk') && is_array($bulk)) {
            $checkPrice = (int) ($bulk['gross_amount'] ?? $checkPrice);
        }

        if ($checkPrice > 0 && $checkPrice < $minAutoPrice) {
            $errorMsg = 'Total tagihan (Rp '.number_format($checkPrice, 0, ',', '.').') di bawah batas minimum pembayaran otomatis (Rp '.number_format($minAutoPrice, 0, ',', '.').'). Silakan gunakan metode manual.';

            if ($isAjax || $isModal) {
                return response()->json(['status' => 'error', 'message' => $errorMsg], 422);
            }

            return redirect()->back()->with('error', $errorMsg);
        }

        if ($price == 0) {
            return redirect()->back()
                ->with('error', 'Kegiatan ini gratis, tidak perlu pembayaran.');
        }

        // REMOVED: Strict batch validation blocking
        // User requested to allow payment even if no batch is active (direct activity payment)
        // if ($hasBatches && ! $activeBatch) { ... }

        $user = auth()->user();

        // Pastikan profil lengkap sudah dicek di awal method create()
        // (Logic unified profile validation di baris ~304)

        // Check participant limit for creator's activity
        if ($activity->user && $activity->user->isCreator()) {
            $currentParticipantCount = ActivityUser::where('activity_id', $activity->id)
                ->where('status', ActivityUser::STATUS_ACTIVE)
                ->count();

            $canAccept = $activity->user->canAcceptParticipants($activity, $currentParticipantCount);
            if (! $canAccept['allowed']) {
                return redirect()->back()
                    ->with('error', $canAccept['message']);
            }
        }

        // Cek pembayaran yang sudah ada (SKIP jika pembayaran massal)
        $existingPayment = null;
        if (! $request->boolean('is_bulk')) {
            $paymentQuery = Payment::where('user_id', $user->id)
                ->where('activity_id', $activity->id);

            if (Schema::hasColumn('payments', 'activity_batch_id')) {
                if ($activeBatch) {
                    $paymentQuery->where('activity_batch_id', $activeBatch->id);
                } else {
                    $paymentQuery->whereNull('activity_batch_id');
                }
            }

            $existingPayment = $paymentQuery->first();

            if ($existingPayment) {
                if ($existingPayment->status === 'approved') {
                    return redirect()->route('activity.detail', $activity->id)
                        ->with('info', 'Anda sudah terdaftar untuk kegiatan ini.');
                }

                if ($existingPayment->status === 'pending' && $existingPayment->midtrans_transaction_id) {
                    // Cek status pembayaran dari Midtrans
                    $this->checkPaymentStatus($existingPayment);
                    $existingPayment->refresh();

                    if ($existingPayment->status === 'approved') {
                        return redirect()->route('activity.detail', $activity->id)
                            ->with('success', 'Pembayaran Anda sudah berhasil!');
                    }

                    // Jika masih pending dan punya snap token, tampilkan ulang halaman pembayaran
                    // tanpa membuat/memperbarui relasi peserta di database.
                    if ($existingPayment->midtrans_snap_token) {
                        if ($isAjax) {
                            return response()->json([
                                'status' => 'success',
                                'snapToken' => $existingPayment->midtrans_snap_token,
                                'order_id' => $existingPayment->midtrans_transaction_id,
                                'payment_id' => $existingPayment->id,
                            ]);
                        }

                        $channels = PaymentChannel::where('is_active', true)->get();

                        return Inertia::render('Payments/Midtrans', [
                            'payment' => $existingPayment,
                            'activity' => $activity,
                            'snapToken' => $existingPayment->midtrans_snap_token,
                            'channels' => $channels,
                            'isAjax' => $isAjax || $isModal,
                            'midtransClientKey' => config('services.midtrans.client_key'),
                            'midtransIsProduction' => (bool) config('services.midtrans.is_production', false),
                        ]);
                    }
                }
            }
        }

        // Langsung buat Snap token tanpa perlu pilih metode pembayaran
        try {
            DB::beginTransaction();

            // Ambil nomor HP dari profile (setelah dipastikan profil lengkap)
            $phoneNumber = $this->getUserPhoneNumber($user);

            // Buat atau update payment record
            $bulk = session('import_bulk_payment') ?? session('import_bulk_payment_payload');
            $amount = (int) $activity->price;
            // Prepare Notes
            $notesField = 'Pembayaran via Midtrans';
            if (is_array($bulk)) {
                $amount = (int) ($bulk['gross_amount'] ?? $amount);
                $notesField = json_encode([
                    'bulk_import' => true,
                    'allowed_count' => (int) data_get($bulk, 'allowed_count', 0),
                    'user_ids' => (array) data_get($bulk, 'pending_user_ids', []),
                    'successfully_imported_count' => (int) data_get($bulk, 'successfully_imported_count', 0),
                ]);
            } elseif ($existingPayment && $existingPayment->notes) {
                // Preserve existing notes if they are JSON (likely containing custom_data from enrollment)
                $existingNotes = $existingPayment->notes;
                if (is_string($existingNotes) && (str_starts_with($existingNotes, '{') || str_starts_with($existingNotes, '['))) {
                    $decoded = json_decode($existingNotes, true);
                    if (json_last_error() === JSON_ERROR_NONE) {
                        // It is valid JSON, keep it. Don't overwrite with simple text.
                        $notesField = $existingNotes;
                    }
                }
            }

            $paymentMatch = [
                'user_id' => $user->id,
                'activity_id' => $activity->id,
            ];
            if (Schema::hasColumn('payments', 'activity_batch_id')) {
                if ($activeBatch) {
                    $paymentMatch['activity_batch_id'] = $activeBatch->id;
                } else {
                    $paymentMatch['activity_batch_id'] = null;
                }
            }

            // Fix: Do NOT use updateOrCreate as it blindly finds ANY record with matching keys.
            // We must use the $existingPayment we filtered earlier, or create a NEW one.
            if ($existingPayment) {
                $payment = $existingPayment;
                $payment->fill([
                    'payment_method_id' => null,
                    'amount' => $amount,
                    'status' => 'pending',
                    'verified_by' => null,
                    'verified_at' => null,
                    'notes' => $notesField,
                ]);
                $payment->save();
            } else {
                $payment = new Payment($paymentMatch);
                $payment->fill([
                    'payment_method_id' => null,
                    'amount' => $amount,
                    'status' => 'pending',
                    'verified_by' => null,
                    'verified_at' => null,
                    'notes' => $notesField,
                ]);
                $payment->save();
            }

            $voucherCode = trim((string) $request->query('voucher', ''));
            if (! empty($voucherCode)) {
                $voucher = Voucher::findByCode($voucherCode);
                if ($voucher && $voucher->isUsableFor('activity')) {
                    $finalAmount = $voucher->applyToAmount((int) $payment->amount);
                    $payment->amount = (int) $finalAmount;
                    $payment->notes = trim(($payment->notes ? $payment->notes.' | ' : '').'Voucher: '.strtoupper($voucherCode));
                    $payment->save();
                }
            }

            $enabledPayments = [];
            if ($request->has('channel_code')) {
                $channel = PaymentChannel::where('code', $request->channel_code)->first();
                if ($channel) {
                    $baseAmount = (int) $payment->amount;

                    $newFee = 0;
                    if ($channel->fee_type === 'percent') {
                        $newFee = round($baseAmount * ($channel->fee / 100));
                    } else {
                        $newFee = (int) $channel->fee;
                    }
                    $payment->admin_fee = $newFee;
                    $payment->amount = $baseAmount + $newFee;
                    $payment->save();

                    $enabledPayments = [$this->normalizeChannelCode($request->channel_code)];
                }
            }

            $transactionDetails = $this->prepareTransactionDetails($activity, $user, $payment, 'auto', $phoneNumber);

            if (! empty($enabledPayments)) {
                $transactionDetails['enabled_payments'] = $enabledPayments;
            }
            $returnTo = $request->input('return_to', session('import_return_to'));

            if ($returnTo) {
                $transactionDetails['callbacks'] = [
                    'finish' => route('midtrans.payment.finish', ['return_to' => $returnTo, 'activity_id' => $activity->id]),
                    'unfinish' => route('midtrans.payment.unfinish', ['return_to' => $returnTo, 'activity_id' => $activity->id]),
                    'error' => route('midtrans.payment.error', ['return_to' => $returnTo, 'activity_id' => $activity->id]),
                ];
            } else {
                $returnToDetail = session('import_return_to') === 'detail';
                $returnToParticipants = ($request->boolean('is_bulk') || session('import_bulk_payment') || session('import_bulk_payment_payload')) && ! $returnToDetail;
                if ($returnToDetail) {
                    $transactionDetails['callbacks'] = [
                        'finish' => route('midtrans.payment.finish', ['return_to' => 'detail', 'activity_id' => $activity->id]),
                        'unfinish' => route('midtrans.payment.unfinish', ['return_to' => 'detail', 'activity_id' => $activity->id]),
                        'error' => route('midtrans.payment.error', ['return_to' => 'detail', 'activity_id' => $activity->id]),
                    ];
                } elseif ($returnToParticipants) {
                    $transactionDetails['callbacks'] = [
                        'finish' => route('midtrans.payment.finish', ['return_to' => 'participants', 'activity_id' => $activity->id]),
                        'unfinish' => route('midtrans.payment.unfinish', ['return_to' => 'participants', 'activity_id' => $activity->id]),
                        'error' => route('midtrans.payment.error', ['return_to' => 'participants', 'activity_id' => $activity->id]),
                    ];
                }
            }

            if (empty($enabledPayments)) {
                DB::commit();
                if ($isAjax) {
                    return response()->json([
                        'status' => 'choose_channel',
                        'payment_id' => $payment->id,
                        'redirect_url' => route('midtrans.payment.create', [
                            'activity' => $activity->id,
                            'is_bulk' => $request->boolean('is_bulk'),
                            'batch_id' => $request->input('batch_id'),
                        ]),
                    ]);
                }
                $channels = PaymentChannel::where('is_active', true)->get();

                return Inertia::render('Payments/Midtrans', [
                    'payment' => $payment,
                    'activity' => $activity,
                    'snapToken' => null,
                    'channels' => $channels,
                    'isAjax' => $isAjax,
                    'midtransClientKey' => config('services.midtrans.client_key'),
                    'midtransIsProduction' => (bool) config('services.midtrans.is_production', false),
                ]);
            }

            // Buat Snap token
            // Re-configure Midtrans to ensure SSL options are applied
            $this->configureMidtrans();
            $snapToken = $this->createSnapToken($transactionDetails);

            // Update payment dengan data Midtrans
            $payment->midtrans_transaction_id = $transactionDetails['transaction_details']['order_id'];
            $payment->midtrans_snap_token = $snapToken;
            $payment->save();

            DB::commit();

            if ($isAjax) {
                return response()->json([
                    'status' => 'success',
                    'snapToken' => $snapToken,
                    'order_id' => $payment->midtrans_transaction_id,
                    'payment_id' => $payment->id,
                ]);
            }

            $channels = PaymentChannel::where('is_active', true)->get();

            return Inertia::render('Payments/Midtrans', [
                'payment' => $payment,
                'activity' => $activity,
                'snapToken' => $snapToken,
                'channels' => $channels,
                'isAjax' => $isAjax,
                'midtransClientKey' => config('services.midtrans.client_key'),
                'midtransIsProduction' => (bool) config('services.midtrans.is_production', false),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error creating Midtrans payment', [
                'activity_id' => $activity->id,
                'user_id' => $user->id ?? null,
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
            ]);

            $safeMessage = config('app.debug')
                ? 'Terjadi kesalahan saat membuat pembayaran: '.$e->getMessage()
                : 'Terjadi kesalahan saat membuat pembayaran. Silakan coba lagi.';

            if ($isAjax && ! $isModal) {
                return response()->json([
                    'status' => 'error',
                    'message' => $safeMessage,
                ], 500);
            }
            if ($isModal) {
                return response('<div class="flex flex-col items-center justify-center h-full py-12 px-4 text-center"><i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-3"></i><p class="text-gray-900 font-medium mb-1">Terjadi Kesalahan</p><p class="text-sm text-gray-500 mb-4">'.$safeMessage.'</p><button class="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm font-medium text-gray-700" onclick="document.getElementById(\'midtransPaymentModal\').classList.add(\'hidden\'); document.getElementById(\'midtransPaymentModal\').classList.remove(\'flex\'); document.body.style.overflow = \'\';">Tutup</button></div>');
            }

            return redirect()->back()
                ->with('error', $safeMessage)
                ->withInput();
        }
    }

    /**
     * Handle payment notification from Midtrans webhook
     */
    public function handleNotification(Request $request)
    {
        try {
            $notification = json_decode($request->getContent(), true);

            if (empty($notification)) {
                $notification = $request->all();
            }

            Log::info('Midtrans notification received', ['notification' => $notification]);

            // Validasi signature untuk memastikan request berasal dari Midtrans
            $signatureKey = $notification['signature_key'] ?? null;
            if ($signatureKey) {
                $serverKey = config('services.midtrans.server_key');
                $computedSignature = hash('sha512',
                    ($notification['order_id'] ?? '').
                    ($notification['status_code'] ?? '').
                    ($notification['gross_amount'] ?? '').
                    $serverKey
                );
                if (! hash_equals($computedSignature, (string) $signatureKey)) {
                    \Log::warning('Midtrans signature mismatch', [
                        'order_id' => $notification['order_id'] ?? null,
                        'status_code' => $notification['status_code'] ?? null,
                        'gross_amount' => $notification['gross_amount'] ?? null,
                    ]);

                    return response()->json(['status' => 'error', 'message' => 'Invalid signature'], 403);
                }
            }

            $orderId = $notification['order_id'] ?? null;
            $transactionStatus = $notification['transaction_status'] ?? null;
            $fraudStatus = $notification['fraud_status'] ?? null;
            $grossAmount = $notification['gross_amount'] ?? null;

            if (! $orderId || ! $transactionStatus) {
                return response()->json(['status' => 'error', 'message' => 'Invalid notification data'], 400);
            }

            // Extract activity and user ID from order_id
            // Format: ACTIVITY-{activity_id}-USER-{user_id}-{timestamp}
            preg_match('/ACTIVITY-([A-Za-z0-9]+)-USER-([A-Za-z0-9]+)/', $orderId, $matches);
            if (empty($matches)) {
                Log::error('Invalid order_id format', ['order_id' => $orderId]);

                return response()->json(['status' => 'error', 'message' => 'Invalid order_id format'], 400);
            }

            $activityId = $matches[1];
            $userId = $matches[2];

            $payment = Payment::where('midtrans_transaction_id', $orderId)
                ->where('user_id', $userId)
                ->where('activity_id', $activityId)
                ->first();

            if (! $payment) {
                Log::error('Payment not found', ['order_id' => $orderId]);

                return response()->json(['status' => 'error', 'message' => 'Payment not found'], 404);
            }

            // Verify amount
            if ((int) $grossAmount != (int) $payment->amount) {
                Log::error('Amount mismatch', [
                    'expected' => $payment->amount,
                    'received' => $grossAmount,
                ]);

                return response()->json(['status' => 'error', 'message' => 'Amount mismatch'], 400);
            }

            DB::beginTransaction();

            // Handle transaction status
            $this->handleTransactionStatus($payment, $transactionStatus, $fraudStatus);

            $payment->midtrans_response = json_encode($notification);
            $payment->save();

            DB::commit();

            return response()->json(['status' => 'success']);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Error handling Midtrans notification: '.$e->getMessage(), [
                'notification' => $request->all(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle payment finish callback
     */
    public function finish(Request $request)
    {
        session()->forget(['import_bulk_payment', 'import_bulk_payment_payload']);

        $orderId = $request->query('order_id');
        $activityIdParam = (int) $request->query('activity_id');
        $debug = (string) $request->query('debug', '0') === '1';
        $returnTo = (string) $request->query('return_to', '');

        if (! $orderId) {
            if ($activityIdParam) {
                $routeTarget = route('activity.detail', $activityIdParam);
                if ($returnTo === 'participants') {
                    $routeTarget = route('activity.participants.index', $activityIdParam);
                } elseif ($returnTo === 'show') {
                    $routeTarget = route('activity.show', $activityIdParam);
                }

                return redirect($routeTarget)
                    ->with('error', 'Permintaan pembayaran tidak valid.');
            }

            return redirect()->route('home')
                ->with('error', 'Invalid payment request.');
        }

        $payment = Payment::where('midtrans_transaction_id', $orderId)
            ->where('user_id', auth()->id())
            ->first();

        if (! $payment) {
            if ($activityIdParam) {
                $routeTarget = route('activity.detail', $activityIdParam);
                if ($returnTo === 'participants') {
                    $routeTarget = route('activity.participants.index', $activityIdParam);
                } elseif ($returnTo === 'show') {
                    $routeTarget = route('activity.show', $activityIdParam);
                }

                return redirect($routeTarget)
                    ->with('error', 'Pembayaran tidak ditemukan.');
            }

            return redirect()->route('home')
                ->with('error', 'Pembayaran tidak ditemukan.');
        }

        // Fallback: bila webhook tidak masuk, cek status langsung ke Midtrans agar user tidak terjebak pending
        try {
            $beforeStatus = $payment->status;
            $this->checkPaymentStatus($payment);
            $payment->refresh();

            if ($payment->status === 'approved' && $beforeStatus !== 'approved') {
                $routeTarget = match ($returnTo) {
                    'participants' => route('activity.participants.index', $payment->activity_id),
                    'show' => route('activity.show', $payment->activity_id),
                    default => route('activity.detail', $payment->activity_id),
                };

                return redirect($routeTarget)
                    ->with('success', 'Pembayaran Anda berhasil dan keikutsertaan telah diaktifkan.');
            }
        } catch (\Throwable $e) {
            \Log::error('Finish callback fallback check failed', [
                'order_id' => $orderId,
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);
        }

        $routeTarget = match ($returnTo) {
            'participants' => route('activity.participants.index', $payment->activity_id),
            'show' => route('activity.show', $payment->activity_id),
            default => route('activity.detail', $payment->activity_id),
        };

        return redirect($routeTarget)
            ->with('info', 'Pembayaran selesai di Midtrans dan sedang divalidasi. Jika belum aktif, silakan refresh atau coba kembali nanti.');
    }

    /**
     * Handle payment unfinish callback (ketika user cancel atau tutup popup)
     */
    public function unfinish(Request $request)
    {
        Log::info('Midtrans unfinish callback received', [
            'order_id' => $request->query('order_id'),
            'all_params' => $request->all(),
            'user_id' => auth()->id(),
        ]);

        $orderId = $request->query('order_id');
        $activityIdParam = (int) $request->query('activity_id');
        $returnTo = (string) $request->query('return_to', '');

        if (! $orderId) {
            Log::warning('Unfinish callback without order_id');
            if ($activityIdParam) {
                $routeTarget = match ($returnTo) {
                    'participants' => route('activity.participants.index', $activityIdParam),
                    'show' => route('activity.show', $activityIdParam),
                    default => route('activity.detail', $activityIdParam),
                };

                return redirect($routeTarget)
                    ->with('warning', 'Pembayaran dibatalkan. Anda dapat mencoba lagi nanti.');
            }

            return redirect()->route('home')
                ->with('warning', 'Pembayaran dibatalkan. Anda dapat mencoba lagi nanti.');
        }

        $payment = Payment::where('midtrans_transaction_id', $orderId)
            ->where('user_id', auth()->id())
            ->first();

        if (! $payment) {
            Log::warning('Payment not found for unfinish callback', [
                'order_id' => $orderId,
                'user_id' => auth()->id(),
            ]);

            $lastPayment = Payment::where('user_id', auth()->id())
                ->where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->first();

            if ($lastPayment) {
                $routeTarget = match ($returnTo) {
                    'participants' => route('activity.participants.index', $lastPayment->activity_id),
                    'show' => route('activity.show', $lastPayment->activity_id),
                    default => route('activity.detail', $lastPayment->activity_id),
                };

                return redirect($routeTarget)
                    ->with('warning', 'Pembayaran belum selesai. Silakan selesaikan pembayaran Anda.');
            }

            if ($activityIdParam) {
                $routeTarget = match ($returnTo) {
                    'participants' => route('activity.participants.index', $activityIdParam),
                    'show' => route('activity.show', $activityIdParam),
                    default => route('activity.detail', $activityIdParam),
                };

                return redirect($routeTarget)
                    ->with('warning', 'Pembayaran dibatalkan. Anda dapat mencoba lagi nanti.');
            }

            return redirect()->route('home')
                ->with('warning', 'Pembayaran dibatalkan. Anda dapat mencoba lagi nanti.');
        }

        Log::info('Redirecting to payment show page', [
            'payment_id' => $payment->id,
            'payment_status' => $payment->status,
            'activity_id' => $payment->activity_id,
        ]);

        $routeTarget = match ($returnTo) {
            'participants' => route('activity.participants.index', $payment->activity_id),
            'show' => route('activity.show', $payment->activity_id),
            default => route('activity.detail', $payment->activity_id),
        };

        return redirect($routeTarget)
            ->with('warning', 'Pembayaran belum selesai. Silakan selesaikan pembayaran Anda untuk menyelesaikan pendaftaran.');
    }

    /**
     * Handle payment error callback
     */
    public function paymentError(Request $request)
    {
        Log::info('Midtrans error callback received', [
            'order_id' => $request->query('order_id'),
            'all_params' => $request->all(),
            'user_id' => auth()->id(),
        ]);

        $orderId = $request->query('order_id');
        $activityIdParam = (int) $request->query('activity_id');
        $returnTo = (string) $request->query('return_to', '');

        if (! $orderId) {
            Log::warning('Error callback without order_id');
            if ($activityIdParam) {
                $routeTarget = match ($returnTo) {
                    'participants' => route('activity.participants.index', $activityIdParam),
                    'show' => route('activity.show', $activityIdParam),
                    default => route('activity.detail', $activityIdParam),
                };

                return redirect($routeTarget)
                    ->with('error', 'Terjadi kesalahan saat memproses pembayaran.');
            }

            return redirect()->route('home')
                ->with('error', 'Terjadi kesalahan saat memproses pembayaran.');
        }

        $payment = Payment::where('midtrans_transaction_id', $orderId)
            ->where('user_id', auth()->id())
            ->first();

        if (! $payment) {
            Log::warning('Payment not found for error callback', [
                'order_id' => $orderId,
                'user_id' => auth()->id(),
            ]);

            $lastPayment = Payment::where('user_id', auth()->id())
                ->where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->first();

            if ($lastPayment) {
                $routeTarget = match ($returnTo) {
                    'participants' => route('activity.participants.index', $lastPayment->activity_id),
                    'show' => route('activity.show', $lastPayment->activity_id),
                    default => route('activity.detail', $lastPayment->activity_id),
                };

                return redirect($routeTarget)
                    ->with('error', 'Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.');
            }

            if ($activityIdParam) {
                $routeTarget = match ($returnTo) {
                    'participants' => route('activity.participants.index', $activityIdParam),
                    'show' => route('activity.show', $activityIdParam),
                    default => route('activity.detail', $activityIdParam),
                };

                return redirect($routeTarget)
                    ->with('error', 'Terjadi kesalahan saat memproses pembayaran.');
            }

            return redirect()->route('home')
                ->with('error', 'Terjadi kesalahan saat memproses pembayaran.');
        }

        Log::info('Redirecting to payment show page after error', [
            'payment_id' => $payment->id,
            'payment_status' => $payment->status,
            'activity_id' => $payment->activity_id,
        ]);

        $routeTarget = $returnTo === 'participants'
            ? route('activity.participants.index', $payment->activity_id)
            : route('activity.detail', $payment->activity_id);

        return redirect($routeTarget)
            ->with('error', 'Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi atau hubungi support jika masalah berlanjut.');
    }

    /**
     * Prepare transaction details for Midtrans
     */
    private function prepareTransactionDetails(Activity $activity, $user, Payment $payment, string $paymentMethod, string $phoneNumber)
    {
        $orderId = 'ACTIVITY-'.$activity->id.'-USER-'.$user->id.'-'.time();

        // Tidak perlu map payment method karena kita tidak membatasi enabled_payments
        // Biarkan Midtrans menampilkan semua channels yang tersedia dari merchant config

        // Validate and sanitize customer name (max 50 chars)
        $customerName = substr(trim($user->name), 0, 50);

        // Split name untuk first_name dan last_name (opsional, mengikuti best practice)
        $nameParts = explode(' ', $customerName, 2);
        $firstName = $nameParts[0];
        $lastName = isset($nameParts[1]) ? substr($nameParts[1], 0, 50) : '';

        // Validate and sanitize activity name (max 50 chars)
        $activityName = substr(trim($activity->name), 0, 50);

        // Validasi required fields
        if (empty($firstName)) {
            throw new \Exception('Nama customer tidak boleh kosong.');
        }
        if (empty($user->email)) {
            throw new \Exception('Email customer tidak boleh kosong.');
        }
        if (empty($activityName)) {
            throw new \Exception('Nama kegiatan tidak boleh kosong.');
        }
        if ($activity->price <= 0) {
            throw new \Exception('Harga kegiatan harus lebih dari 0.');
        }
        if (empty($phoneNumber) || strlen($phoneNumber) < 10) {
            Log::warning('Phone number mungkin tidak valid', ['phone' => $phoneNumber]);
        }

        // Siapkan transaction details
        $transactionDetails = [
            'transaction_details' => [
                'order_id' => $orderId,
                // gunakan nilai pada payment (mendukung voucher)
                'gross_amount' => (int) $payment->amount,
            ],
            // Kirim URL notifikasi agar Midtrans mengirim webhook ke endpoint aplikasi
            'notification_url' => route('midtrans.notification'),
            'customer_details' => [
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $user->email,
                'phone' => $phoneNumber,
            ],
            'item_details' => [
                [
                    'id' => 'activity-'.$activity->id,
                    // gunakan nilai pada payment (mendukung voucher)
                    'price' => (int) $payment->amount,
                    'quantity' => 1,
                    'name' => $activityName,
                ],
            ],
            'callbacks' => [
                'finish' => route('midtrans.payment.finish'),
                'unfinish' => route('midtrans.payment.unfinish'),
                'error' => route('midtrans.payment.error'),
            ],
        ];

        // Apply payment channel restrictions from database
        if (class_exists(PaymentChannel::class)) {
            $activeChannels = PaymentChannel::where('is_active', true)->pluck('code')->toArray();
            $totalChannels = PaymentChannel::count();

            if ($totalChannels > 0) {
                if (empty($activeChannels)) {
                    // All channels disabled in DB
                    Log::warning('All payment channels are disabled in application settings.');
                    // We can either abort or let Midtrans show defaults.
                    // Aborting is safer to respect user's choice to "turn off" everything.
                    // But for user experience, maybe just don't set enabled_payments (fallback to all)
                    // is risky if they really wanted to turn off.
                    // Let's set enabled_payments to a non-existent channel to force empty?
                    // Or better, catch this upstream.
                    // For now, let's NOT set enabled_payments if empty, to avoid API error,
                    // but Log it.
                } else {
                    $transactionDetails['enabled_payments'] = $activeChannels;
                    Log::info('Payment channels restricted to active channels from DB', ['channels' => $activeChannels]);
                }
            } else {
                Log::info('PaymentChannel table empty - using merchant default configuration');
            }
        }

        // JANGAN batasi enabled_payments - biarkan Midtrans menampilkan semua channels yang tersedia
        // berdasarkan konfigurasi merchant di dashboard Midtrans
        // Jika enabled_payments tidak dikirim, Midtrans akan menampilkan semua payment channels
        // yang sudah diaktifkan oleh merchant di dashboard mereka

        // Catatan: enabled_payments hanya diperlukan jika ingin membatasi pilihan user
        // Tapi ini bisa menyebabkan "No payment channels available" jika merchant belum mengaktifkan semua channels

        // Uncomment baris berikut jika ingin membatasi payment channels:
        // $allAvailableChannels = [
        //     'credit_card',
        //     'bank_transfer',
        //     'bca', 'bni', 'bri', 'mandiri', 'permata', 'cimb', 'other_va',
        //     'gopay', 'shopeepay', 'ovo', 'dana'
        // ];
        // $transactionDetails['enabled_payments'] = $allAvailableChannels;

        if (! isset($transactionDetails['enabled_payments'])) {
            Log::info('Payment channels NOT restricted - using merchant default configuration', [
                'payment_method_param' => $paymentMethod,
                'enabled_payments_in_request' => 'NOT SET (allowing all merchant-enabled channels)',
                'note' => 'Midtrans will display all payment channels enabled in merchant dashboard',
            ]);
        }

        // Debug: Log transaction details untuk validasi
        Log::info('Transaction details prepared', [
            'order_id' => $transactionDetails['transaction_details']['order_id'],
            'gross_amount' => $transactionDetails['transaction_details']['gross_amount'],
            'customer_first_name' => $firstName,
            'customer_last_name' => $lastName,
            'customer_email' => $user->email,
            'customer_phone' => $phoneNumber,
            'item_name' => $activityName,
            'enabled_payments' => isset($transactionDetails['enabled_payments']) ? $transactionDetails['enabled_payments'] : 'NOT SET (using merchant default)',
            'callbacks' => $transactionDetails['callbacks'],
        ]);

        return $transactionDetails;
    }

    /**
     * Map payment method to Midtrans enabled payments (tidak digunakan lagi, tetap untuk kompatibilitas)
     */
    private function mapPaymentMethod(string $paymentMethod): array
    {
        // Tidak digunakan lagi karena kita tidak membatasi payment channels
        // Tetap ada untuk kompatibilitas jika diperlukan di masa depan
        return [];
    }

    /**
     * Get user phone number from profile
     */
    private function getUserPhoneNumber($user): string
    {
        if ($user->profile && ! empty($user->profile->no_hp)) {
            $phoneNumber = preg_replace('/[^0-9+]/', '', $user->profile->no_hp);

            // Format nomor HP ke format internasional (+62)
            if (! empty($phoneNumber) && $phoneNumber[0] === '0') {
                $phoneNumber = '+62'.substr($phoneNumber, 1);
            } elseif (! empty($phoneNumber) && substr($phoneNumber, 0, 2) !== '+62' && substr($phoneNumber, 0, 3) !== '62') {
                if (strlen($phoneNumber) >= 10) {
                    $phoneNumber = '+62'.ltrim($phoneNumber, '0');
                }
            }

            // Validasi minimal 10 digit
            $phoneDigits = preg_replace('/[^0-9]/', '', $phoneNumber);
            if (strlen($phoneDigits) >= 10) {
                return $phoneNumber;
            }
        }

        // Default phone number jika tidak ada
        return '+6281234567890';
    }

    /**
     * Validate transaction details before sending to Midtrans
     */
    private function validateTransactionDetails(array $transactionDetails)
    {
        $errors = [];

        // Validasi transaction_details
        if (! isset($transactionDetails['transaction_details'])) {
            $errors[] = 'transaction_details is required';
        } else {
            if (! isset($transactionDetails['transaction_details']['order_id']) || empty($transactionDetails['transaction_details']['order_id'])) {
                $errors[] = 'transaction_details.order_id is required';
            }
            if (! isset($transactionDetails['transaction_details']['gross_amount']) || $transactionDetails['transaction_details']['gross_amount'] <= 0) {
                $errors[] = 'transaction_details.gross_amount must be greater than 0';
            }
        }

        // Validasi customer_details
        if (! isset($transactionDetails['customer_details'])) {
            $errors[] = 'customer_details is required';
        } else {
            if (! isset($transactionDetails['customer_details']['first_name']) || empty($transactionDetails['customer_details']['first_name'])) {
                $errors[] = 'customer_details.first_name is required';
            }
            // last_name adalah optional, tidak perlu divalidasi
            if (! isset($transactionDetails['customer_details']['email']) || empty($transactionDetails['customer_details']['email'])) {
                $errors[] = 'customer_details.email is required';
            }
            if (! isset($transactionDetails['customer_details']['phone']) || empty($transactionDetails['customer_details']['phone'])) {
                $errors[] = 'customer_details.phone is required';
            }
        }

        // Validasi item_details
        if (! isset($transactionDetails['item_details']) || ! is_array($transactionDetails['item_details']) || empty($transactionDetails['item_details'])) {
            $errors[] = 'item_details is required and must be an array';
        } else {
            foreach ($transactionDetails['item_details'] as $index => $item) {
                if (! isset($item['id']) || empty($item['id'])) {
                    $errors[] = "item_details[{$index}].id is required";
                }
                if (! isset($item['price']) || $item['price'] <= 0) {
                    $errors[] = "item_details[{$index}].price must be greater than 0";
                }
                if (! isset($item['quantity']) || $item['quantity'] <= 0) {
                    $errors[] = "item_details[{$index}].quantity must be greater than 0";
                }
                if (! isset($item['name']) || empty($item['name'])) {
                    $errors[] = "item_details[{$index}].name is required";
                }
            }
        }

        // Validasi enabled_payments (optional)
        if (isset($transactionDetails['enabled_payments']) && ! is_array($transactionDetails['enabled_payments'])) {
            $errors[] = 'enabled_payments must be an array';
        }

        if (! empty($errors)) {
            Log::error('Transaction details validation failed', [
                'errors' => $errors,
                'transaction_details' => $transactionDetails,
            ]);
            throw new \Exception('Invalid transaction details: '.implode(', ', $errors));
        }
    }

    /**
     * Create Snap token from Midtrans
     */
    protected function createSnapToken(array $transactionDetails): string
    {
        // Debug: Log configuration check
        Log::info('Checking Midtrans configuration', [
            'server_key_set' => ! empty(Config::$serverKey),
            'client_key_set' => ! empty(Config::$clientKey),
            'is_production' => Config::$isProduction,
            'server_key_preview' => ! empty(Config::$serverKey) ? substr(Config::$serverKey, 0, 10).'...' : 'N/A',
        ]);

        if (empty(Config::$serverKey)) {
            Log::error('Midtrans Server Key is empty');
            throw new \Exception('Midtrans Server Key tidak dikonfigurasi. Silakan hubungi administrator.');
        }

        if (empty(Config::$clientKey)) {
            Log::error('Midtrans Client Key is empty');
            throw new \Exception('Midtrans Client Key tidak dikonfigurasi. Silakan hubungi administrator.');
        }

        try {
            // Debug: Log sebelum request ke Midtrans
            Log::info('Calling Midtrans Snap API', [
                'transaction_details' => $transactionDetails['transaction_details'],
                'enabled_payments_count' => isset($transactionDetails['enabled_payments']) && is_array($transactionDetails['enabled_payments']) ? count($transactionDetails['enabled_payments']) : 0,
                'transaction_details_json' => json_encode($transactionDetails),
            ]);

            // Validasi final sebelum kirim ke Midtrans
            $this->validateTransactionDetails($transactionDetails);

            $snapToken = Snap::getSnapToken($transactionDetails);

            if (empty($snapToken)) {
                Log::error('Snap token is empty after API call');
                throw new \Exception('Gagal mendapatkan Snap Token dari Midtrans.');
            }

            Log::info('Snap token received successfully', [
                'token_length' => strlen($snapToken),
            ]);

            return $snapToken;
        } catch (\Midtrans\Exception $e) {
            // Debug: Log detailed Midtrans error
            $errorData = [
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
                'exception_class' => get_class($e),
            ];

            // Parse error message untuk mendapatkan detail dari API response
            $errorMessage = $e->getMessage();

            // Cek jika error 401 (Unauthorized)
            if ($e->getCode() == 401 || strpos($errorMessage, '401') !== false || strpos($errorMessage, 'unauthorized') !== false) {
                $errorData['error_type'] = 'authentication_error';
                $errorData['suggestion'] = 'Periksa Server Key dan Client Key di file .env. Pastikan key yang digunakan sesuai dengan environment (sandbox atau production).';
                $errorData['is_production'] = Config::$isProduction;
                $errorData['server_key_preview'] = substr(Config::$serverKey, 0, 15).'...';
                $errorData['client_key_preview'] = substr(Config::$clientKey, 0, 15).'...';
            }

            // Try to get more details from exception
            try {
                // Cek apakah exception memiliki method untuk mendapatkan response
                $reflection = new \ReflectionClass($e);

                // Cek method getResponse jika ada
                if ($reflection->hasMethod('getResponse')) {
                    try {
                        $response = $e->getResponse();
                        $errorData['midtrans_response'] = $response;

                        // Parse error message from response if available
                        if (is_array($response)) {
                            if (isset($response['status_code'])) {
                                $errorData['midtrans_status_code'] = $response['status_code'];
                            }
                            if (isset($response['status_message'])) {
                                $errorData['midtrans_status_message'] = $response['status_message'];
                            }
                            if (isset($response['error_messages'])) {
                                $errorData['error_messages'] = $response['error_messages'];
                            }
                            if (isset($response['validation_messages'])) {
                                $errorData['validation_messages'] = $response['validation_messages'];
                            }

                            // Error code 10023 biasanya terkait dengan format data atau konfigurasi
                            if ((isset($response['status_code']) && $response['status_code'] == '10023') ||
                                strpos($e->getMessage(), '10023') !== false) {
                                $errorData['error_type'] = 'midtrans_data_format_error';
                                $errorData['suggestion'] = 'Periksa format data yang dikirim ke Midtrans API. Pastikan semua field required sudah diisi dengan benar.';
                            }
                        } elseif (is_object($response)) {
                            $errorData['midtrans_response_object'] = json_encode($response);
                            if (isset($response->status_code)) {
                                $errorData['midtrans_status_code'] = $response->status_code;
                            }
                            if (isset($response->status_message)) {
                                $errorData['midtrans_status_message'] = $response->status_message;
                            }
                            if (isset($response->error_messages)) {
                                $errorData['error_messages'] = $response->error_messages;
                            }
                        }
                    } catch (\Exception $ex) {
                        $errorData['getResponse_error'] = $ex->getMessage();
                    }
                }

                // Parse error_messages dari error message jika ada
                if (strpos($errorMessage, 'error_messages') !== false) {
                    // Try to extract JSON from error message
                    preg_match('/\{.*\}/', $errorMessage, $matches);
                    if (! empty($matches)) {
                        $jsonResponse = json_decode($matches[0], true);
                        if ($jsonResponse && isset($jsonResponse['error_messages'])) {
                            $errorData['parsed_error_messages'] = $jsonResponse['error_messages'];
                        }
                    }
                }

                // Cek method getApiResponse jika ada
                if ($reflection->hasMethod('getApiResponse')) {
                    try {
                        $apiResponse = $e->getApiResponse();
                        $errorData['midtrans_api_response'] = $apiResponse;
                    } catch (\Exception $ex) {
                        $errorData['getApiResponse_error'] = $ex->getMessage();
                    }
                }

                // Cek jika error terkait dengan curl/network
                if (strpos($e->getMessage(), 'curl') !== false || strpos($e->getMessage(), 'SSL') !== false) {
                    $errorData['error_type'] = 'network_error';
                    $errorData['suggestion'] = 'Periksa koneksi internet dan konfigurasi SSL.';
                }
            } catch (\Exception $ex) {
                $errorData['parsing_error'] = $ex->getMessage();
            }

            Log::error('Midtrans Snap Token Error', $errorData);

            // Tampilkan pesan error yang lebih user-friendly
            $userMessage = 'Gagal membuat transaksi pembayaran.';

            // Handle error 401 khusus
            if (isset($errorData['error_type']) && $errorData['error_type'] == 'authentication_error') {
                $userMessage = 'Kredensial Midtrans tidak valid. Silakan hubungi administrator untuk memeriksa konfigurasi Server Key dan Client Key.';
            } elseif (isset($errorData['parsed_error_messages']) && is_array($errorData['parsed_error_messages'])) {
                $userMessage = 'Error Midtrans: '.implode(', ', $errorData['parsed_error_messages']);
            } elseif (isset($errorData['error_messages']) && is_array($errorData['error_messages'])) {
                $userMessage = 'Error Midtrans: '.implode(', ', $errorData['error_messages']);
            } elseif (isset($errorData['midtrans_status_message'])) {
                $userMessage = 'Gagal membuat transaksi: '.$errorData['midtrans_status_message'];
            } elseif (isset($errorData['error_type']) && $errorData['error_type'] == 'midtrans_data_format_error') {
                $userMessage = 'Terjadi kesalahan format data. Silakan hubungi administrator atau coba lagi.';
            } elseif (isset($errorData['validation_messages'])) {
                $userMessage = 'Data tidak valid: '.json_encode($errorData['validation_messages']);
            }

            throw new \Exception($userMessage);
        } catch (\Exception $e) {
            Log::error('General Exception in createSnapToken', [
                'error_message' => $e->getMessage(),
                'error_code' => $e->getCode(),
                'error_file' => $e->getFile(),
                'error_line' => $e->getLine(),
            ]);
            throw $e;
        }
    }

    /**
     * Handle transaction status from Midtrans
     */
    private function handleTransactionStatus(Payment $payment, string $transactionStatus, ?string $fraudStatus)
    {
        if ($transactionStatus == 'capture') {
            // Catatan Midtrans:
            // - Untuk kartu kredit, capture disertai fraud_status (accept/challenge)
            // - Untuk selain kartu kredit, ada kasus capture tanpa fraud_status
            //   yang secara praktis setara dengan settlement (berhasil)
            if ($fraudStatus === 'challenge') {
                $payment->status = 'pending';
                $payment->notes = 'Pembayaran sedang dalam verifikasi';
            } elseif ($fraudStatus === 'accept' || empty($fraudStatus)) {
                // Anggap capture tanpa fraud_status sebagai berhasil
                $this->approvePayment($payment);
            } else {
                // Unknown fraud status, tetap pending dan catat
                \Log::warning('Unexpected fraud_status on capture', [
                    'payment_id' => $payment->id,
                    'fraud_status' => $fraudStatus,
                ]);
                $payment->status = 'pending';
                $payment->notes = 'Menunggu verifikasi pembayaran';
            }
        } elseif ($transactionStatus == 'settlement') {
            $this->approvePayment($payment);
        } elseif ($transactionStatus == 'pending') {
            $payment->status = 'pending';
            $payment->notes = 'Menunggu pembayaran';
        } elseif (in_array($transactionStatus, ['deny', 'expire', 'cancel'])) {
            $payment->status = 'rejected';
            $payment->notes = 'Pembayaran '.$transactionStatus;
        }
    }

    /**
     * Check payment status from Midtrans API
     */
    public function checkPaymentStatus(Payment $payment)
    {
        try {
            if (empty($payment->midtrans_transaction_id)) {
                return $payment;
            }

            $apiUrl = config('services.midtrans.is_production')
                ? 'https://api.midtrans.com/v2/'
                : 'https://api.sandbox.midtrans.com/v2/';

            $ch = curl_init($apiUrl.$payment->midtrans_transaction_id.'/status');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Accept: application/json',
                'Authorization: Basic '.base64_encode(config('services.midtrans.server_key').':'),
            ]);
            // Batasi waktu tunggu jaringan agar respons tidak lama
            curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3); // detik
            curl_setopt($ch, CURLOPT_TIMEOUT, 7); // detik

            if (app()->environment('local') || config('app.debug')) {
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
            }

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $status = json_decode($response, true);

                if ($status && isset($status['transaction_status'])) {
                    $transactionStatus = $status['transaction_status'];
                    $fraudStatus = $status['fraud_status'] ?? null;

                    $this->handleTransactionStatus($payment, $transactionStatus, $fraudStatus);
                    // Simpan payload status terbaru dari Midtrans untuk keperluan debug/audit
                    try {
                        $payment->midtrans_response = json_encode($status);
                    } catch (\Throwable $th) {
                        $payment->midtrans_response = $response; // fallback ke raw string
                    }
                    $payment->save();
                }
            } else {
                // Simpan respons non-200 agar tetap ada jejak diagnosa
                try {
                    $payment->midtrans_response = $response ?: json_encode(['http_code' => $httpCode]);
                    $payment->save();
                } catch (\Throwable $th) {
                    // Abaikan jika gagal menyimpan
                }
            }
        } catch (\Exception $e) {
            Log::error('Error checking payment status: '.$e->getMessage());
        }

        return $payment;
    }

    /**
     * Approve payment and register user to activity
     */
    public function approvePayment(Payment $payment)
    {
        DB::beginTransaction();

        try {
            $payment->status = 'approved';
            $payment->verified_by = null; // Auto-verified by Midtrans
            $payment->verified_at = now();
            $payment->save();

            $shouldActivateUploader = true;
            $meta = null;
            if (is_string($payment->notes)) {
                $decoded = json_decode($payment->notes, true);
                if (is_array($decoded) && ! empty($decoded['bulk_import'])) {
                    $meta = $decoded;
                    $uidsMeta = (array) ($decoded['user_ids'] ?? []);
                    $shouldActivateUploader = in_array($payment->user_id, $uidsMeta);
                }
            }
            if ($shouldActivateUploader) {
                $matchAttributes = [
                    'user_id' => $payment->user_id,
                    'activity_id' => $payment->activity_id,
                ];
                if ($payment->activity_batch_id) {
                    $matchAttributes['activity_batch_id'] = $payment->activity_batch_id;
                } else {
                    $matchAttributes['activity_batch_id'] = null;
                }

                $au = ActivityUser::firstOrNew($matchAttributes);
                if (! $au->exists) {
                    $au->created_at = now();
                }

                // Ambil custom_data dari payment notes jika ada
                if ($payment->notes) {
                    $notes = json_decode($payment->notes, true);
                    if (is_array($notes) && isset($notes['custom_data'])) {
                        $au->custom_data = $notes['custom_data'];
                    }
                }

                $au->status = ActivityUser::STATUS_ACTIVE;
                $au->card_status = 'approved';
                $au->updated_at = now();
                $au->save();
            }
            if (is_array($meta)) {
                $uids = (array) ($meta['user_ids'] ?? []);
                // Filter UIDs to ensure they exist in users table
                $validUids = User::whereIn('id', $uids)->pluck('id')->toArray();
                $limit = (int) ($meta['allowed_count'] ?? count($uids));
                $count = 0;
                foreach ($validUids as $uid) {
                    if ($count >= $limit) {
                        break;
                    }
                    $bulkMatch = [
                        'user_id' => $uid,
                        'activity_id' => $payment->activity_id,
                    ];
                    // Bulk payments usually for same batch
                    if ($payment->activity_batch_id) {
                        $bulkMatch['activity_batch_id'] = $payment->activity_batch_id;
                    } else {
                        $bulkMatch['activity_batch_id'] = null;
                    }

                    $auBulk = ActivityUser::firstOrNew($bulkMatch);
                    if (! $auBulk->exists) {
                        $auBulk->created_at = now();
                    }
                    $auBulk->status = ActivityUser::STATUS_ACTIVE;
                    $auBulk->updated_at = now();
                    $auBulk->save();
                    $count++;
                }
            }

            DB::commit();

            // Antrikan email bukti pembayaran/invoice ke user
            try {
                \App\Jobs\SendPaymentReceiptMail::dispatch($payment->fresh());
                Log::info('Queued payment receipt email dispatched (midtrans approved)', [
                    'payment_id' => $payment->id,
                    'email' => $payment->user->email,
                ]);
            } catch (\Throwable $e) {
                Log::error('Failed to dispatch payment receipt email job (midtrans approved)', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);
            }

            // Antrikan WhatsApp notification
            try {
                $phone = $this->getUserPhoneNumber($payment->user);
                \App\Jobs\SendPaymentApprovedWhatsapp::dispatch($payment->fresh(), $phone);
                Log::info('Queued WhatsApp notification dispatched (midtrans approved)', [
                    'payment_id' => $payment->id,
                    'phone' => $phone,
                ]);
            } catch (\Throwable $e) {
                Log::error('Failed to dispatch WhatsApp job (midtrans approved)', [
                    'payment_id' => $payment->id,
                    'error' => $e->getMessage(),
                ]);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error approving payment: '.$e->getMessage());
            throw $e;
        }
    }

    /**
     * Lightweight API to check a single Midtrans payment status and return JSON.
     * Used by Manage Payments page to refresh pending rows without opening detail.
     */
    public function checkStatusApi(\Illuminate\Http\Request $request)
    {
        $orderId = (string) $request->query('order_id', '');
        $paymentId = (int) $request->query('payment_id', 0);

        if (! $orderId && ! $paymentId) {
            return response()->json(['ok' => false, 'message' => 'order_id atau payment_id wajib diisi'], 422);
        }

        $payment = null;
        if ($orderId) {
            $payment = Payment::where('midtrans_transaction_id', $orderId)->first();
        }
        if (! $payment && $paymentId) {
            $payment = Payment::find($paymentId);
        }

        if (! $payment) {
            return response()->json(['ok' => false, 'message' => 'Pembayaran tidak ditemukan'], 404);
        }

        if (! auth()->check()) {
            return response()->json(['ok' => false, 'message' => 'Tidak terautentik'], 401);
        }

        $user = auth()->user();
        $authorized = false;

        if ($user && (int) $user->id === (int) $payment->user_id) {
            $authorized = true;
        }

        if (! $authorized && $user) {
            if (method_exists($user, 'isAdmin') && $user->isAdmin()) {
                $authorized = true;
            } elseif (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
                $authorized = true;
            }
        }

        if (! $authorized && $user && $payment->activity) {
            $activity = $payment->activity;
            if ((int) $activity->user_id === (int) $user->id) {
                $authorized = true;
            } elseif (method_exists($activity, 'canManageRegistration') && $activity->canManageRegistration($user->id)) {
                $authorized = true;
            }
        }

        if (! $authorized) {
            return response()->json(['ok' => false, 'message' => 'Tidak memiliki izin untuk melihat status pembayaran ini'], 403);
        }

        $before = $payment->status;
        $this->checkPaymentStatus($payment);
        $payment->refresh();

        // Ambil ringkasan respons Midtrans jika ada
        $mid = [];
        if (! empty($payment->midtrans_response)) {
            try {
                $mid = json_decode($payment->midtrans_response, true) ?: [];
            } catch (\Throwable $th) {
                $mid = ['raw' => $payment->midtrans_response];
            }
        }

        return response()->json([
            'ok' => true,
            'payment_id' => $payment->id,
            'order_id' => $payment->midtrans_transaction_id,
            'status_before' => $before,
            'status_after' => $payment->status,
            'changed' => $before !== $payment->status,
            'midtrans' => [
                'transaction_status' => $mid['transaction_status'] ?? null,
                'fraud_status' => $mid['fraud_status'] ?? null,
                'status_code' => $mid['status_code'] ?? null,
            ],
        ]);
    }
}
