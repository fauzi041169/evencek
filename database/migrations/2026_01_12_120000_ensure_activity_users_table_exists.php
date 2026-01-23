<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('activity_users')) {
            Schema::create('activity_users', function (Blueprint $table) {
                $table->engine = 'InnoDB';

                $table->customUid();
                $table->foreignCustomUid('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignCustomUid('activity_id')->constrained('activities')->cascadeOnDelete();
                $table->foreignCustomUid('activity_batch_id')->nullable()->index();
                $table->integer('status')->default(0)->index('activity_users_status_index');
                $table->integer('print_count')->default(0);
                $table->json('custom_data')->nullable();
                $table->string('card_status', 32)->nullable();
                $table->string('certificate_id', 64)->nullable()->unique();
                $table->foreignCustomUid('activity_participant_group_id')->nullable()->index();
                $table->timestamps();

                $table->index(['user_id', 'activity_id'], 'activity_users_user_activity_index');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_users');
    }
};
