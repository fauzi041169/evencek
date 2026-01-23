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
        Schema::create('activity_committee_structures', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('activity_id')->constrained('activities')->onDelete('cascade');
            $table->foreignCustomUid('activity_batch_id')->nullable()->constrained('activity_batches')->nullOnDelete();
            $table->string('position');
            $table->string('name');
            $table->foreignCustomUid('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_committee_structures');
    }
};
