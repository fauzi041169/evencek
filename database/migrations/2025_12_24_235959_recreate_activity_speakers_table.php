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
        // Drop the table if it exists to start fresh with correct schema
        Schema::dropIfExists('activity_speakers');

        Schema::create('activity_speakers', function (Blueprint $table) {
            $table->id();
            // Use foreignCustomUid to match activities.id (char 6)
            $table->foreignCustomUid('activity_id')->constrained('activities')->onDelete('cascade');
            $table->string('name');
            $table->string('title')->nullable(); // Gelar atau Jabatan
            $table->string('institution')->nullable(); // Instansi
            $table->text('bio')->nullable();
            $table->string('photo')->nullable();
            $table->string('cv')->nullable(); // Include CV column
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->string('instagram')->nullable();
            $table->string('linkedin')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_speakers');
    }
};
