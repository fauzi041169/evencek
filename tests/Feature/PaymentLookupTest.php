<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityParticipantGroup;
use App\Models\ActivityUser;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentLookupTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // Ensure we have a payment method
        PaymentMethod::firstOrCreate(
            ['name' => 'Test Bank'],
            ['account_number' => '123', 'account_name' => 'Test', 'is_active' => true]
        );
    }

    public function test_lookup_free_activity()
    {
        $user = User::factory()->create();
        $activity = Activity::factory()->create(['price' => 0, 'user_id' => $user->id]);

        // User must be enrolled for lookup to work effectively or at least be the user
        $this->actingAs($user);

        $response = $this->getJson(route('payments.lookup', [
            'activity_id' => $activity->id,
            'user_id' => $user->id,
        ]));

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Kegiatan gratis (tidak memerlukan pembayaran)',
                'is_free' => true,
            ]);
    }

    public function test_lookup_paid_activity_no_payment()
    {
        $user = User::factory()->create();
        $activity = Activity::factory()->create(['price' => 100000, 'user_id' => User::factory()->create()->id]);

        $this->actingAs($user);

        $response = $this->getJson(route('payments.lookup', [
            'activity_id' => $activity->id,
            'user_id' => $user->id,
        ]));

        $response->assertStatus(404)
            ->assertJson([
                'success' => false,
                'message' => 'Pembayaran tidak ditemukan',
            ]);
    }

    public function test_lookup_paid_activity_with_payment()
    {
        $user = User::factory()->create();
        $owner = User::factory()->create();
        $activity = Activity::factory()->create(['price' => 100000, 'user_id' => $owner->id]);

        $payment = Payment::create([
            'user_id' => $user->id,
            'activity_id' => $activity->id,
            'amount' => 100000,
            'payment_method_id' => PaymentMethod::first()->id,
            'status' => 'pending',
            'proof_of_payment' => 'test.jpg',
        ]);

        $this->actingAs($user);

        $response = $this->getJson(route('payments.lookup', [
            'activity_id' => $activity->id,
            'user_id' => $user->id,
        ]));

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'payment' => [
                    'id' => $payment->id,
                    'status' => 'pending',
                ],
            ]);
    }

    public function test_lookup_group_payment()
    {
        $owner = User::factory()->create();
        $activity = Activity::factory()->create(['price' => 100000, 'user_id' => $owner->id]);

        $payer = User::factory()->create();
        $member = User::factory()->create();

        // Create group
        $group = ActivityParticipantGroup::create([
            'activity_id' => $activity->id,
            'name' => 'Test Group',
        ]);

        // Enroll users and assign to group
        ActivityUser::create([
            'user_id' => $payer->id,
            'activity_id' => $activity->id,
            'activity_participant_group_id' => $group->id,
            'status' => ActivityUser::STATUS_PENDING,
        ]);

        ActivityUser::create([
            'user_id' => $member->id,
            'activity_id' => $activity->id,
            'activity_participant_group_id' => $group->id,
            'status' => ActivityUser::STATUS_PENDING,
        ]);

        // Payer makes a payment
        $payment = Payment::create([
            'user_id' => $payer->id,
            'activity_id' => $activity->id,
            'amount' => 200000, // For 2 people
            'payment_method_id' => PaymentMethod::first()->id,
            'status' => 'pending',
            'proof_of_payment' => 'group.jpg',
        ]);

        // Lookup for MEMBER (who didn't pay directly)
        $this->actingAs($member);

        $response = $this->getJson(route('payments.lookup', [
            'activity_id' => $activity->id,
            'user_id' => $member->id,
        ]));

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'payment' => [
                    'id' => $payment->id, // Should find payer's payment
                ],
            ]);
    }

    public function test_lookup_bulk_import_payment()
    {
        $owner = User::factory()->create();
        $activity = Activity::factory()->create(['price' => 100000, 'user_id' => $owner->id]);

        $payer = User::factory()->create();
        $beneficiary = User::factory()->create(); // User who benefits from bulk payment but isn't grouped yet

        // Payer makes a bulk payment
        $payment = Payment::create([
            'user_id' => $payer->id,
            'activity_id' => $activity->id,
            'amount' => 200000,
            'payment_method_id' => PaymentMethod::first()->id,
            'status' => 'pending',
            'proof_of_payment' => 'bulk.jpg',
            'notes' => json_encode([
                'bulk_import' => [
                    'user_ids' => [$payer->id, $beneficiary->id],
                ],
            ]),
        ]);

        // Lookup for Beneficiary
        $this->actingAs($beneficiary);

        $response = $this->getJson(route('payments.lookup', [
            'activity_id' => $activity->id,
            'user_id' => $beneficiary->id,
        ]));

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'payment' => [
                    'id' => $payment->id,
                ],
            ]);
    }
}
