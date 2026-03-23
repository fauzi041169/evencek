<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->decimal('price', 12, 2)->default(0)->change();
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->decimal('amount', 12, 2)->change();
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->decimal('price', 10, 2)->default(0)->change();
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->decimal('amount', 10, 2)->change();
        });
    }
};
