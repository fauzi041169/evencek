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
        Schema::create('activity_rundowns', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('activity_id')->constrained('activities')->onDelete('cascade');
            $table->foreignCustomUid('activity_batch_id')->nullable()->constrained('activity_batches')->nullOnDelete();
            $table->date('rundown_date')->nullable();
            $table->time('start_time');
            $table->time('end_time')->nullable();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('speaker')->nullable();
            $table->string('location')->nullable();
            $table->integer('order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_rundowns');
    }
};
