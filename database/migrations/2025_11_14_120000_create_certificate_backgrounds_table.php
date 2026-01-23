<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificate_backgrounds', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('activity_id')->nullable()->constrained('activities')->onDelete('cascade');
            $table->string('filename');
            $table->string('original_name')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificate_backgrounds');
    }
};
