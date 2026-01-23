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
        Schema::create('activity_division_requirements', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('activity_division_id')->constrained('activity_divisions')->onDelete('cascade');
            $table->string('name');
            $table->integer('quantity')->default(1);
            $table->string('unit')->nullable();
            $table->enum('status', ['pending', 'ready', 'completed'])->default('pending');
            $table->text('notes')->nullable();
            $table->date('target_date')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_division_requirements');
    }
};
