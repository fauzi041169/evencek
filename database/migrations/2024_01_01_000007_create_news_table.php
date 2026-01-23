<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('news', function (Blueprint $table) {
            $table->customUid();
            $table->string('title');
            $table->string('slug')->unique();
            $table->foreignCustomUid('category_id')->constrained('categories')->onDelete('cascade');
            $table->text('content');
            $table->string('image')->nullable();
            $table->string('video_embed_url', 500)->nullable();
            $table->string('status')->default('draft');
            $table->boolean('featured')->default(false);
            $table->integer('views_count')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->foreignCustomUid('author_id')->constrained('users')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('news');
    }
};
