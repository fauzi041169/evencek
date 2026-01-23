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
        Schema::table('activity_rundowns', function (Blueprint $table) {
            if (! Schema::hasColumn('activity_rundowns', 'rundown_date')) {
                $table->date('rundown_date')->nullable()->after('activity_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activity_rundowns', function (Blueprint $table) {
            if (Schema::hasColumn('activity_rundowns', 'rundown_date')) {
                $table->dropColumn('rundown_date');
            }
        });
    }
};
