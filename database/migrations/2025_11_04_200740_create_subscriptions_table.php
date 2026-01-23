<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->customUid();
            $table->foreignCustomUid('user_id')->constrained()->onDelete('cascade');
            $table->foreignCustomUid('subscription_plan_id')->constrained()->onDelete('cascade');
            $table->enum('status', ['active', 'expired', 'cancelled', 'pending'])->default('pending');
            $table->date('start_date');
            $table->date('end_date');
            $table->date('next_billing_date')->nullable(); // Untuk auto-renew
            $table->boolean('auto_renew')->default(true);
            $table->string('midtrans_order_id')->nullable()->unique(); // Order ID untuk Midtrans
            $table->string('midtrans_payment_token')->nullable(); // Payment token untuk recurring
            $table->text('midtrans_response')->nullable(); // Response dari Midtrans
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
