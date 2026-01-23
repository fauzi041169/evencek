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
        Schema::create('event_activity_responses', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('event_activity_id')->constrained('event_activities')->onDelete('cascade');
            $table->foreignCustomUid('user_id')->constrained('users')->onDelete('cascade');
            $table->json('answers')->nullable();
            $table->decimal('score', 8, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_activity_responses');
    }
};
