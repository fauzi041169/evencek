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
        Schema::table('card_settings', function (Blueprint $table) {
            if (!Schema::hasColumn('card_settings', 'type')) {
                $table->string('type')->default('participant')->after('activity_batch_id')->index();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('card_settings', function (Blueprint $table) {
            if (Schema::hasColumn('card_settings', 'type')) {
                $table->dropColumn('type');
            }
        });
    }
};
