<?php

namespace App\Jobs;

use App\Models\Payment;
use App\Services\WhatsAppService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendPaymentApprovedWhatsapp implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The payment reference and optional phone number.
     */
    public Payment $payment;

    public ?string $phone;

    /** @var int */
    public $tries = 3;

    /** @var int|array */
    public $backoff = 10;

    /** @var int */
    public $timeout = 30;

    public function __construct(Payment $payment, ?string $phone)
    {
        $this->payment = $payment->withoutRelations();
        $this->phone = $phone;
    }

    public function handle(): void
    {
        $payment = Payment::find($this->payment->getKey());
        if (! $payment) {
            Log::warning('Payment not found when sending WhatsApp', [
                'payment_id' => $this->payment->getKey(),
            ]);

            return;
        }

        $payment->loadMissing(['user', 'activity']);

        // Derive phone if not provided
        $phone = $this->phone;
        if (! $phone) {
            $user = $payment->user;
            if ($user && $user->profile && ! empty($user->profile->no_hp)) {
                $digits = preg_replace('/[^0-9+]/', '', $user->profile->no_hp);
                if (! empty($digits) && $digits[0] === '0') {
                    $phone = '+62'.substr($digits, 1);
                } elseif (! empty($digits)) {
                    $phone = str_starts_with($digits, '+') ? $digits : ('+'.ltrim($digits, '+'));
                }
            }
        }

        try {
            $wa = new WhatsAppService;
            if ($wa->isConfigured() && ! empty($phone)) {
                $wa->sendPaymentApproved($payment, $phone);
                Log::info('Queued WhatsApp payment notification sent', [
                    'payment_id' => $payment->id,
                    'phone' => $phone,
                ]);
            } else {
                Log::info('WhatsApp not configured or phone missing for queued notification', [
                    'payment_id' => $payment->id,
                    'phone' => $phone,
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('Failed to send queued WhatsApp notification', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
