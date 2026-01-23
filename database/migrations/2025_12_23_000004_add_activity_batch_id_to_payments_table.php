<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                if (! Schema::hasColumn('payments', 'activity_batch_id')) {
                    $table->char('activity_batch_id', 6)->nullable()->after('activity_id')->index();
                    $table->foreign('activity_batch_id')->references('id')->on('activity_batches')->nullOnDelete();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('payments')) {
            Schema::table('payments', function (Blueprint $table) {
                if (Schema::hasColumn('payments', 'activity_batch_id')) {
                    $table->dropForeign(['activity_batch_id']);
                    $table->dropColumn('activity_batch_id');
                }
            });
        }
    }
};
