<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('certificate_backgrounds')) {
            Schema::table('certificate_backgrounds', function (Blueprint $table) {
                if (! Schema::hasColumn('certificate_backgrounds', 'activity_id')) {
                    if (method_exists($table, 'foreignCustomUid')) {
                        $table->foreignCustomUid('activity_id')->nullable()->constrained('activities')->onDelete('cascade');
                    } else {
                        $table->char('activity_id', 6)->nullable()->index();
                        $table->foreign('activity_id')->references('id')->on('activities')->cascadeOnDelete();
                    }
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('certificate_backgrounds') && Schema::hasColumn('certificate_backgrounds', 'activity_id')) {
            Schema::table('certificate_backgrounds', function (Blueprint $table) {
                $table->dropForeign(['activity_id']);
                $table->dropColumn('activity_id');
            });
        }
    }
};
