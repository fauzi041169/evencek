<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update old paths to new paths
        DB::statement("UPDATE payment_channels SET icon_url = REPLACE(icon_url, 'images/payment-channels/', 'assets/images/payment-channels/') WHERE icon_url LIKE 'images/payment-channels/%'");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert new paths to old paths
        DB::statement("UPDATE payment_channels SET icon_url = REPLACE(icon_url, 'assets/images/payment-channels/', 'images/payment-channels/') WHERE icon_url LIKE 'assets/images/payment-channels/%'");
    }
};
