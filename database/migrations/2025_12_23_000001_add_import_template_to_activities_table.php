<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (Schema::hasTable('activities') && ! Schema::hasColumn('activities', 'import_template')) {
            Schema::table('activities', function (Blueprint $table) {
                $table->text('import_template')->nullable()->after('enable_comments');
            });
        }
    }

    public function down()
    {
        if (Schema::hasTable('activities') && Schema::hasColumn('activities', 'import_template')) {
            Schema::table('activities', function (Blueprint $table) {
                $table->dropColumn('import_template');
            });
        }
    }
};
