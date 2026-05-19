<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Midtrans\Config;
use Midtrans\Snap;
use Midtrans\Transaction;

class SubscriptionController extends Controller
{
    public function __construct()
    {
        $this->configureMidtrans();
    }

    /**
     * Configure Midtrans SDK
     */
    private function configureMidtrans()
    {
        $serverKey = config('services.midtrans.server_key');
        $clientKey = config('services.midtrans.client_key');
        $isProductionRaw = config('services.midtrans.is_production', false);
        $isProduction = filter_var($isProductionRaw, FILTER_VALIDATE_BOOLEAN);
        $disableSslRaw = config('services.midtrans.disable_ssl', false);
        $disableSsl = filter_var($disableSslRaw, FILTER_VALIDATE_BOOLEAN);

        if (empty($serverKey) || empty($clientKey)) {
            Log::warning('Midtrans keys are not configured. Midtrans features will be disabled.');
            return;
        }

        Config::$serverKey = $serverKey;
        Config::$clientKey = $clientKey;
        Config::$isProduction = $isProduction;
        Config::$isSanitized = true;
        Config::$is3ds = true;

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

            Log::warning('Midtrans SSL verification disabled via config (subscription)', [
                'is_production' => $isProduction,
                'environment' => app()->environment(),
            ]);
        }

