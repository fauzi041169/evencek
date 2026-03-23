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
        $tables = ['activity_users', 'activitiusers'];
        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (! Schema::hasColumn($tableName, 'created_by')) {
                        $table->char('created_by', 6)->nullable()->index();
                    }
                    if (! Schema::hasColumn($tableName, 'updated_by')) {
                        $table->char('updated_by', 6)->nullable()->index();
                    }
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $tables = ['activity_users', 'activitiusers'];
        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    if (Schema::hasColumn($tableName, 'created_by')) {
                        $table->dropColumn('created_by');
                    }
                    if (Schema::hasColumn($tableName, 'updated_by')) {
                        $table->dropColumn('updated_by');
                    }
                });
            }
        }
    }
};
