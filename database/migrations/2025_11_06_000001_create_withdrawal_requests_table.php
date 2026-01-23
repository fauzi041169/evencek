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
        Schema::create('withdrawal_requests', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('user_id')->constrained('users')->onDelete('cascade');
            $table->integer('amount');
            $table->string('notes')->nullable();
            $table->string('status')->default('pending'); // pending, approved, rejected, paid
            $table->foreignCustomUid('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->index('status', 'withdrawals_status_index');
            $table->index('user_id', 'withdrawals_user_id_index');
            $table->index('created_at', 'withdrawals_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('withdrawal_requests');
    }
};
