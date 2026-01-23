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
        Schema::create('subscription_plans', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->customUid();
            $table->string('name'); // Basic, Pro, Enterprise
            $table->string('slug')->unique(); // basic, pro, enterprise
            $table->text('description')->nullable();
            $table->decimal('price', 10, 2); // Harga per bulan
            $table->integer('max_activities')->nullable(); // null = unlimited
            $table->integer('max_users')->nullable(); // null = unlimited
            $table->integer('max_news')->nullable(); // null = unlimited
            $table->integer('max_participants_per_activity')->nullable(); // Maksimal peserta per acara
            $table->integer('max_committees_per_activity')->nullable(); // Maksimal panitia per acara
            $table->boolean('has_analytics')->default(false);
            $table->boolean('has_custom_branding')->default(false);
            $table->boolean('has_api_access')->default(false);
            $table->boolean('has_priority_support')->default(false);
            $table->boolean('has_white_label')->default(false);
            $table->json('features')->nullable(); // Fitur tambahan dalam format JSON
            $table->integer('trial_days')->default(0); // Hari trial gratis
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_plans');
    }
};
