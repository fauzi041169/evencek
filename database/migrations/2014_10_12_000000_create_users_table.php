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
        Schema::create('users', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            // Use explicit char primary key to avoid relying on blueprint macro
            // which may not be registered early in some test environments.
            $table->char('id', 6)->primary();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone')->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('email_verification_token', 64)->nullable();
            $table->string('password');
            $table->enum('role', ['guest', 'user', 'creator', 'admin', 'superadmin'])->default('guest');
            // Remove constrained() to avoid circular dependency with subscriptions table
            $table->foreignCustomUid('subscription_id')->nullable()->onDelete('set null');
            $table->string('google_id')->nullable()->unique();
            $table->string('avatar')->nullable();
            $table->string('subdomain')->nullable()->unique();
            $table->string('subdomain_logo')->nullable();
            $table->integer('logo_size')->nullable()->default(50);

            // Page settings
            $table->string('page_title')->nullable();
            $table->text('page_description')->nullable();
            $table->string('hero_background')->nullable();
            $table->integer('hero_opacity')->default(50);
            $table->string('hero_text_color', 16)->default('#ffffff');
            $table->string('hero_title_color', 16)->default('#ffffff');
            $table->string('hero_description_color', 16)->default('#ffffff');

            $table->timestamp('last_login_at')->nullable();
            $table->rememberToken();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activitiusers');
        Schema::dropIfExists('users');
    }
};
