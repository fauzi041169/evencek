<?php

namespace App\Mail;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PaymentReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public Payment $payment;

    public function __construct(Payment $payment)
    {
        $this->payment = $payment->loadMissing(['user', 'activity', 'paymentMethod']);
    }

    public function build()
    {
        $subject = 'Invoice/Bukti Pembayaran - '.($this->payment->activity->name ?? 'Transaksi');

        $user = $this->payment->user;
        $activity = $this->payment->activity;
        $paymentMethod = $this->payment->paymentMethod;

        $amount = number_format((float) $this->payment->amount, 0, ',', '.');
        $method = $paymentMethod->name ?? ($this->payment->notes ?? 'Otomatis');
        $trxId = $this->payment->midtrans_transaction_id ?? ('PAY-'.$this->payment->id);
        $date = optional($this->payment->verified_at ?? $this->payment->created_at)->format('d M Y H:i');
        $note = $this->payment->verifier_note;
        $detailUrl = $activity ? route('activity.detail', $activity->id) : null;

        $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
        $html .= '<title>Invoice/Bukti Pembayaran</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111827}.container{max-width:640px;margin:0 auto;padding:16px}.card{border:1px solid #e5e7eb;border-radius:8px;padding:20px}.muted{color:#6b7280}.amount{font-weight:bold;font-size:18px}.label{width:160px;vertical-align:top;color:#374151}.value{color:#111827}.footer{font-size:12px;color:#6b7280;margin-top:24px}a.button{display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px}</style></head><body>';
        $html .= '<div class="container"><h2>Invoice / Bukti Pembayaran</h2>';
        $html .= '<p class="muted">Halo '.e($user->name ?? '-').', pembayaran Anda telah kami terima.</p>';
        $html .= '<div class="card"><table cellpadding="6" cellspacing="0">';
        $html .= '<tr><td class="label">Kegiatan</td><td class="value">'.e($activity->name ?? '-').'</td></tr>';
        $html .= '<tr><td class="label">Jumlah</td><td class="value amount">Rp '.$amount.'</td></tr>';
        $html .= '<tr><td class="label">Metode Pembayaran</td><td class="value">'.e($method).'</td></tr>';
        $html .= '<tr><td class="label">Nomor Transaksi</td><td class="value">'.e($trxId).'</td></tr>';
        $html .= '<tr><td class="label">Status</td><td class="value">'.e(ucfirst($this->payment->status)).'</td></tr>';
        $html .= '<tr><td class="label">Tanggal</td><td class="value">'.e($date).'</td></tr>';
        if ($note) {
            $html .= '<tr><td class="label">Catatan Panitia</td><td class="value">'.e($note).'</td></tr>';
        }
        $html .= '</table></div>';
        if ($detailUrl) {
            $html .= '<p style="margin-top:16px;"><a class="button" href="'.e($detailUrl).'">Lihat Detail Kegiatan</a></p>';
        }
        $html .= '<p class="footer">Jika Anda tidak merasa melakukan transaksi ini, silakan hubungi support kami.</p>';
        $html .= '<p class="footer">Email ini mungkin dilengkapi lampiran bukti pembayaran jika Anda mengunggahnya saat konfirmasi manual.</p>';
        $html .= '</div></body></html>';

        $mail = $this->subject($subject)->html($html);

        // Jika ada bukti pembayaran manual yang diunggah, lampirkan
        if (! empty($this->payment->proof_of_payment)) {
            $path = public_path('storage/'.ltrim($this->payment->proof_of_payment, '/'));
            if (is_file($path)) {
                $mail->attach($path);
            }
        }

        return $mail;
    }
}
