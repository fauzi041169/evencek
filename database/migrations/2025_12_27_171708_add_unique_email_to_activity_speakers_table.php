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
        Schema::table('activity_speakers', function (Blueprint $table) {
            // Add unique index on combination of email and activity_id
            // This ensures one email can only be used once per activity, but can be reused in different activities
            $table->unique(['email', 'activity_id'], 'activity_speakers_email_activity_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_speakers', function (Blueprint $table) {
            $table->dropUnique('activity_speakers_email_activity_unique');
        });
    }
};
