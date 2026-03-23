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
            $table->integer('committee_voucher_usage_limit')->nullable()->after('committee_voucher_code');
            $table->integer('committee_voucher_usage_count')->default(0)->after('committee_voucher_usage_limit');
            $table->dateTime('committee_voucher_valid_until')->nullable()->after('committee_voucher_usage_count');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn([
                'committee_voucher_usage_limit',
                'committee_voucher_usage_count',
                'committee_voucher_valid_until',
            ]);
        });
    }
};
