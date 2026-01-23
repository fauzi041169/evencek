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
        Schema::create('views', function (Blueprint $table) {
            $table->customUid();
            $table->string('page_id')->nullable();
            $table->foreignCustomUid('user_id')->nullable()->constrained()->onDelete('set null');
            $table->string('ip_address')->nullable();
            $table->timestamps();

            $table->index('page_id', 'views_page_id_index');
            $table->index('user_id', 'views_user_id_index');
            $table->index('ip_address', 'views_ip_address_index');
            $table->index('created_at', 'views_created_at_index');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('views');
    }
};