        Log::info('Midtrans configured for subscription', [
            'is_production' => $isProduction,
            'server_key_set' => ! empty(Config::$serverKey),
            'client_key_set' => ! empty(Config::$clientKey),
            'server_key_preview' => substr(Config::$serverKey, 0, 20).'...',
            'client_key_preview' => substr(Config::$clientKey, 0, 20).'...',
            'environment' => app()->environment(),
        ]);
    }

    /**
     * Display subscription plans page
     */
    public function index()
    {
        $plans = SubscriptionPlan::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        // Append formatted_price
        $plans->transform(function ($plan) {
            $plan->formatted_price = $plan->formatted_price;

            return $plan;
        });

        // Auto-check Midtrans status untuk langganan user yang masih pending
        // agar ketika membuka halaman /subscription status langsung sinkron
        $activePlanIds = [];
        if (Auth::check()) {
            try {
                $user = Auth::user();
                $user->subscriptions()->with('plan')->get()->each(function ($sub) {
                    try {
                        if ($sub->status === 'pending' && ! empty($sub->midtrans_order_id)) {
                            $status = \Midtrans\Transaction::status($sub->midtrans_order_id);
                            $transactionStatus = $status->transaction_status ?? null;
                            $fraudStatus = $status->fraud_status ?? null;

                            if (in_array($transactionStatus, ['settlement', 'capture'], true) && ($fraudStatus === null || $fraudStatus === 'accept')) {
                                $sub->status = 'active';
                                $sub->start_date = now();
                                $sub->end_date = now()->addMonth();
                                $sub->next_billing_date = now()->addMonth();
                                // Promote owner to creator upon successful activation
                                $sub->loadMissing('user');
                                if ($sub->user) {
                                    $sub->user->subscription_id = $sub->id;
                                    $sub->user->promoteToCreatorIfEligible();
                                    $sub->user->save();
                                }
                                $sub->save();
                            } elseif (in_array($transactionStatus, ['cancel', 'deny', 'expire'], true)) {
                                $sub->status = 'cancelled';
                                $sub->save();
                            }

                            // Simpan snapshot respon Midtrans untuk audit (jika kolom tersedia)
                            try {
                                $sub->midtrans_response = (array) $status;
                                $sub->save();
                            } catch (\Throwable $ignore) {
                            }
                        }
                    } catch (\Exception $e) {
                        // Handle 404 Transaction doesn't exist
                        if (str_contains($e->getMessage(), '404') || str_contains($e->getMessage(), "Transaction doesn't exist")) {
                            $sub->status = 'cancelled'; // or 'failed' or 'not_found'
                            $sub->save();
                            \Log::warning('Transaction not found in Midtrans, marking as cancelled', [
                                'subscription_id' => $sub->id,
                                'order_id' => $sub->midtrans_order_id,
                            ]);
                        } else {
                            \Log::warning('Auto-check Midtrans status failed on subscription.index', [
                                'subscription_id' => $sub->id ?? null,
                                'order_id' => $sub->midtrans_order_id ?? null,
                                'error' => $e->getMessage(),
                            ]);
                        }
                    }
                });
            } catch (\Throwable $t) {
                \Log::warning('Bulk auto-check Midtrans failed on subscription.index', ['error' => $t->getMessage()]);
            }

            // Setelah sinkronisasi, hitung paket aktif yang belum kedaluwarsa
            $activePlanIds = Auth::user()->subscriptions()
                ->where('status', 'active')
                ->where('end_date', '>=', now())
                ->pluck('subscription_plan_id')
                ->unique()
                ->values()
                ->toArray();
        }

        $heroAnim = Setting::get('hero_animation_style', 'circles');

        $midtransStatus = null;
        if (config('app.debug')) {
            $isProductionRaw = config('services.midtrans.is_production', false);
            $midtransStatus = [
                'isProduction' => filter_var($isProductionRaw, FILTER_VALIDATE_BOOLEAN),
                'clientKeySet' => ! empty(config('services.midtrans.client_key')),
                'serverKeySet' => ! empty(config('services.midtrans.server_key')),
            ];
        }

        return Inertia::render('Subscription', [
            'plans' => $plans,
            'activePlanIds' => $activePlanIds,
            'heroAnim' => $heroAnim,
            'midtransStatus' => $midtransStatus,
        ]);
    }

    /**
     * Subscribe to a plan
     */
    public function subscribe(Request $request, $planSlug)
    {
        if (! Auth::check()) {
            return redirect()->route('login')
                ->with('error', 'Silakan login terlebih dahulu untuk berlangganan.');
        }

        $plan = SubscriptionPlan::where('slug', $planSlug)
            ->where('is_active', true)
            ->firstOrFail();

        $user = Auth::user();

        // Check if user already has active subscription
        $activeSubscription = $user->activeSubscription;
        // Jika paket yang dipilih sama dengan paket aktif, arahkan ke manage.
        // Jika paket berbeda (upgrade/downgrade), lanjutkan ke proses pembayaran.
        if ($activeSubscription && $activeSubscription->subscription_plan_id === $plan->id) {
            return redirect()->route('subscriptions.manage')
                ->with('info', 'Anda sudah memiliki langganan aktif untuk paket ini.');
        }

        // Prevent duplicate pending subscription requests: reuse existing pending for same plan
        $existingPending = Subscription::where('user_id', $user->id)
            ->where('subscription_plan_id', $plan->id)
            ->where('status', 'pending')
            ->latest()
            ->first();

        if ($existingPending) {
            // Direct user to complete existing payment instead of creating a new record
            return redirect()->route('subscriptions.payment.show', ['subscription' => $existingPending->id])
                ->with('warning', 'Pembayaran langganan sebelumnya belum selesai. Silakan selesaikan pembayaran.');
        }

        try {
            DB::beginTransaction();

            // Create subscription record
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'subscription_plan_id' => $plan->id,
                'status' => 'pending',
                'start_date' => now(),
                'end_date' => now()->addMonth(),
                'next_billing_date' => now()->addMonth(),
                'auto_renew' => true,
                'trial_ends_at' => $plan->trial_days > 0 ? now()->addDays($plan->trial_days) : null,
            ]);

            // Prepare transaction details for Midtrans
            $orderId = 'SUB-'.$subscription->id.'-'.time();

            $grossAmount = (int) $plan->price;
            $voucherCode = trim((string) request()->query('voucher', ''));
            if ($voucherCode !== '') {
                $voucher = \App\Models\Voucher::findByCode($voucherCode);
                if ($voucher && $voucher->isUsableFor('subscription')) {
                    $grossAmount = (int) $voucher->applyToAmount((int) $plan->price);
                }
            }

            // Split nama user untuk first_name dan last_name
            $nameParts = explode(' ', trim($user->name), 2);
            $firstName = $nameParts[0];
            $lastName = isset($nameParts[1]) ? $nameParts[1] : '';

            // Jika firstName terlalu panjang, potong
            if (strlen($firstName) > 50) {
                $firstName = substr($firstName, 0, 50);
            }
            if (strlen($lastName) > 50) {
                $lastName = substr($lastName, 0, 50);
            }

            $transactionDetails = [
                'transaction_details' => [
                    'order_id' => $orderId,
                    'gross_amount' => $grossAmount,
                ],
                // Pastikan Midtrans mengirim webhook ke aplikasi kita
                'notification_url' => route('subscriptions.payment.notification'),
                'customer_details' => [
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $user->email,
                    'phone' => $this->getUserPhoneNumber($user),
                ],
                'item_details' => [
                    [
                        'id' => (string) $plan->id,
                        'price' => $grossAmount,
                        'quantity' => 1,
                        'name' => substr($plan->name.' - Langganan Bulanan', 0, 50),
                    ],
                ],
                // Redirect callbacks agar pengguna kembali ke halaman kita
                'callbacks' => [
                    'finish' => route('subscriptions.finish'),
                    'unfinish' => route('subscriptions.unfinish'),
                    'error' => route('subscriptions.error'),
                ],
            ];

            // Tambahkan recurring untuk subscription (opsional, bisa dihapus jika menyebabkan error)
            // Untuk pertama kali subscription, mungkin tidak perlu recurring
            // Recurring biasanya untuk subscription yang sudah aktif
            // Untuk sekarang, kita akan menghapus recurring untuk menghindari error
            // Recurring akan diatur setelah pembayaran pertama berhasil

            // Log transaction details untuk debugging
            Log::info('Subscription transaction details prepared', [
                'order_id' => $orderId,
                'gross_amount' => $grossAmount,
                'plan_name' => $plan->name,
                'plan_price' => $plan->price,
                'customer_email' => $user->email,
                'customer_name' => $user->name,
                'transaction_details' => $transactionDetails,
            ]);

            // Create Snap token
            try {
                // Validasi transaction details sebelum kirim ke Midtrans
                $this->validateTransactionDetails($transactionDetails);

                // Log sebelum memanggil Midtrans API
                Log::info('Calling Midtrans Snap API for subscription', [
                    'order_id' => $orderId,
                    'gross_amount' => $grossAmount,
                    'has_recurring' => isset($transactionDetails['recurring']),
                ]);

                $snapToken = Snap::getSnapToken($transactionDetails);

                if (empty($snapToken)) {
                    throw new \Exception('Snap token kosong dari Midtrans API');
                }

                Log::info('Snap token created successfully', [
                    'subscription_id' => $subscription->id,
                    'token_length' => strlen($snapToken),
                    'token_preview' => substr($snapToken, 0, 20).'...',
                ]);
            } catch (\Midtrans\Exception $e) {
                DB::rollBack();
                Log::error('Midtrans exception creating Snap token', [
                    'plan_id' => $plan->id,
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                    'code' => $e->getCode(),
                    'trace' => $e->getTraceAsString(),
                    'transaction_details' => $transactionDetails,
                ]);

                // Tampilkan error message yang lebih informatif
                $message = $e->getMessage();
                $errorMessage = 'Terjadi kesalahan saat membuat token pembayaran.';
                // Deteksi unauthorized/401 yang umum terjadi bila kunci sandbox/production tidak cocok
                if ($e->getCode() == 401 || stripos($message, 'unauthorized') !== false) {
                    $errorMessage = 'Konfigurasi Midtrans tidak valid (401). Periksa MIDTRANS_SERVER_KEY/MIDTRANS_CLIENT_KEY dan pastikan MIDTRANS_IS_PRODUCTION sesuai (sandbox=false, production=true).';
                } elseif (stripos($message, 'recurring') !== false) {
                    $errorMessage .= ' (Error terkait recurring payment)';
                } else {
                    $errorMessage .= ' Detail: '.$message;
                }

                return redirect()->back()
                    ->with('error', $errorMessage);
            } catch (\Exception $e) {
                DB::rollBack();
                Log::error('Error creating Snap token', [
                    'plan_id' => $plan->id,
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                    'error_class' => get_class($e),
                    'trace' => $e->getTraceAsString(),
                    'transaction_details' => $transactionDetails,
                ]);

                // Tampilkan error message yang lebih informatif
                $errorMessage = 'Terjadi kesalahan saat membuat token pembayaran: '.$e->getMessage();

                return redirect()->back()
                    ->with('error', $errorMessage);
            }

            // Update subscription with Midtrans data
            $subscription->midtrans_order_id = $orderId;
            $subscription->midtrans_payment_token = $snapToken;
            $subscription->save();

            DB::commit();

            return Inertia::render('Payments/SubscriptionPayment', [
                'subscription' => $subscription,
                'plan' => $plan,
                'snapToken' => $snapToken,
                'midtransClientKey' => config('services.midtrans.client_key'),
                'midtransIsProduction' => (bool) config('services.midtrans.is_production', false),
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error creating subscription: '.$e->getMessage());

            return redirect()->back()
                ->with('error', 'Terjadi kesalahan saat membuat langganan: '.$e->getMessage());
        }
    }

    /**
     * Handle subscription payment notification from Midtrans
     */
    public function handleNotification(Request $request)
    {
        try {
            $notification = json_decode($request->getContent(), true);

            if (empty($notification)) {
                $notification = $request->all();
            }

            Log::info('Subscription notification received', ['notification' => $notification]);

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
                    Log::warning('Midtrans signature mismatch', [
                        'order_id' => $notification['order_id'] ?? null,
                        'status_code' => $notification['status_code'] ?? null,
                        'gross_amount' => $notification['gross_amount'] ?? null,
                    ]);

                    return response()->json(['status' => 'error', 'message' => 'Invalid signature'], 403);
                }
            }

            $orderId = $notification['order_id'] ?? null;
            if (! $orderId || ! str_starts_with($orderId, 'SUB-')) {
                return response()->json(['status' => 'ignored'], 200);
            }

            // Extract subscription ID from order ID
            $parts = explode('-', $orderId);
            $subscriptionId = $parts[1] ?? null;

            if (! $subscriptionId) {
                return response()->json(['status' => 'error', 'message' => 'Invalid order ID'], 400);
            }

            $subscription = Subscription::find($subscriptionId);
            if (! $subscription) {
                return response()->json(['status' => 'error', 'message' => 'Subscription not found'], 404);
            }

            $grossAmount = $notification['gross_amount'] ?? null;
            $transactionStatus = $notification['transaction_status'] ?? null;
            $fraudStatus = $notification['fraud_status'] ?? null;

            $subscription->loadMissing('plan');
            $expectedAmount = (int) ($subscription->plan->price ?? 0);
            if ($grossAmount !== null && (int) $grossAmount > $expectedAmount) {
                Log::error('Amount mismatch', [
                    'expected' => $expectedAmount,
                    'received' => $grossAmount,
                ]);

                return response()->json(['status' => 'error', 'message' => 'Amount mismatch'], 400);
            }

            DB::beginTransaction();

            // Update subscription based on transaction status
            if ($transactionStatus == 'settlement' || $transactionStatus == 'capture') {
                if ($fraudStatus == 'accept') {
                    $subscription->status = 'active';
                    $subscription->start_date = now();
                    $subscription->end_date = now()->addMonth();
                    $subscription->next_billing_date = now()->addMonth();

                    // Update user subscription
                    $user = $subscription->user;
                    if ($user) {
                        $user->subscription_id = $subscription->id;
                        $user->promoteToCreatorIfEligible();
                        $user->save();
                    }

                    Log::info('Subscription activated', [
                        'subscription_id' => $subscription->id,
                        'user_id' => $subscription->user_id,
                    ]);
                }
            } elseif ($transactionStatus == 'cancel' || $transactionStatus == 'deny' || $transactionStatus == 'expire') {
                $subscription->status = 'cancelled';
            }

            $subscription->midtrans_response = $notification;
            $subscription->save();

            DB::commit();

            return response()->json(['status' => 'success'], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error processing subscription notification: '.$e->getMessage());

            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    /**
     * Handle subscription payment callback (finish)
     */
    public function finish(Request $request)
    {
        $orderId = $request->input('order_id');

        if (! $orderId || ! str_starts_with($orderId, 'SUB-')) {
            return redirect()->route('subscriptions.pricing')
                ->with('error', 'Order ID tidak valid.');
        }

        $parts = explode('-', $orderId);
        $subscriptionId = $parts[1] ?? null;

        if (! $subscriptionId) {
            return redirect()->route('subscriptions.pricing')
                ->with('error', 'Langganan tidak ditemukan.');
        }

        $subscription = Subscription::find($subscriptionId);
        if (! $subscription || $subscription->user_id !== Auth::id()) {
            return redirect()->route('subscriptions.pricing')
                ->with('error', 'Langganan tidak ditemukan.');
        }

        // Check payment status from Midtrans
        try {
            $status = Transaction::status($orderId);
            $transactionStatus = $status->transaction_status ?? null;

            if ($transactionStatus == 'settlement' || $transactionStatus == 'capture') {
                $subscription->status = 'active';
                $subscription->start_date = now();
                $subscription->end_date = now()->addMonth();
                $subscription->next_billing_date = now()->addMonth();
                $user = $subscription->user;
                if ($user) {
                    $user->subscription_id = $subscription->id;
                    $user->promoteToCreatorIfEligible();
                    $user->save();
                }
                $subscription->save();

                return redirect()->route('subscriptions.manage')
                    ->with('success', 'Langganan berhasil diaktifkan!');
            } elseif ($transactionStatus == 'pending') {
                return redirect()->route('subscriptions.manage')
                    ->with('info', 'Pembayaran sedang diproses. Langganan akan diaktifkan setelah pembayaran berhasil.');
            } else {
                return redirect()->route('subscriptions.manage')
                    ->with('error', 'Pembayaran gagal atau dibatalkan.');
            }
        } catch (\Exception $e) {
            Log::error('Error checking subscription payment status: '.$e->getMessage());

            return redirect()->route('subscriptions.manage')
                ->with('error', 'Terjadi kesalahan saat memeriksa status pembayaran.');
        }
    }

    /**
     * Handle subscription payment unfinish
     */
    public function unfinish(Request $request)
    {
        // Ambil order_id dari query atau session
        $orderId = $request->input('order_id') ?? session('subscription_order_id');

        if ($orderId && str_starts_with($orderId, 'SUB-')) {
            // Extract subscription ID from order ID
            $parts = explode('-', $orderId);
            $subscriptionId = $parts[1] ?? null;

            if ($subscriptionId) {
                $subscription = Subscription::find($subscriptionId);

                if ($subscription && $subscription->user_id === Auth::id()) {
                    // Cek apakah subscription masih pending
                    if ($subscription->status === 'pending' && $subscription->midtrans_payment_token) {
                        // Redirect kembali ke halaman payment dengan pesan
                        return redirect()->route('subscriptions.payment.show', [
                            'subscription' => $subscription->id,
                        ])->with('warning', 'Pembayaran belum selesai. Silakan selesaikan pembayaran Anda.');
                    }
                }
            }
        }

        // Fallback jika tidak ada order_id atau subscription tidak ditemukan
        return redirect()->route('subscriptions.pricing')
            ->with('warning', 'Pembayaran belum selesai. Silakan coba lagi.');
    }

    /**
     * Handle subscription payment error
     */
    public function error(Request $request)
    {
        // Ambil order_id dari query atau session
        $orderId = $request->input('order_id') ?? session('subscription_order_id');
        $reason = strtolower((string) $request->input('reason'));
        $isNonCritical = in_array($reason, ['expire', 'expired', 'cancel', 'closed', 'close']);

        if ($orderId && str_starts_with($orderId, 'SUB-')) {
            // Extract subscription ID from order ID
            $parts = explode('-', $orderId);
            $subscriptionId = $parts[1] ?? null;

            if ($subscriptionId) {
                $subscription = Subscription::find($subscriptionId);

                if ($subscription && $subscription->user_id === Auth::id()) {
                    // Cek apakah subscription masih pending
                    if ($subscription->status === 'pending' && $subscription->midtrans_payment_token) {
                        // Redirect kembali ke halaman payment dengan pesan sesuai jenis kesalahan
                        if ($isNonCritical) {
                            return redirect()->route('subscriptions.payment.show', [
                                'subscription' => $subscription->id,
                            ])->with('warning', 'Transaksi tidak selesai ('.($reason ?: 'unknown').'). Jika kedaluwarsa, klik "Buat Ulang Pembayaran" untuk membuat token baru.');
                        }

                        return redirect()->route('subscriptions.payment.show', [
                            'subscription' => $subscription->id,
                        ])->with('error', 'Terjadi kesalahan saat melakukan pembayaran. Silakan selesaikan pembayaran Anda.');
                    }
                }
            }
        }

        // Fallback jika tidak ada order_id atau subscription tidak ditemukan
        if ($isNonCritical) {
            return redirect()->route('subscriptions.pricing')
                ->with('warning', 'Pembayaran tidak selesai ('.($reason ?: 'unknown').'). Silakan coba lagi.');
        }

        return redirect()->route('subscriptions.pricing')
            ->with('error', 'Terjadi kesalahan saat melakukan pembayaran.');
    }

    /**
     * Show payment page for existing subscription
     */
    public function showPayment(Subscription $subscription)
    {
        // Check authentication & ownership more gracefully
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('login')
                ->with('error', 'Silakan login untuk mengakses halaman pembayaran langganan.');
        }

        // Allow privileged roles (admin/superadmin) to access any subscription payment page
        $isPrivileged = (
            (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) ||
            (method_exists($user, 'isAdmin') && $user->isAdmin()) ||
            (method_exists($user, 'hasPermission') && $user->hasPermission('manage_subscriptions'))
        );

        if ((int) $subscription->user_id !== (int) $user->id && ! $isPrivileged) {
            Log::warning('Unauthorized access to subscription payment', [
                'subscription_id' => $subscription->id,
                'subscription_user_id' => $subscription->user_id,
                'auth_id' => $user->id,
            ]);

            return redirect()->route('subscriptions.manage')
                ->with('error', 'Anda tidak memiliki akses ke langganan ini.');
        } elseif ($isPrivileged && (int) $subscription->user_id !== (int) $user->id) {
            Log::info('Privileged user accessing subscription payment', [
                'subscription_id' => $subscription->id,
                'subscription_user_id' => $subscription->user_id,
                'auth_id' => $user->id,
                'role' => method_exists($user, 'role') ? $user->role : null,
            ]);
        }

        // Check if subscription is pending
        if ($subscription->status !== 'pending') {
            return redirect()->route('subscriptions.manage')
                ->with('info', 'Langganan ini sudah tidak dalam status pending.');
        }

        $plan = $subscription->plan;

        // Get snap token from subscription or create new one
        $snapToken = $subscription->midtrans_payment_token;

        // If no token, create new one
        if (empty($snapToken)) {
            try {
                // Prepare transaction details
                $orderId = $subscription->midtrans_order_id ?? 'SUB-'.$subscription->id.'-'.time();
                $grossAmount = (int) $plan->price;
                $voucherCode = trim((string) request()->query('voucher', ''));
                if ($voucherCode !== '') {
                    $voucher = \App\Models\Voucher::findByCode($voucherCode);
                    if ($voucher && $voucher->isUsableFor('subscription')) {
                        $grossAmount = (int) $voucher->applyToAmount((int) $plan->price);
                    }
                }

                // Use subscription owner as customer for Midtrans, not the admin who opens the page
                $subscription->loadMissing('user');
                $customer = $subscription->user ?: Auth::user();
                $safeName = trim((string) ($customer->name ?? 'Customer'));
                $nameParts = explode(' ', $safeName, 2);
                $firstName = $nameParts[0] ?? 'Customer';
                $lastName = isset($nameParts[1]) ? $nameParts[1] : '';

                if (strlen($firstName) > 50) {
                    $firstName = substr($firstName, 0, 50);
                }
                if (strlen($lastName) > 50) {
                    $lastName = substr($lastName, 0, 50);
                }

                $transactionDetails = [
                    'transaction_details' => [
                        'order_id' => $orderId,
                        'gross_amount' => $grossAmount,
                    ],
                    // Pastikan Midtrans mengirim webhook ke aplikasi kita
                    'notification_url' => route('subscriptions.payment.notification'),
                    'customer_details' => [
                        'first_name' => $firstName,
                        'last_name' => $lastName,
                        'email' => (string) ($customer->email ?? ''),
                        'phone' => $this->getUserPhoneNumber($customer),
                    ],
                    'item_details' => [
                        [
                            'id' => (string) $plan->id,
                            'price' => $grossAmount,
                            'quantity' => 1,
                            'name' => substr($plan->name.' - Langganan Bulanan', 0, 50),
                        ],
                    ],
                    // Redirect callbacks agar pengguna kembali ke halaman kita
                    'callbacks' => [
                        'finish' => route('subscriptions.finish'),
                        'unfinish' => route('subscriptions.unfinish'),
                        'error' => route('subscriptions.error'),
                    ],
                ];

                $this->validateTransactionDetails($transactionDetails);
                $snapToken = Snap::getSnapToken($transactionDetails);

                // Update subscription with new token
                $subscription->midtrans_order_id = $orderId;
                $subscription->midtrans_payment_token = $snapToken;
                $subscription->save();
            } catch (\Midtrans\Exception $e) {
                // Tangani error khusus dari Midtrans dengan pesan yang lebih jelas
                $message = $e->getMessage();
                Log::error('Midtrans exception creating Snap token for existing subscription', [
                    'subscription_id' => $subscription->id,
                    'error' => $message,
                    'code' => $e->getCode(),
                ]);

                $userMessage = 'Terjadi kesalahan saat membuat token pembayaran.';
                if ($e->getCode() == 401 || strpos(strtolower($message), 'unauthorized') !== false) {
                    $userMessage = 'Konfigurasi Midtrans tidak valid (401). Periksa MIDTRANS_SERVER_KEY/MIDTRANS_CLIENT_KEY dan environment sandbox/production di file .env.';
                }

                return redirect()->route('subscriptions.pricing')
                    ->with('error', $userMessage);
            } catch (\Exception $e) {
                Log::error('Error creating Snap token for existing subscription', [
                    'subscription_id' => $subscription->id,
                    'error' => $e->getMessage(),
                ]);

                return redirect()->route('subscriptions.pricing')
                    ->with('error', 'Terjadi kesalahan saat membuat token pembayaran. Silakan coba lagi.');
            }
        }

        return Inertia::render('Payments/SubscriptionPayment', [
            'subscription' => $subscription,
            'plan' => $plan,
            'snapToken' => $snapToken,
            'midtransClientKey' => config('services.midtrans.client_key'),
            'midtransIsProduction' => (bool) config('services.midtrans.is_production', false),
        ]);
    }

    /**
     * Retry payment: clear expired token/order and regenerate a new Snap token
     */
    public function retryPayment(Subscription $subscription)
    {
        $user = Auth::user();
        if (! $user) {
            return redirect()->route('login')
                ->with('error', 'Silakan login untuk mencoba ulang pembayaran.');
        }

        // Allow privileged roles to assist users
        $isPrivileged = (
            (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) ||
            (method_exists($user, 'isAdmin') && $user->isAdmin()) ||
            (method_exists($user, 'hasPermission') && $user->hasPermission('manage_subscriptions'))
        );

        if ((int) $subscription->user_id !== (int) $user->id && ! $isPrivileged) {
            return redirect()->route('subscriptions.manage')
                ->with('error', 'Anda tidak memiliki akses ke langganan ini.');
        }

        // Only allow retry for pending subscriptions
        if ($subscription->status !== 'pending') {
            return redirect()->route('subscriptions.manage')
                ->with('info', 'Langganan ini sudah tidak dalam status pending.');
        }

        // Clear previous Midtrans identifiers so showPayment regenerates a fresh token
        $subscription->midtrans_order_id = null;
        $subscription->midtrans_payment_token = null;
        $subscription->save();

        return redirect()->route('subscriptions.payment.show', ['subscription' => $subscription->id])
            ->with('info', 'Token pembayaran diperbarui. Silakan lanjutkan pembayaran.');
    }

    /**
     * Manage subscription page
     */
    public function manage()
    {
        $user = Auth::user();
        $activeSubscription = $user->activeSubscription;
        $subscriptions = $user->subscriptions()->with('plan')->orderBy('created_at', 'desc')->get();
        $plans = SubscriptionPlan::where('is_active', true)->orderBy('sort_order')->get();

        // Auto-check Midtrans status untuk langganan user yang masih pending
        // sehingga tidak perlu validasi manual admin
        try {
            $subscriptions->each(function ($sub) {
                try {
                    if ($sub->status === 'pending' && ! empty($sub->midtrans_order_id)) {
                        $status = \Midtrans\Transaction::status($sub->midtrans_order_id);
                        $transactionStatus = $status->transaction_status ?? null;
                        $fraudStatus = $status->fraud_status ?? null;

                        if (in_array($transactionStatus, ['settlement', 'capture'], true) && ($fraudStatus === null || $fraudStatus === 'accept')) {
                            $sub->status = 'active';
                            $sub->start_date = now();
                            $sub->end_date = now()->addMonth();
                            $sub->next_billing_date = now()->addMonth();
                            // Promote owner to creator
                            $sub->loadMissing('user');
                            if ($sub->user) {
                                $sub->user->subscription_id = $sub->id;
                                $sub->user->promoteToCreatorIfEligible();
                                $sub->user->save();
                            }
                            $sub->save();
                        } elseif (in_array($transactionStatus, ['cancel', 'deny', 'expire'], true)) {
                            $sub->status = 'cancelled';
                            $sub->save();
                        }

                        // Simpan snapshot respon Midtrans untuk audit
                        try {
                            $sub->midtrans_response = (array) $status;
                            $sub->save();
                        } catch (\Throwable $ignore) {
                            // Abaikan jika kolom tidak ada
                        }
                    }
                } catch (\Exception $e) {
                    \Log::warning('Auto-check Midtrans status failed on subscription.manage', [
                        'subscription_id' => $sub->id ?? null,
                        'order_id' => $sub->midtrans_order_id ?? null,
                        'error' => $e->getMessage(),
                    ]);
                }
            });
        } catch (\Throwable $t) {
            \Log::warning('Bulk auto-check Midtrans failed on subscription.manage', ['error' => $t->getMessage()]);
        }

        return Inertia::render('Payments/ManageSubscriptions', compact('activeSubscription', 'subscriptions', 'plans'));
    }

    /**
     * Cancel subscription
     */
    public function cancel(Request $request, Subscription $subscription)
    {
        if ($subscription->user_id !== Auth::id()) {
            abort(403, 'Unauthorized');
        }

        $subscription->cancel($request->input('reason'));

        return redirect()->route('subscriptions.manage')
            ->with('success', 'Langganan berhasil dibatalkan.');
    }

    /**
     * Renew subscription manually
     */
    public function renew(Subscription $subscription)
    {
        if ($subscription->user_id !== Auth::id()) {
            abort(403, 'Unauthorized');
        }

        if ($subscription->isExpired()) {
            $subscription->renew();

            return redirect()->route('subscriptions.manage')
                ->with('success', 'Langganan berhasil diperpanjang.');
        }

        return redirect()->route('subscriptions.manage')
            ->with('error', 'Langganan belum kedaluwarsa.');
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

        // Fallback jika tidak ada nomor HP
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

        if (! empty($errors)) {
            Log::error('Transaction details validation failed', [
                'errors' => $errors,
                'transaction_details' => $transactionDetails,
            ]);
            throw new \Exception('Invalid transaction details: '.implode(', ', $errors));
        }
    }

    /**
     * Admin/Superadmin: Manajemen pembayaran langganan (UI serupa halaman Manajemen Pembayaran kegiatan)
     */
    public function managePaymentsAdmin(Request $request)
    {
        $user = Auth::user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin() || $user->hasPermission('view_payments'))) {
            abort(403, 'Anda tidak memiliki akses ke halaman manajemen langganan');
        }

        $query = Subscription::with(['user', 'plan']);

        // Filter: status (pending, active, cancelled, expired)
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        // Filter: tipe pembayaran (midtrans, manual, gratis)
        if ($request->filled('payment_type')) {
            $type = $request->string('payment_type');
            if ($type === 'midtrans') {
                $query->where(function ($q) {
                    $q->whereNotNull('midtrans_order_id')
                        ->orWhereNotNull('midtrans_payment_token');
                });
            } elseif ($type === 'manual') {
                $query->whereNull('midtrans_order_id')
                    ->whereNull('midtrans_payment_token')
                    ->whereHas('plan', function ($q) {
                        $q->where('price', '>', 0);
                    });
            } elseif ($type === 'gratis') {
                $query->whereHas('plan', function ($q) {
                    $q->where('price', 0);
                });
            }
        }

        // Pencarian: nama/email user atau nama paket
        if ($request->filled('search')) {
            $search = trim($request->string('search'));
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })->orWhereHas('plan', function ($pq) use ($search) {
                    $pq->where('name', 'like', "%{$search}%");
                });
            });
        }

        // Sort: created_at (default), end_date, atau start_date
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $allowedSort = ['created_at', 'end_date', 'start_date'];
        if (! in_array($sortBy, $allowedSort)) {
            $sortBy = 'created_at';
        }
        $query->orderBy($sortBy, $sortOrder === 'asc' ? 'asc' : 'desc');

        $subscriptions = $query->paginate(20)->withQueryString();

        // Auto-check Midtrans status for visible pending subscriptions
        // This ensures subscription status follows Midtrans without admin validation
        try {
            $subscriptions->getCollection()->each(function ($sub) {
                try {
                    if ($sub->status === 'pending' && ! empty($sub->midtrans_order_id)) {
                        $status = Transaction::status($sub->midtrans_order_id);
                        $transactionStatus = $status->transaction_status ?? null;
                        $fraudStatus = $status->fraud_status ?? null;

                        if (in_array($transactionStatus, ['settlement', 'capture'], true) && ($fraudStatus === null || $fraudStatus === 'accept')) {
                            $sub->status = 'active';
                            $sub->start_date = now();
                            $sub->end_date = now()->addMonth();
                            $sub->next_billing_date = now()->addMonth();
                            // Promote owner to creator
                            $sub->loadMissing('user');
                            if ($sub->user) {
                                $sub->user->subscription_id = $sub->id;
                                $sub->user->promoteToCreatorIfEligible();
                                $sub->user->save();
                            }
                            $sub->save();
                        } elseif (in_array($transactionStatus, ['cancel', 'deny', 'expire'], true)) {
                            $sub->status = 'cancelled';
                            $sub->save();
                        }

                        // Persist latest response snapshot for auditing
                        $sub->midtrans_response = (array) $status;
                        $sub->save();
                    }
                } catch (\Exception $e) {
                    Log::warning('Auto-check Midtrans status failed for subscription', [
                        'subscription_id' => $sub->id ?? null,
                        'order_id' => $sub->midtrans_order_id ?? null,
                        'error' => $e->getMessage(),
                    ]);
                }
            });
        } catch (\Throwable $t) {
            Log::warning('Bulk auto-check Midtrans failed in managePaymentsAdmin', ['error' => $t->getMessage()]);
        }

        // Statistik global (tanpa filter), mirip PaymentController@manage
        $stats = [
            'total' => Subscription::count(),
            'pending' => Subscription::where('status', 'pending')->count(),
            'approved' => Subscription::where('status', 'active')->count(),
            'rejected' => Subscription::where('status', 'cancelled')->count(),
            'midtrans' => Subscription::whereNotNull('midtrans_order_id')->orWhereNotNull('midtrans_payment_token')->count(),
            'manual' => Subscription::whereNull('midtrans_order_id')->whereNull('midtrans_payment_token')->count(),
            // Pembagian langganan aktif berdasarkan cara pembayaran
            'approved_paid' => Subscription::where('status', 'active')
                ->where(function ($q) {
                    $q->whereNotNull('midtrans_order_id')
                        ->orWhereNotNull('midtrans_payment_token');
                })
                ->count(),
            'approved_gift' => Subscription::where('status', 'active')
                ->whereNull('midtrans_order_id')
                ->whereNull('midtrans_payment_token')
                ->count(),
            'total_amount' => Subscription::with('plan')
                ->where('status', 'active')
                ->where(function ($q) {
                    $q->whereNotNull('midtrans_order_id')
                        ->orWhereNotNull('midtrans_payment_token');
                })
                ->get()
                ->sum(function ($s) {
                    return (float) ($s->plan->price ?? 0);
                }),
        ];

        return Inertia::render('Payments/SubscriptionManagePayments', [
            'subscriptions' => $subscriptions,
            'stats' => $stats,
        ]);
    }

    /**
     * Admin/Superadmin: Update status pembayaran langganan secara manual
     */
    public function updatePaymentStatus(Request $request, Subscription $subscription)
    {
        $user = Auth::user();
        if (! $user || ! ($user->isAdmin() || $user->isSuperAdmin())) {
            abort(403, 'Anda tidak memiliki akses untuk mengubah status langganan');
        }

        // Prevent manual status changes for Midtrans-based subscriptions
        if (! empty($subscription->midtrans_order_id) || ! empty($subscription->midtrans_payment_token)) {
            return redirect()->back()->with('error', 'Status langganan dengan pembayaran Midtrans divalidasi otomatis dari Midtrans. Perubahan manual dinonaktifkan.');
        }

        $validated = $request->validate([
            'status' => 'required|in:active,cancelled',
            'reason' => 'nullable|string|max:255',
        ]);

        $oldStatus = $subscription->status;
        $newStatus = $validated['status'];

        if ($oldStatus === $newStatus) {
            return redirect()->back()->with('info', 'Status langganan sudah '.$newStatus.'.');
        }

        try {
            DB::beginTransaction();

            if ($newStatus === 'active') {
                $subscription->status = 'active';
                $subscription->start_date = now();
                // Default masa aktif 1 bulan; bisa disesuaikan dengan durasi paket
                $subscription->end_date = now()->addMonth();
                $subscription->next_billing_date = now()->addMonth();
                $subscription->auto_renew = true;

                // Tandai di user jika diperlukan
                if ($subscription->user) {
                    $user = $subscription->user;
                    $user->subscription_id = $subscription->id;
                    $user->promoteToCreatorIfEligible();
                    $user->save();
                }
            } else { // cancelled
                $subscription->status = 'cancelled';
                $subscription->auto_renew = false;
            }

            // Simpan alasan/notes jika ada
            if (! empty($validated['reason'])) {
                $notes = trim((string) $validated['reason']);
                $subscription->notes = isset($subscription->notes) && ! empty($subscription->notes)
                    ? ($subscription->notes.' | Admin: '.$notes)
                    : ('Admin: '.$notes);
            }

            $subscription->save();

            DB::commit();

            return redirect()->back()->with('success', 'Status langganan berhasil diubah menjadi '.$newStatus.'.');
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Gagal mengubah status langganan', [
                'subscription_id' => $subscription->id,
                'error' => $e->getMessage(),
            ]);

            return redirect()->back()->with('error', 'Gagal mengubah status: '.$e->getMessage());
        }
    }
}
