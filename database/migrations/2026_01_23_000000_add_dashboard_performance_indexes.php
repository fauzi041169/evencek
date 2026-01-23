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
        // 1. Activities Table
        Schema::table('activities', function (Blueprint $table) {
            // Index for global latest activities queries
            try {
                $table->index('created_at', 'activities_created_at_index');
            } catch (\Exception $e) {
                // Index likely exists
            }
            
            // Index for creator dashboard charts
            try {
                $table->index(['user_id', 'created_at'], 'activities_user_id_created_at_index');
            } catch (\Exception $e) {
                // Index likely exists
            }
        });

        // 2. News Table
        if (Schema::hasTable('news')) {
            Schema::table('news', function (Blueprint $table) {
                try {
                    $table->index('created_at', 'news_created_at_index');
                } catch (\Exception $e) {
                    // Index likely exists
                }
            });
        }

        // 3. Activity Users Table
        $auTables = ['activity_users', 'activitiusers'];
        foreach ($auTables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    $indexName = $tableName . '_user_id_created_at_index';
                    try {
                        $table->index(['user_id', 'created_at'], $indexName);
                    } catch (\Exception $e) {
                        // Index likely exists
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
        Schema::table('activities', function (Blueprint $table) {
            try {
                $table->dropIndex('activities_created_at_index');
            } catch (\Exception $e) {}
            
            try {
                $table->dropIndex('activities_user_id_created_at_index');
            } catch (\Exception $e) {}
        });

        if (Schema::hasTable('news')) {
            Schema::table('news', function (Blueprint $table) {
                try {
                    $table->dropIndex('news_created_at_index');
                } catch (\Exception $e) {}
            });
        }

        $auTables = ['activity_users', 'activitiusers'];
        foreach ($auTables as $tableName) {
            if (Schema::hasTable($tableName)) {
                Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                    $indexName = $tableName . '_user_id_created_at_index';
                    try {
                        $table->dropIndex($indexName);
                    } catch (\Exception $e) {}
                });
            }
        }
    }
};
