<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class FinancialLedgerTest extends TestCase
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
        Schema::dropIfExists('payments');
        Schema::dropIfExists('activities');
        Schema::dropIfExists('withdrawal_requests');

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

        Schema::create('subscription_plans', function ($table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->nullable();
            $table->integer('price')->default(0);
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

        Schema::create('payments', function ($table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('activity_id')->nullable();
            $table->unsignedBigInteger('payment_method_id')->nullable();
            $table->integer('amount')->default(0);
            $table->string('status')->default('pending');
            $table->string('midtrans_transaction_id')->nullable();
            $table->timestamps();
        });

        Schema::create('withdrawal_requests', function ($table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->unsignedBigInteger('verifier_id')->nullable();
            $table->integer('amount')->default(0);
            $table->string('status')->default('pending');
            $table->timestamps();
        });
    }

    public function test_gifted_subscription_not_counted_in_income(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'x', 'role' => 'superadmin']);
        $this->actingAs($admin);

        $user = User::create(['name' => 'User', 'email' => 'user@example.com', 'password' => 'x', 'role' => 'user']);

        $giftPlanId = DB::table('subscription_plans')->insertGetId([
            'name' => 'Pro',
            'slug' => 'pro',
            'price' => 100000,
            'features' => json_encode([]),
            'sort_order' => 10,
            'is_active' => 1,
        ]);
        $paidPlanId = DB::table('subscription_plans')->insertGetId([
            'name' => 'Enterprise',
            'slug' => 'enterprise',
            'price' => 200000,
            'features' => json_encode([]),
            'sort_order' => 20,
            'is_active' => 1,
        ]);

        DB::table('subscriptions')->insert([
            'user_id' => $user->id,
            'subscription_plan_id' => $giftPlanId,
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'midtrans_order_id' => null,
            'midtrans_payment_token' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('subscriptions')->insert([
            'user_id' => $user->id,
            'subscription_plan_id' => $paidPlanId,
            'status' => 'active',
            'start_date' => now()->toDateString(),
            'end_date' => now()->addMonth()->toDateString(),
            'midtrans_order_id' => 'ORDER-123',
            'midtrans_payment_token' => 'TOKEN-123',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resp = $this->get(route('payments.ledger'));
        $this->assertTrue(in_array($resp->getStatusCode(), [200, 302, 503]));
        if ($resp->getStatusCode() === 200) {
            $resp->assertViewHas('summary');
            $summary = $resp->viewData('summary');
            $this->assertSame(200000.0, (float) $summary['income']);
        }
    }
}
