<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MidtransNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_midtrans_webhook_rejects_missing_signature(): void
    {
        $user = User::factory()->create();
        $activity = Activity::factory()->create([
            'price' => 15000,
            'payment_method_type' => Activity::PAYMENT_METHOD_AUTOMATIC,
        ]);

        $payment = Payment::create([
            'user_id' => $user->id,
            'activity_id' => $activity->id,
            'amount' => 15000,
            'status' => 'pending',
            'midtrans_transaction_id' => 'ACTIVITY-'.$activity->id.'-USER-'.$user->id.'-'.time(),
        ]);

        $payload = [
            'order_id' => $payment->midtrans_transaction_id,
            'transaction_status' => 'settlement',
            'status_code' => '200',
            'gross_amount' => (string) $payment->amount,
        ];

        $response = $this->postJson(route('midtrans.notification'), $payload);
        $response->assertForbidden();

        $payment->refresh();
        $this->assertSame('pending', $payment->status);
    }

    public function test_midtrans_webhook_approves_payment_and_enrolls_participant(): void
    {
        config(['services.midtrans.server_key' => 'test-server-key']);

        $user = User::factory()->create();
        $activity = Activity::factory()->create([
            'price' => 15000,
            'payment_method_type' => Activity::PAYMENT_METHOD_AUTOMATIC,
        ]);

        $payment = Payment::create([
            'user_id' => $user->id,
            'activity_id' => $activity->id,
            'amount' => 15000,
            'status' => 'pending',
            'midtrans_transaction_id' => 'ACTIVITY-'.$activity->id.'-USER-'.$user->id.'-'.time(),
        ]);

        $orderId = $payment->midtrans_transaction_id;
        $statusCode = '200';
        $grossAmount = (string) $payment->amount;
        $signature = hash('sha512', $orderId.$statusCode.$grossAmount.'test-server-key');

        $payload = [
            'order_id' => $orderId,
            'transaction_status' => 'settlement',
            'status_code' => $statusCode,
            'gross_amount' => $grossAmount,
            'signature_key' => $signature,
        ];

        $response = $this->postJson(route('midtrans.notification'), $payload);
        $response->assertOk();

        $payment->refresh();
        $this->assertSame('approved', $payment->status);

        $activityUser = ActivityUser::where('user_id', $user->id)
            ->where('activity_id', $activity->id)
            ->first();

        $this->assertNotNull($activityUser);
        $this->assertSame(ActivityUser::STATUS_ACTIVE, $activityUser->status);
    }
}
