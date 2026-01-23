<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->engine = 'InnoDB';
            $table->customUid();
            $table->foreignCustomUid('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('card_buttons_for_admin_visible')->default(false);
            $table->text('materi')->nullable();
            $table->foreignCustomUid('category_id')->constrained();
            $table->date('date');
            $table->date('end_date')->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('location');
            $table->decimal('price', 10, 2)->default(0);
            $table->enum('payment_method_type', ['manual', 'automatic'])->default('manual');
            $table->string('status')->default('private');
            $table->string('image')->nullable();
            $table->boolean('show_price')->default(true);

            // Visibility settings
            $table->boolean('rundown_visible')->default(true);
            $table->boolean('materials_visible')->default(true);
            $table->boolean('rooms_visible')->default(true);
            $table->boolean('show_gallery')->default(true);
            $table->boolean('enable_comments')->default(true);

            $table->integer('pendaftaran')->default(0); // 0: belum dibuka, 1: dibuka, 2: ditutup
            $table->boolean('hero_pinned')->default(false)->index();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('activities');
    }
};
