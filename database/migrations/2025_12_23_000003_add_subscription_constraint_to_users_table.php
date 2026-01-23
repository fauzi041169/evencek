<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        if (! Schema::hasTable('users')) {
            return;
        }

        $constraintExists = false;
        if (DB::getDriverName() === 'mysql') {
            $result = DB::select("
                SELECT CONSTRAINT_NAME
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'users'
                  AND CONSTRAINT_NAME = 'users_subscription_id_foreign'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            ");
            $constraintExists = ! empty($result);
        }

        if ($constraintExists) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'subscription_id')) {
                $table->foreign('subscription_id')->references('id')->on('subscriptions')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('users')) {
            return;
        }

        $constraintExists = false;
        if (DB::getDriverName() === 'mysql') {
            $result = DB::select("
                SELECT CONSTRAINT_NAME
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'users'
                  AND CONSTRAINT_NAME = 'users_subscription_id_foreign'
                  AND CONSTRAINT_TYPE = 'FOREIGN KEY'
            ");
            $constraintExists = ! empty($result);
        }

        if ($constraintExists) {
            Schema::table('users', function (Blueprint $table) {
                try {
                    $table->dropForeign(['subscription_id']);
                } catch (\Throwable $e) {
                }
            });
        }
    }
};
