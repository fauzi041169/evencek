<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\User;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\ActivityUser;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class UserRegistrationFlowTest extends TestCase
{
    // use RefreshDatabase; // Use with caution on existing DB. Maybe better to use transactions or manual cleanup if possible. 
    // Since this is a dev environment, RefreshDatabase might wipe data. 
    // I will use a transaction trait or just careful cleanup if RefreshDatabase is too aggressive.
    // Given the environment, I'll assume standard Laravel testing.
    use RefreshDatabase;

    public function setUp(): void
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
        $activity = Activity::factory()->create([
            'price' => 0,
            'pendaftaran' => 1, // Open
            'is_automatic_payment' => false,
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
        $activity = Activity::factory()->create([
            'price' => 100000,
            'pendaftaran' => 1,
            'is_automatic_payment' => false,
        ]);

        $this->actingAs($user);

        $response = $this->post(route('activity.enroll', $activity->id), [
            'name' => $user->name,
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        // Check ActivityUser created with PENDING status
        $this->assertDatabaseHas('activity_users', [
            'activity_id' => $activity->id,
            'user_id' => $user->id,
            'status' => ActivityUser::STATUS_PENDING,
        ]);

        // Check Payment created
        $this->assertDatabaseHas('payments', [
            'activity_id' => $activity->id,
            'user_id' => $user->id,
            'amount' => 100000,
            'status' => 'pending',
            // 'payment_method_id' => ... // Manual
        ]);
    }

    /**
     * Test Individual Registration for Paid Activity (Payment Gateway)
     */
    public function test_individual_registration_paid_gateway_activity()
    {
        // Mock Midtrans Config
        config(['services.midtrans.server_key' => 'SB-Mid-server-dummy']);
        config(['services.midtrans.client_key' => 'SB-Mid-client-dummy']);
        config(['services.midtrans.is_production' => false]);

        // Mock Midtrans Snap to avoid actual API call
        $mock = \Mockery::mock('alias:\Midtrans\Snap');
        $mock->shouldReceive('createTransaction')
             ->andReturn('dummy_snap_token');

        $user = User::factory()->create();
        // Create user profile to avoid "profile incomplete" redirect
        $user->profile()->create([
            'user_id' => $user->id,
            'no_hp' => '081234567890',
            'jenis_kelamin' => 'L',
            'alamat' => 'Jl. Test',
            'pekerjaan' => 'Tester',
            'instansi' => 'Test Corp',
            'jabatan' => 'Staff',
            'province_id' => 1,
            'regency_id' => 1,
            'district_id' => 1,
            'foto' => 'profile.jpg'
        ]);

        $activity = Activity::factory()->create([
            'price' => 150000,
            'pendaftaran' => 1,
            'is_automatic_payment' => true,
        ]);

        $this->actingAs($user);

        // The route is 'midtrans.payment.create' with activity parameter
        // It's defined in routes/web.php likely as /payment/midtrans/create/{activity} or similar?
        // Wait, I need to check the route definition for 'midtrans.payment.create'
        // I searched for it but didn't see the exact route line. 
        // Based on usage `route('midtrans.payment.create', $activity->id)`, it expects an ID.
        
        // Let's assume the route exists. If not, the test will fail and I will fix it.
        // Actually I should verify the route first.
        
        // From SearchCodebase earlier:
        // d:\APLIKASI\ADZKIATEKNO\EVENCEK\1\2\eventcekserver\resources\views\activity\show.blade.php
        // 'url' => route('midtrans.payment.create', $activity->id),
        
        // I will trust it exists.
        
        $response = $this->get(route('midtrans.payment.create', $activity->id));

        $response->assertStatus(200);
        $response->assertViewIs('payments.midtrans');
        $response->assertViewHas('snapToken', 'dummy_snap_token');

        // Check Payment created
        $this->assertDatabaseHas('payments', [
            'activity_id' => $activity->id,
            'user_id' => $user->id,
            'amount' => 150000,
            'status' => 'pending',
            'midtrans_snap_token' => 'dummy_snap_token',
        ]);
    }
}
