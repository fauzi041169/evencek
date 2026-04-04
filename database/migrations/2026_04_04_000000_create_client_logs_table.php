<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('client_logs')) {
            Schema::create('client_logs', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('level', 16)->default('info')->index();
                $table->text('message');
                $table->json('context')->nullable();
                $table->json('tags')->nullable();
                $table->string('source', 32)->default('web')->index();
                $table->string('url')->nullable();
                $table->text('user_agent')->nullable();
                $table->ipAddress('ip')->nullable();
                $table->foreignCustomUid('user_id')->nullable()->index();
                $table->timestamp('occurred_at')->nullable()->index();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
                $table->index(['created_at', 'level'], 'client_logs_created_level_index');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('client_logs');
    }
};

