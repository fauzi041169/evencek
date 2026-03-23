<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\Category;
use App\Models\Profile;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionRulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_activity_store_manual_paid_limit_enforced(): void
    {
        $creator = User::create(['name' => 'Creator', 'email' => 'creator@example.com', 'password' => 'x', 'role' => 'creator']);
        $this->actingAs($creator);

        $category = Category::create(['name' => 'Umum', 'description' => null]);

        $plan = SubscriptionPlan::create([
            'name' => 'Pro',
            'slug' => 'pro',
            'price' => 100000,
            'features' => ['manual_activities_limit' => 2],
            'sort_order' => 10,
            'is_active' => true,
        ]);

        Subscription::create([
            'user_id' => $creator->id,
            'subscription_plan_id' => $plan->id,
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'auto_renew' => false,
        ]);

        Activity::factory()->create([
            'name' => 'Manual 1',
            'description' => 'D',
            'activity_type' => 'non_batch',
            'category_id' => $category->id,
            'price' => 50000,
            'payment_method_type' => 'manual',
            'status' => 'public',
            'user_id' => $creator->id,
        ]);
        Activity::factory()->create([
            'name' => 'Manual 2',
            'description' => 'D',
            'activity_type' => 'non_batch',
            'category_id' => $category->id,
            'price' => 60000,
            'payment_method_type' => 'manual',
            'status' => 'public',
            'user_id' => $creator->id,
        ]);

        $resp = $this->post(route('activity.store'), [
            'name' => 'Manual 3',
            'description' => 'D',
            'activity_type' => 'non_batch',
            'category_id' => $category->id,
            'date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'start_time' => '12:00',
            'end_time' => '13:00',
            'location' => 'L',
            'price' => 70000,
            'payment_method_type' => 'manual',
            'status' => 'public',
        ], ['HTTP_REFERER' => '/']);

        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200]));
        $this->assertSame(2, Activity::where('user_id', $creator->id)->where('payment_method_type', 'manual')->where('price', '>', 0)->count());
    }

    public function test_activity_store_basic_free_quota_enforced(): void
    {
        $creator = User::create(['name' => 'Creator', 'email' => 'creator2@example.com', 'password' => 'x', 'role' => 'creator']);
        $this->actingAs($creator);

        $category = Category::create(['name' => 'Umum', 'description' => null]);

        $plan = SubscriptionPlan::create([
            'name' => 'Basic',
            'slug' => 'basic',
            'price' => 0,
            'features' => ['free_activities_quota' => 5],
            'sort_order' => 1,
            'is_active' => true,
        ]);

        Subscription::create([
            'user_id' => $creator->id,
            'subscription_plan_id' => $plan->id,
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'auto_renew' => false,
        ]);

        for ($i = 0; $i < 5; $i++) {
            Activity::factory()->create([
                'name' => 'Free '.$i,
                'description' => 'D',
                'activity_type' => 'non_batch',
                'category_id' => $category->id,
                'price' => 0,
                'payment_method_type' => 'manual',
                'status' => 'public',
                'user_id' => $creator->id,
            ]);
        }

        $resp = $this->post(route('activity.store'), [
            'name' => 'Free 6',
            'description' => 'D',
            'activity_type' => 'non_batch',
            'category_id' => $category->id,
            'date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'start_time' => '10:00',
            'end_time' => '11:00',
            'location' => 'L',
            'price' => 0,
            'payment_method_type' => 'manual',
            'status' => 'public',
        ], ['HTTP_REFERER' => '/']);

        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200]));
        $this->assertSame(5, Activity::where('user_id', $creator->id)->where(function ($q) {
            $q->whereNull('price')->orWhere('price', 0);
        })->count());
    }

    public function test_free_activity_participant_cap_enforced_for_basic(): void
    {
        $creator = User::create(['name' => 'Creator', 'email' => 'creator3@example.com', 'password' => 'x', 'role' => 'creator']);

        $plan = SubscriptionPlan::create([
            'name' => 'Basic',
            'slug' => 'basic',
            'price' => 0,
            'max_participants_per_activity' => 25,
            'features' => [],
            'sort_order' => 1,
            'is_active' => true,
        ]);

        Subscription::create([
            'user_id' => $creator->id,
            'subscription_plan_id' => $plan->id,
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'auto_renew' => false,
        ]);

        $category = Category::create(['name' => 'Umum', 'description' => null]);
        $activity = Activity::factory()->create([
            'name' => 'Free Cap',
            'description' => 'D',
            'activity_type' => 'non_batch',
            'category_id' => $category->id,
            'price' => 0,
            'payment_method_type' => 'manual',
            'status' => 'public',
            'pendaftaran' => 1,
            'user_id' => $creator->id,
        ]);

        for ($i = 0; $i < 25; $i++) {
            $u = User::create(['name' => 'U'.$i, 'email' => 'u'.$i.'@example.com', 'password' => 'x', 'role' => 'user']);
            ActivityUser::create(['user_id' => $u->id, 'activity_id' => $activity->id, 'status' => 1]);
        }

        $participant = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'x', 'role' => 'user']);
        Profile::create(['user_id' => $participant->id, 'foto' => 'profile.jpg']);
        $this->actingAs($participant);

        $resp = $this->post(route('activity.enroll', $activity->id), [], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200]));
        $this->assertSame(25, ActivityUser::where('activity_id', $activity->id)->where('status', 1)->count());
    }
}
