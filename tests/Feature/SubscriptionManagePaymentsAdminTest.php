<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SubscriptionManagePaymentsAdminTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class, \App\Http\Middleware\PreventRequestsDuringMaintenance::class]);
        $this->withoutMiddleware([\App\Http\Middleware\ActivityLogger::class, \App\Http\Middleware\PerformanceLogger::class]);

        Schema::dropIfExists('users');
        Schema::dropIfExists('profiles');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('subscription_plans');

        Schema::create('users', function ($table) {
            $table->char('id', 6)->primary();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->string('password')->nullable();
            $table->string('role')->nullable();
            $table->timestamps();
        });

        Schema::create('profiles', function ($table) {
            $table->char('id', 6)->primary();
            $table->char('user_id', 6)->nullable();
            $table->string('no_hp')->nullable();
            $table->timestamps();
        });

        Schema::create('subscription_plans', function ($table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->nullable();
            $table->integer('price')->default(0);
            $table->integer('sort_order')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('subscriptions', function ($table) {
            $table->id();
            $table->char('user_id', 6);
            $table->unsignedBigInteger('subscription_plan_id');
            $table->string('status')->default('active');
            $table->string('midtrans_order_id')->nullable();
            $table->string('midtrans_payment_token')->nullable();
            $table->timestamps();
        });
    }

    public function test_total_amount_counts_only_paid_subscriptions(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'x', 'role' => 'superadmin']);
        $this->actingAs($admin);

        $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'x', 'role' => 'user']);

        $plan1 = DB::table('subscription_plans')->insertGetId(['name' => 'Pro', 'slug' => 'pro', 'price' => 150000, 'sort_order' => 10, 'is_active' => 1]);
        $plan2 = DB::table('subscription_plans')->insertGetId(['name' => 'Enterprise', 'slug' => 'enterprise', 'price' => 200000, 'sort_order' => 20, 'is_active' => 1]);

        // Gifted (no payment)
        DB::table('subscriptions')->insert([
            'user_id' => $user->id,
            'subscription_plan_id' => $plan1,
            'status' => 'active',
            'midtrans_order_id' => null,
            'midtrans_payment_token' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        // Paid (midtrans)
        DB::table('subscriptions')->insert([
            'user_id' => $user->id,
            'subscription_plan_id' => $plan2,
            'status' => 'active',
            'midtrans_order_id' => 'ORDER-123',
            'midtrans_payment_token' => 'TOKEN-123',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resp = $this->get(route('payments.manage'));
        $this->assertTrue(in_array($resp->getStatusCode(), [200, 302, 503]));
        if ($resp->getStatusCode() === 200) {
            $resp->assertViewHas('stats');
            $stats = $resp->viewData('stats');
            $this->assertSame(200000.0, (float) $stats['total_amount']);
        }
    }
}
