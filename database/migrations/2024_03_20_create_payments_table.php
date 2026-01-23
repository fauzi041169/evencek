<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('user_id')->constrained()->onDelete('cascade');
            $table->foreignCustomUid('activity_id')->constrained()->onDelete('cascade');
            $table->foreignCustomUid('activity_batch_id')->nullable()->constrained('activity_batches')->onDelete('set null');
            $table->foreignCustomUid('payment_method_id')->nullable()->constrained()->onDelete('cascade');

            // Midtrans fields
            $table->string('midtrans_transaction_id')->nullable();
            $table->text('midtrans_snap_token')->nullable();
            $table->text('midtrans_response')->nullable();

            $table->decimal('amount', 10, 2);
            $table->string('proof_of_payment')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->foreignCustomUid('verified_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('status', 'payments_status_index');
            $table->index('midtrans_transaction_id', 'payments_midtrans_tx_index');
            $table->index(['user_id', 'activity_id'], 'payments_user_activity_index');
            $table->index('verified_by', 'payments_verified_by_index');
            $table->index('created_at', 'payments_created_at_index');
            $table->index(['activity_id', 'activity_batch_id'], 'payments_activity_batch_index');
        });
    }

    public function down()
    {
        Schema::dropIfExists('payments');
    }
};
