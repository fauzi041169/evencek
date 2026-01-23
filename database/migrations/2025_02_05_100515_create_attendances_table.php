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
        Schema::create('attendances', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('activity_id')->constrained()->onDelete('cascade');
            $table->foreignCustomUid('activity_batch_id')->nullable()->constrained('activity_batches')->onDelete('set null');
            $table->string('name');
            $table->enum('jenis_absen', ['datang', 'pulang'])->default('datang');
            $table->text('description')->nullable();
            $table->timestamps();

            // Add compound index for performance
            $table->index(['activity_id', 'jenis_absen', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
