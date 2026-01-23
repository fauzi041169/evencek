<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('activity_hotel_rooms')) {
            Schema::create('activity_hotel_rooms', function (Blueprint $table) {
                $table->customUid();
                $table->char('activity_id', 6)->index();
                $table->foreignCustomUid('activity_batch_id')->nullable()->constrained('activity_batches')->nullOnDelete();
                $table->string('hotel_name', 128)->nullable()->index();
                $table->string('room_number', 64)->index();
                $table->unsignedInteger('capacity')->default(1);
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('activity_hotel_room_assignments')) {
            Schema::create('activity_hotel_room_assignments', function (Blueprint $table) {
                $table->customUid();
                $table->char('activity_id', 6)->index();
                $table->foreignCustomUid('activity_batch_id')->nullable()->constrained('activity_batches')->nullOnDelete();
                $table->char('room_id', 6)->index();
                $table->char('user_id', 6)->index();
                $table->timestamps();
                $table->unique(['room_id', 'user_id'], 'room_user_unique');
                $table->index(['activity_id', 'room_id'], 'activity_room_index');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_hotel_room_assignments');
        Schema::dropIfExists('activity_hotel_rooms');
    }
};
