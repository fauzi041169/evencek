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
        if (Schema::hasTable('comments')) {
            return; // Table already exists (from previous partial run)
        }
        Schema::create('comments', function (Blueprint $table) {
            $table->customUid();
            $table->morphs('commentable');
            $table->foreignCustomUid('user_id')->constrained()->onDelete('cascade');
            $table->foreignCustomUid('parent_id')->nullable()->constrained('comments')->onDelete('cascade');
            $table->text('body');
            $table->unsignedTinyInteger('rating')->nullable(); // 1-5, top-level only
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
