<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('card_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('card_settings', 'activity_batch_id')) {
                $table->char('activity_batch_id', 6)->nullable()->after('activity_id');
                $table->foreign('activity_batch_id')->references('id')->on('activity_batches')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('card_settings')) {
            try {
                DB::statement('ALTER TABLE `card_settings` DROP FOREIGN KEY `card_settings_activity_batch_id_foreign`');
            } catch (\Throwable $e) {
            }

            Schema::table('card_settings', function (Blueprint $table) {
                if (Schema::hasColumn('card_settings', 'activity_batch_id')) {
                    $table->dropColumn('activity_batch_id');
                }
            });
        }
    }
};
