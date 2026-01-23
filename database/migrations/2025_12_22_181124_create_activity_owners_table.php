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
        Schema::create('activity_owners', function (Blueprint $table) {
            // Pivot table: don't create a separate 'id' column because
            // inserts are performed via attach() / query builder.
            $table->foreignCustomUid('activity_id')->constrained('activities')->onDelete('cascade');
            $table->foreignCustomUid('user_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();

            // Use composite primary key to ensure uniqueness and allow attach()/insert operations.
            $table->primary(['activity_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_owners');
    }
};
