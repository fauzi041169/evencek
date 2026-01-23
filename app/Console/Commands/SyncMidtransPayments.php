<?php

namespace App\Console\Commands;

use App\Http\Controllers\MidtransPaymentController;
use App\Models\Payment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class SyncMidtransPayments extends Command
{
    protected $signature = 'midtrans:sync-payments {--order_id=} {--user_id=} {--activity_id=} {--dry-run}';

    protected $description = 'Sinkronisasi status pembayaran kegiatan dari Midtrans untuk mengatasi pending yang sudah dibayar';

    public function handle(): int
    {
        $orderId = $this->option('order_id');
        $userId = $this->option('user_id');
        $activityId = $this->option('activity_id');
        $dryRun = (bool) $this->option('dry-run');

        $query = Payment::query()
            ->whereNotNull('midtrans_transaction_id')
            ->where('status', 'pending');

        if ($orderId) {
            $query->where('midtrans_transaction_id', $orderId);
        }
        if ($userId) {
            $query->where('user_id', (int) $userId);
        }
        if ($activityId) {
            $query->where('activity_id', (int) $activityId);
        }

        $payments = $query->get();
        if ($payments->isEmpty()) {
            $this->info('Tidak ada pembayaran pending yang cocok dengan filter.');

            return Command::SUCCESS;
        }

        $controller = new MidtransPaymentController;
        $success = 0;
        $errors = 0;

        $this->line(sprintf('Memproses %d pembayaran pending...', $payments->count()));

        foreach ($payments as $payment) {
            try {
                $this->line(sprintf('- %s (user:%d activity:%d amount:%d)',
                    $payment->midtrans_transaction_id,
                    $payment->user_id,
                    $payment->activity_id,
                    (int) $payment->amount
                ));

                if ($dryRun) {
                    $success++;

                    continue;
                }

                // Gunakan helper existing untuk tarik status via Midtrans API
                $controller->checkPaymentStatus($payment);
                $payment->refresh();

                $this->line('  -> status: '.$payment->status);
                if ($payment->status === 'approved') {
                    $success++;
                } else {
                    $errors++;
                }
            } catch (\Throwable $e) {
                $errors++;
                Log::error('SyncMidtransPayments error', [
                    'payment_id' => $payment->id,
                    'order_id' => $payment->midtrans_transaction_id,
                    'error' => $e->getMessage(),
                ]);
                $this->error('  !! error: '.$e->getMessage());
            }
        }

        $this->info(sprintf('Selesai. approved: %d, tetap pending/other: %d', $success, $errors));

        return Command::SUCCESS;
    }
}
