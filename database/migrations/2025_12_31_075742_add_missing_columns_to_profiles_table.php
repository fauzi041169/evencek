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
        Schema::table('profiles', function (Blueprint $table) {
            if (! Schema::hasColumn('profiles', 'nik')) {
                $table->string('nik', 20)->nullable()->after('no_hp');
            }
            if (! Schema::hasColumn('profiles', 'birth_place')) {
                $table->string('birth_place')->nullable()->after('jenis_kelamin');
            }
            if (! Schema::hasColumn('profiles', 'birth_date')) {
                $table->date('birth_date')->nullable()->after('birth_place');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('profiles', 'nik')) {
                $columnsToDrop[] = 'nik';
            }
            if (Schema::hasColumn('profiles', 'birth_place')) {
                $columnsToDrop[] = 'birth_place';
            }
            if (Schema::hasColumn('profiles', 'birth_date')) {
                $columnsToDrop[] = 'birth_date';
            }

            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
