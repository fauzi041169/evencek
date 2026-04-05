<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('activity_users')) {
            return;
        }
        Schema::table('activity_users', function (Blueprint $table) {
            if (! Schema::hasColumn('activity_users', 'deleted_at')) {
                $table->softDeletes();
                $table->index('deleted_at');
            }
            if (! Schema::hasColumn('activity_users', 'deleted_by')) {
                $table->char('deleted_by', 6)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('activity_users', function (Blueprint $table) {
            if (Schema::hasColumn('activity_users', 'deleted_by')) {
                $table->dropColumn('deleted_by');
            }
            if (Schema::hasColumn('activity_users', 'deleted_at')) {
                $table->dropIndex(['deleted_at']);
                $table->dropSoftDeletes();
            }
        });
    }
};
