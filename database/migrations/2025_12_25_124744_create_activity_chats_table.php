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
        // Drop if exists to ensure clean state since it was empty before
        Schema::dropIfExists('activity_chats');

        Schema::create('activity_chats', function (Blueprint $table) {
            $table->id();
            // Use char(6) to match activities.id and users.id types
            $table->foreignCustomUid('activity_id')->constrained()->onDelete('cascade');
            // user_id represents the participant (thread owner)
            $table->foreignCustomUid('user_id')->constrained()->onDelete('cascade');
            // sender_id is who actually sent the message (could be participant or committee)
            $table->foreignCustomUid('sender_id')->constrained('users')->onDelete('cascade');
            $table->text('message');
            $table->boolean('is_read')->default(false);
            $table->boolean('is_read_by_user')->default(false);
            $table->boolean('is_read_by_committee')->default(false);
            $table->timestamps();

            // Index for faster retrieval of conversation threads
            $table->index(['activity_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_chats');
    }
};
