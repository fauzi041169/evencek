<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserRegistrationFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure PaymentMethod exists
        if (PaymentMethod::count() == 0) {
            PaymentMethod::create(['name' => 'Bank Transfer', 'code' => 'manual', 'is_active' => true]);
        }
    }

    /**
     * Test Individual Registration for Free Activity
     */
    public function test_individual_registration_free_activity()
    {
        $user = User::factory()->create();
        $user->profile()->create([
            'user_id' => $user->id,
            'foto' => 'profile.jpg',
        ]);
        $activity = Activity::factory()->create([
            'price' => 0,
            'pendaftaran' => 1, // Open
            'payment_method_type' => 'manual',
        ]);

        $this->actingAs($user);

        $response = $this->post(route('activity.enroll', $activity->id), [
            'name' => $user->name,
            'email' => $user->email,
            // Add other required fields if any (based on controller analysis, it merges request data to profile)
        ]);

        $response->assertSessionHasNoErrors();
        // It might redirect back
        $response->assertRedirect();

        $this->assertDatabaseHas('activity_users', [
            'activity_id' => $activity->id,
            'user_id' => $user->id,
            'status' => ActivityUser::STATUS_ACTIVE, // Free should be active immediately
        ]);
    }

    /**
     * Test Individual Registration for Paid Activity (Manual Transfer)
     */
    public function test_individual_registration_paid_manual_activity()
    {
        $user = User::factory()->create();
        $user->profile()->create([
            'user_id' => $user->id,
            'foto' => 'profile.jpg',
        ]);
        $activity = Activity::factory()->create([
            'price' => 100000,
            'pendaftaran' => 1,
            'payment_method_type' => 'manual',
        ]);

        $this->actingAs($user);

        $response = $this->post(route('activity.enroll', $activity->id), [
            'name' => $user->name,
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $paymentMethodId = PaymentMethod::first()?->id;
        $this->assertDatabaseHas('payments', [
            'activity_id' => $activity->id,
            'user_id' => $user->id,
            'amount' => 100000,
            'status' => 'pending',
            'payment_method_id' => $paymentMethodId,
        ]);
    }

    /**
     * Test Individual Registration for Paid Activity (Payment Gateway)
     */
    public function test_individual_registration_paid_gateway_activity()
    {
        config(['services.midtrans.server_key' => 'SB-Mid-server-dummy']);
        config(['services.midtrans.client_key' => 'SB-Mid-client-dummy']);
        config(['services.midtrans.is_production' => false]);

        // Mock Midtrans Snap to avoid actual API call
        $mock = \Mockery::mock('alias:\Midtrans\Snap');
        $mock->shouldReceive('createTransaction')
            ->andReturn('dummy_snap_token');

        $user = User::factory()->create();
        $user->profile()->create([
            'user_id' => $user->id,
            'foto' => 'profile.jpg',
        ]);

        $activity = Activity::factory()->create([
            'price' => 150000,
            'pendaftaran' => 1,
            'payment_method_type' => 'automatic',
        ]);

        $this->actingAs($user);

        $enroll = $this->post(route('activity.enroll', $activity->id), [
            'name' => $user->name,
        ]);
        $enroll->assertRedirect();

        $this->assertDatabaseHas('payments', [
            'activity_id' => $activity->id,
            'user_id' => $user->id,
            'amount' => 150000,
            'status' => 'pending',
        ]);
    }
}
