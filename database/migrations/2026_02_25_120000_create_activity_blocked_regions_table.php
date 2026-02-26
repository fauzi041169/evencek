<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_blocked_regions', function (Blueprint $table) {
            $table->id();
            $table->string('activity_id');
            $table->string('province_id');
            $table->string('regency_id')->nullable();
            $table->string('district_id')->nullable();
            $table->timestamps();

            $table->foreign('activity_id')->references('id')->on('activities')->onDelete('cascade');
            $table->foreign('province_id')->references('id')->on('provinces')->onDelete('cascade');
            $table->foreign('regency_id')->references('id')->on('regencies')->onDelete('cascade');
            $table->foreign('district_id')->references('id')->on('districts')->onDelete('cascade');
            $table->unique(['activity_id', 'province_id', 'regency_id', 'district_id'], 'activity_blocked_regions_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_blocked_regions');
    }
};
