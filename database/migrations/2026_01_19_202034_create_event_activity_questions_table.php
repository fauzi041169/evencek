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
        if (! Schema::hasTable('event_activity_questions')) {
            Schema::create('event_activity_questions', function (Blueprint $table) {
                $table->customUid();
                $table->foreignCustomUid('event_activity_id')->constrained('event_activities')->onDelete('cascade');
                $table->text('question_text');
                $table->string('type')->default('multiple_choice');
                $table->json('options')->nullable();
                $table->integer('order')->default(0);
                $table->boolean('is_required')->default(true);
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_activity_questions');
    }
};
