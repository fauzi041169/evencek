<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payment_channels', function (Blueprint $table) {
            if (! Schema::hasColumn('payment_channels', 'code')) {
                $table->string('code')->nullable()->after('id');
            }

            if (! Schema::hasColumn('payment_channels', 'description')) {
                $table->text('description')->nullable()->after('type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('payment_channels', function (Blueprint $table) {
            if (Schema::hasColumn('payment_channels', 'code')) {
                $table->dropColumn('code');
            }

            if (Schema::hasColumn('payment_channels', 'description')) {
                $table->dropColumn('description');
            }
        });
    }
};
