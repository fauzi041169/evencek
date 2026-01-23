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
        Schema::create('event_activities', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('activity_id')->constrained('activities')->onDelete('cascade');
            $table->string('title');
            $table->string('slug')->nullable();
            $table->string('type')->default('other'); // voting, quiz, etc.
            $table->text('description')->nullable();
            $table->dateTime('start_time')->nullable();
            $table->dateTime('end_time')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_activities');
    }
};
