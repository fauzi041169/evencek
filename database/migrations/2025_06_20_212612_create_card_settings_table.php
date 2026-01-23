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
        Schema::create('card_settings', function (Blueprint $table) {
            $table->customUid();
            $table->char('activity_id', 6)->index();
            $table->foreignCustomUid('activity_batch_id')->nullable()->constrained('activity_batches')->nullOnDelete();
            $table->json('card_setting');
            $table->json('print_settings')->nullable();
            $table->timestamps();

            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('card_settings');
    }
};
