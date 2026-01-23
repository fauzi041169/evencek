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
        Schema::create('event_activity_options', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('event_activity_question_id')->constrained('event_activity_questions')->onDelete('cascade');
            $table->string('value'); // The text/name of the option
            $table->string('image')->nullable(); // Path to image
            $table->text('description')->nullable(); // Description
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('event_activity_options');
    }
};
