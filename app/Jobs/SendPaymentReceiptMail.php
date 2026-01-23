<?php

namespace App\Jobs;

use App\Mail\PaymentReceiptMail;
use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class SendPaymentReceiptMail implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The payment model reference.
     */
    public Payment $payment;

    /** @var int */
    public $tries = 3;

    /** @var int|array */
    public $backoff = 10;

    /** @var int */
    public $timeout = 30;

    public function __construct(Payment $payment)
    {
        // Serialize only the identifier and basic attributes
        $this->payment = $payment->withoutRelations();
    }

    public function handle(): void
    {
        $payment = Payment::find($this->payment->getKey());
        if (! $payment) {
            Log::warning('Payment not found when sending receipt mail', [
                'payment_id' => $this->payment->getKey(),
            ]);

            return;
        }

        $payment->loadMissing(['user', 'activity', 'paymentMethod']);

        try {
            Mail::to($payment->user->email)->send(new PaymentReceiptMail($payment));
            Log::info('Queued payment receipt email sent', [
                'payment_id' => $payment->id,
                'email' => $payment->user->email,
            ]);
        } catch (\Throwable $e) {
            Log::error('Failed to send queued payment receipt email', [
                'payment_id' => $payment->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
