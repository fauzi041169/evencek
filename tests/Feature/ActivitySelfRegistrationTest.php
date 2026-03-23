<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActivitySelfRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Ensure at least one payment method exists for manual payments
        // This prevents foreign key constraint violation in payments table
        // if the controller tries to use PaymentMethod::first() or defaults to 1.
        if (class_exists(PaymentMethod::class)) {
            PaymentMethod::create([
                'name' => 'Transfer Bank BCA',
                'account_number' => '1234567890',
                'account_name' => 'Admin Event',
                'is_active' => true,
                'verification_status' => 'verified',
            ]);
        }
    }

    /**
     * Test successful enrollment for a FREE activity.
     *
     * @return void
     */
    public function test_user_can_enroll_in_free_activity()
    {
        // 1. Create User
        $user = User::factory()->create();
        $user->profile()->create([
            'user_id' => $user->id,
            'foto' => 'profile.jpg',
        ]);

        // 2. Create Free Activity
        $activity = Activity::factory()->create([
            'price' => 0,
            'pendaftaran' => 1, // Open
            'payment_method_type' => 'manual',
        ]);

        // 3. Login
        $this->actingAs($user);

        // 4. Enroll (POST to activity.enroll)
        // For free activity, this should complete the enrollment
        $response = $this->post(route('activity.enroll', $activity->id));

        // 5. Assert Redirect (usually back)
        $response->assertStatus(302);

        // 6. Check database for enrollment
        // Note: ActivityEnrollmentController uses ActivityUser::STATUS_ACTIVE (1)
        $this->assertDatabaseHas('activity_users', [
            'activity_id' => $activity->id,
            'user_id' => $user->id,
            'status' => 1, // STATUS_ACTIVE
        ]);
    }

    /**
     * Test successful flow for a PAID activity (Manual Payment).
     *
     * @return void
     */
    public function test_user_can_enroll_in_paid_activity_manual_payment()
    {
        // 1. Create User
        $user = User::factory()->create();
        $user->profile()->create([
            'user_id' => $user->id,
            'foto' => 'profile.jpg',
        ]);

        // 2. Create Paid Activity
        $activity = Activity::factory()->create([
            'price' => 100000,
            'pendaftaran' => 1,
            'payment_method_type' => 'manual',
        ]);

        // 3. Login
        $this->actingAs($user);

        // 4. Enroll (POST to activity.enroll)
        // For paid activity, this should create enrollment + payment record and redirect to payment page
        $response = $this->post(route('activity.enroll', $activity->id));

        // 5. Assert Redirect to Payment Create Page
        $response->assertRedirect(route('payments.activity.create', $activity->id));

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
     * Test successful flow for a PAID activity (Midtrans/Auto).
     *
     * @return void
     */
    public function test_user_can_enroll_in_paid_activity_midtrans_payment()
    {
        // 1. Create User
        $user = User::factory()->create();
        $user->profile()->create([
            'user_id' => $user->id,
            'foto' => 'profile.jpg',
        ]);

        // 2. Create Paid Activity (Auto)
        $activity = Activity::factory()->create([
            'price' => 150000,
            'pendaftaran' => 1,
            'payment_method_type' => 'automatic',
        ]);

        // 3. Login
        $this->actingAs($user);

        // 4. Enroll (POST to activity.enroll)
        $response = $this->post(route('activity.enroll', $activity->id));

        // 5. Assert Redirect to Midtrans Payment Create Page
        $response->assertRedirect(route('midtrans.payment.create', $activity->id));

        $this->assertDatabaseHas('payments', [
            'activity_id' => $activity->id,
            'user_id' => $user->id,
            'amount' => 150000,
            'status' => 'pending',
        ]);
    }
}
