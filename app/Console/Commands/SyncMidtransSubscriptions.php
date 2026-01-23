<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncMidtransSubscriptions extends Command
{
    protected $signature = 'midtrans:sync-subscriptions {orderId? : Optional specific SUB-* order_id} {--dry-run : Do not write changes, only show what would happen}';

    protected $description = 'Sync subscription payment statuses from Midtrans and update local records';

    public function handle()
    {
        // Ensure Midtrans config is set
        \Midtrans\Config::$serverKey = config('services.midtrans.server_key');
        \Midtrans\Config::$isProduction = (bool) config('services.midtrans.is_production');

        $orderId = $this->argument('orderId');
        $dryRun = (bool) $this->option('dry-run');

        $query = Subscription::query()
            ->when($orderId, function ($q) use ($orderId) {
                // Extract subscription id from SUB-{id}-timestamp
                if (str_starts_with($orderId, 'SUB-')) {
                    $parts = explode('-', $orderId);
                    $subId = $parts[1] ?? null;
                    if ($subId) {
                        $q->where('id', $subId);
                    }
                } else {
                    $q->where('midtrans_order_id', $orderId);
                }
            })
            ->where('status', 'pending')
            ->whereNotNull('midtrans_order_id');

        $subscriptions = $query->get();
        if ($subscriptions->isEmpty()) {
            $this->info('No pending subscriptions with Midtrans order id found.');

            return Command::SUCCESS;
        }

        $updated = 0;
        $cancelled = 0;
        $unchanged = 0;
        $errors = 0;

        foreach ($subscriptions as $subscription) {
            $order = $subscription->midtrans_order_id;
            try {
                $status = $this->getMidtransStatus($order);
                $transactionStatus = $status['transaction_status'] ?? null;
                $fraudStatus = $status['fraud_status'] ?? null;

                $this->line("[{$subscription->id}] {$order} -> transaction={$transactionStatus} fraud={$fraudStatus}");

                if (in_array($transactionStatus, ['settlement', 'capture']) && ($fraudStatus === null || $fraudStatus === 'accept')) {
                    if ($dryRun) {
                        $unchanged++;

                        continue;
                    }
                    DB::transaction(function () use ($subscription) {
                        $subscription->status = 'active';
                        $subscription->start_date = now();
                        $subscription->end_date = now()->addMonth();
                        $subscription->next_billing_date = now()->addMonth();
                        $subscription->auto_renew = true;
                        $subscription->save();
                        if ($subscription->user) {
                            $user = $subscription->user;
                            $user->subscription_id = $subscription->id;
                            if (method_exists($user, 'promoteToCreatorIfEligible')) {
                                $user->promoteToCreatorIfEligible();
                            }
                            $user->save();
                        }
                    });
                    $updated++;
                } elseif (in_array($transactionStatus, ['cancel', 'deny', 'expire'])) {
                    if ($dryRun) {
                        $unchanged++;

                        continue;
                    }
                    $subscription->status = 'cancelled';
                    $subscription->auto_renew = false;
                    $subscription->save();
                    $cancelled++;
                } else {
                    $unchanged++;
                }
            } catch (\Throwable $e) {
                $errors++;
                Log::error('Error syncing Midtrans subscription', [
                    'subscription_id' => $subscription->id,
                    'order_id' => $order,
                    'error' => $e->getMessage(),
                ]);
                $this->error("Failed to sync {$order}: {$e->getMessage()}");
            }
        }

        $this->info("Sync complete. active={$updated}, cancelled={$cancelled}, skipped={$unchanged}, errors={$errors}");

        return Command::SUCCESS;
    }

    private function getMidtransStatus(string $orderId): array
    {
        $apiUrl = config('services.midtrans.is_production')
            ? 'https://api.midtrans.com/v2/'
            : 'https://api.sandbox.midtrans.com/v2/';

        $ch = curl_init($apiUrl.$orderId.'/status');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/json',
            'Authorization: Basic '.base64_encode(config('services.midtrans.server_key').':'),
        ]);

        if (app()->environment('local') || config('app.debug')) {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        }

        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
        curl_setopt($ch, CURLOPT_TIMEOUT, 7);

        $response = curl_exec($ch);
        if ($response === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new \RuntimeException('CURL Error: '.$err);
        }
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            throw new \RuntimeException('Midtrans API HTTP '.$httpCode.' response');
        }
        $data = json_decode($response, true);

        return is_array($data) ? $data : [];
    }
}
