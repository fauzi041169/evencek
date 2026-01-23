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
        Schema::table('activities', function (Blueprint $table) {
            if (! Schema::hasColumn('activities', 'participants_visible')) {
                $table->boolean('participants_visible')->default(true)->after('description');
            }
            if (! Schema::hasColumn('activities', 'description_visible')) {
                $table->boolean('description_visible')->default(true)->after('participants_visible');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('activities', 'participants_visible')) {
                $columnsToDrop[] = 'participants_visible';
            }
            if (Schema::hasColumn('activities', 'description_visible')) {
                $columnsToDrop[] = 'description_visible';
            }

            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
