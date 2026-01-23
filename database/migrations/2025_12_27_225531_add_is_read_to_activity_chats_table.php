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
        // Check if table exists
        if (!Schema::hasTable('activity_chats')) {
            return; // Table doesn't exist, skip this migration
        }

        // Check if column already exists
        if (Schema::hasColumn('activity_chats', 'is_read')) {
            return; // Column already exists, skip
        }

        // Check if message column exists to determine where to place is_read
        if (Schema::hasColumn('activity_chats', 'message')) {
            // Add is_read after message column
            Schema::table('activity_chats', function (Blueprint $table) {
                $table->boolean('is_read')->default(false)->after('message');
            });
        } else {
            // If message doesn't exist, add is_read after sender_id or at the end
            if (Schema::hasColumn('activity_chats', 'sender_id')) {
                Schema::table('activity_chats', function (Blueprint $table) {
                    $table->boolean('is_read')->default(false)->after('sender_id');
                });
            } else {
                // Fallback: add without after clause
                Schema::table('activity_chats', function (Blueprint $table) {
                    $table->boolean('is_read')->default(false);
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('activity_chats') && Schema::hasColumn('activity_chats', 'is_read')) {
            Schema::table('activity_chats', function (Blueprint $table) {
                $table->dropColumn('is_read');
            });
        }
    }
};
