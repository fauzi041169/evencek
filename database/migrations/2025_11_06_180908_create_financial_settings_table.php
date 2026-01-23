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
        Schema::create('financial_settings', function (Blueprint $table) {
            $table->customUid();
            // Persentase biaya admin per transaksi (0-100)
            $table->decimal('admin_fee_percent', 5, 2)->default(0);
            // Nominal biaya admin tetap per transaksi (rupiah)
            $table->char('admin_fee_flat', 6)->default(0);
            // Tipe biaya admin: 'flat' atau 'percent'
            $table->string('admin_fee_type', 20)->default('flat');
            // Potongan tetap tambahan khusus transaksi otomatis (Midtrans)
            $table->char('auto_fixed_deduction', 6)->default(0);
            $table->char('min_auto_price', 6)->default(15000);
            // Placeholder kolom untuk aturan diskon dan voucher (JSON)
            $table->json('discount_rules')->nullable();
            $table->json('voucher_rules')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('financial_settings');
    }
};
