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
        Schema::create('activity_batches', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('activity_id')->constrained('activities')->cascadeOnDelete();
            $table->string('name'); // e.g., "Gelombang 1", "Batch Januari"
            $table->string('code')->nullable(); // e.g., "B1"
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->boolean('is_active')->default(false); // Penanda batch yang sedang dibuka pendaftarannya
            $table->text('description')->nullable();
            $table->integer('quota')->nullable(); // Kuota khusus batch ini
            $table->decimal('price', 12, 2)->nullable(); // Harga khusus batch ini
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_batches');
    }
};
