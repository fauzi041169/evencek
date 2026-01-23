<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SubscriptionRulesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class, \App\Http\Middleware\PreventRequestsDuringMaintenance::class]);
        $this->withoutMiddleware([\App\Http\Middleware\ActivityLogger::class, \App\Http\Middleware\PerformanceLogger::class]);

        Schema::dropIfExists('users');
        Schema::dropIfExists('profiles');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('activities');
        Schema::dropIfExists('activitiusers');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('subscription_plans');

        Schema::create('users', function ($table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->string('password')->nullable();
            $table->string('role')->nullable();
            $table->timestamps();
        });

        Schema::create('profiles', function ($table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('no_hp')->nullable();
            $table->timestamps();
        });

        Schema::create('categories', function ($table) {
            $table->id();
            $table->string('name');
            $table->timestamps();
        });

        Schema::create('activities', function ($table) {
            $table->id();
            $table->string('name')->nullable();
            $table->text('description')->nullable();
            $table->unsignedBigInteger('category_id')->nullable();
            $table->date('date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('start_time')->nullable();
            $table->string('end_time')->nullable();
            $table->string('location')->nullable();
            $table->integer('price')->nullable();
            $table->string('payment_method_type')->nullable();
            $table->string('status')->nullable();
            $table->string('image')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();
        });

        Schema::create('activitiusers', function ($table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('activity_id');
            $table->integer('status')->default(0);
            $table->timestamps();
        });

        Schema::create('subscription_plans', function ($table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->nullable();
            $table->integer('price')->default(0);
            $table->integer('max_participants_per_activity')->nullable();
            $table->text('features')->nullable();
            $table->integer('sort_order')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('subscriptions', function ($table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('subscription_plan_id');
            $table->string('status')->default('active');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('midtrans_order_id')->nullable();
            $table->string('midtrans_payment_token')->nullable();
            $table->timestamps();
        });
    }

    public function test_activity_store_manual_paid_limit_enforced(): void
    {
        $creator = User::create(['name' => 'Creator', 'email' => 'creator@example.com', 'password' => 'x', 'role' => 'creator']);
        $this->actingAs($creator);

        $categoryId = DB::table('categories')->insertGetId(['name' => 'Umum']);

        $planId = DB::table('subscription_plans')->insertGetId([
            'name' => 'Pro',
            'slug' => 'pro',
            'price' => 100000,
            'features' => json_encode(['manual_activities_limit' => 2]),
            'sort_order' => 10,
            'is_active' => 1,
        ]);

        DB::table('subscriptions')->insert([
            'user_id' => $creator->id,
            'subscription_plan_id' => $planId,
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('activities')->insert([
            'name' => 'Manual 1',
            'description' => 'D',
            'category_id' => $categoryId,
            'date' => now()->toDateString(),
            'start_time' => '08:00',
            'end_time' => '09:00',
            'location' => 'L',
            'price' => 50000,
            'payment_method_type' => 'manual',
            'status' => 'public',
            'user_id' => $creator->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('activities')->insert([
            'name' => 'Manual 2',
            'description' => 'D',
            'category_id' => $categoryId,
            'date' => now()->toDateString(),
            'start_time' => '10:00',
            'end_time' => '11:00',
            'location' => 'L',
            'price' => 60000,
            'payment_method_type' => 'manual',
            'status' => 'public',
            'user_id' => $creator->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resp = $this->post(route('activity.store'), [
            'name' => 'Manual 3',
            'description' => 'D',
            'category_id' => $categoryId,
            'date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'start_time' => '12:00',
            'end_time' => '13:00',
            'location' => 'L',
            'price' => 70000,
            'payment_method_type' => 'manual',
            'status' => 'public',
        ], ['HTTP_REFERER' => '/']);

        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $this->assertDatabaseCount('activities', 2);
    }

    public function test_activity_store_basic_free_quota_enforced(): void
    {
        $creator = User::create(['name' => 'Creator', 'email' => 'creator2@example.com', 'password' => 'x', 'role' => 'creator']);
        $this->actingAs($creator);

        $categoryId = DB::table('categories')->insertGetId(['name' => 'Umum']);

        $planId = DB::table('subscription_plans')->insertGetId([
            'name' => 'Basic',
            'slug' => 'basic',
            'price' => 0,
            'features' => json_encode([]),
            'sort_order' => 1,
            'is_active' => 1,
        ]);

        DB::table('subscriptions')->insert([
            'user_id' => $creator->id,
            'subscription_plan_id' => $planId,
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        for ($i = 0; $i < 5; $i++) {
            DB::table('activities')->insert([
                'name' => 'Free '.$i,
                'description' => 'D',
                'category_id' => $categoryId,
                'date' => now()->toDateString(),
                'start_time' => '08:00',
                'end_time' => '09:00',
                'location' => 'L',
                'price' => 0,
                'payment_method_type' => 'manual',
                'status' => 'public',
                'user_id' => $creator->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $resp = $this->post(route('activity.store'), [
            'name' => 'Free 6',
            'description' => 'D',
            'category_id' => $categoryId,
            'date' => now()->toDateString(),
            'end_date' => now()->toDateString(),
            'start_time' => '10:00',
            'end_time' => '11:00',
            'location' => 'L',
            'price' => 0,
            'payment_method_type' => 'manual',
            'status' => 'public',
        ], ['HTTP_REFERER' => '/']);

        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $this->assertDatabaseCount('activities', 5);
    }

    public function test_free_activity_participant_cap_enforced_for_basic(): void
    {
        $creator = User::create(['name' => 'Creator', 'email' => 'creator3@example.com', 'password' => 'x', 'role' => 'creator']);
        $participant = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($participant);

        $planId = DB::table('subscription_plans')->insertGetId([
            'name' => 'Basic',
            'slug' => 'basic',
            'price' => 0,
            'features' => json_encode([]),
            'sort_order' => 1,
            'is_active' => 1,
        ]);

        DB::table('subscriptions')->insert([
            'user_id' => $creator->id,
            'subscription_plan_id' => $planId,
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $activityId = DB::table('activities')->insertGetId([
            'name' => 'Free Cap',
            'description' => 'D',
            'category_id' => null,
            'date' => now()->toDateString(),
            'start_time' => '08:00',
            'end_time' => '09:00',
            'location' => 'L',
            'price' => 0,
            'payment_method_type' => 'manual',
            'status' => 'public',
            'user_id' => $creator->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        for ($i = 0; $i < 25; $i++) {
            DB::table('activitiusers')->insert([
                'user_id' => $creator->id, // dummy existing participants
                'activity_id' => $activityId,
                'status' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $resp = $this->post(route('payments.store', ['activity' => $activityId]), [], ['HTTP_REFERER' => '/']);

        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $this->assertDatabaseCount('activitiusers', 25);
    }
}
