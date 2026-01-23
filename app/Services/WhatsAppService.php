<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppService
{
    private bool $enabled;

    private ?string $token;

    private ?string $phoneNumberId;

    private string $senderName;

    public function __construct()
    {
        $this->enabled = (bool) config('services.whatsapp.enabled');
        $this->token = config('services.whatsapp.token');
        $this->phoneNumberId = config('services.whatsapp.phone_number_id');
        $this->senderName = (string) config('services.whatsapp.sender_name', config('app.name'));
    }

    public function isConfigured(): bool
    {
        return $this->enabled && ! empty($this->token) && ! empty($this->phoneNumberId);
    }

    public function sendText(string $toPhoneE164, string $message): bool
    {
        if (! $this->isConfigured()) {
            Log::info('WhatsApp not configured or disabled. Skipping send.');

            return false;
        }

        try {
            $url = 'https://graph.facebook.com/v19.0/'.$this->phoneNumberId.'/messages';

            $payload = [
                'messaging_product' => 'whatsapp',
                'to' => $toPhoneE164,
                'type' => 'text',
                'text' => [
                    'preview_url' => false,
                    'body' => $message,
                ],
            ];

            $response = Http::withToken($this->token)
                ->acceptJson()
                ->post($url, $payload);

            if ($response->successful()) {
                Log::info('WhatsApp message sent', [
                    'to' => $toPhoneE164,
                    'sender' => $this->phoneNumberId,
                ]);

                return true;
            }

            Log::error('Failed to send WhatsApp message', [
                'to' => $toPhoneE164,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        } catch (\Throwable $e) {
            Log::error('WhatsApp send error: '.$e->getMessage());

            return false;
        }
    }

    public function sendPaymentApproved(Payment $payment, string $toPhoneE164): bool
    {
        $activityName = $payment->activity->name ?? 'Kegiatan';
        $amount = number_format((float) $payment->amount, 0, ',', '.');
        $tx = $payment->midtrans_transaction_id ?? ('PAY-'.$payment->id);
        $status = ucfirst($payment->status);
        $sender = $this->senderName;

        $lines = [
            "[$sender] Bukti Pembayaran",
            "Halo {$payment->user->name},",
            'Pembayaran Anda telah diterima.',
            '',
            "Kegiatan: $activityName",
            "Jumlah: Rp $amount",
            "Status: $status",
            "Transaksi: $tx",
        ];

        $note = $payment->verifier_note;
        if (is_string($note) && trim($note) !== '') {
            $lines[] = '';
            $lines[] = 'Catatan panitia:';
            $lines[] = $note;
        }

        if ($payment->activity_id) {
            $lines[] = 'Detail: '.route('activity.detail', $payment->activity_id);
        }

        return $this->sendText($toPhoneE164, implode("\n", $lines));
    }
}
