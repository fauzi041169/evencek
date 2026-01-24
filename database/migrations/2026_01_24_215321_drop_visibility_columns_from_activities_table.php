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
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn([
                'detail_description_visible',
                'detail_gallery_visible',
                'detail_comments_visible',
                'detail_participants_visible',
                'detail_materials_visible',
                'detail_speakers_visible',
                'detail_rundown_visible',
                'show_gallery',
                'description_visible',
                'enable_comments',
                'rundown_visible',
                'participants_visible',
                'materials_visible',
                'speakers_visible',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->boolean('detail_description_visible')->default(true);
            $table->boolean('detail_gallery_visible')->default(true);
            $table->boolean('detail_comments_visible')->default(true);
            $table->boolean('detail_participants_visible')->default(true);
            $table->boolean('detail_materials_visible')->default(true);
            $table->boolean('detail_speakers_visible')->default(true);
            $table->boolean('detail_rundown_visible')->default(true);
            $table->boolean('show_gallery')->default(true);
            $table->boolean('description_visible')->default(true);
            $table->boolean('enable_comments')->default(true);
            $table->boolean('rundown_visible')->default(true);
            $table->boolean('participants_visible')->default(true);
            $table->boolean('materials_visible')->default(true);
            $table->boolean('speakers_visible')->default(true);
        });
    }
};
