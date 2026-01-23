<?php

use Illuminate\Database\Migrations\Migration;
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

        if (! Schema::hasTable('editable_contents')) {
            return;
        }

        try {
            DB::statement('ALTER TABLE editable_contents MODIFY updated_by CHAR(6) NULL');
        } catch (\Throwable $e) {
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        if (! Schema::hasTable('editable_contents')) {
            return;
        }

        try {
            DB::statement('ALTER TABLE editable_contents MODIFY updated_by BIGINT UNSIGNED NULL');
        } catch (\Throwable $e) {
        }
    }
};
