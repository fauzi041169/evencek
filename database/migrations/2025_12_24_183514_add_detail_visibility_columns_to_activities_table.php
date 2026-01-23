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
            if (! Schema::hasColumn('activities', 'detail_gallery_visible')) {
                $table->boolean('detail_gallery_visible')->default(true);
            }
            if (! Schema::hasColumn('activities', 'detail_description_visible')) {
                $table->boolean('detail_description_visible')->default(true);
            }
            if (! Schema::hasColumn('activities', 'detail_comments_visible')) {
                $table->boolean('detail_comments_visible')->default(true);
            }
            if (! Schema::hasColumn('activities', 'detail_participants_visible')) {
                $table->boolean('detail_participants_visible')->default(true);
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            if (Schema::hasColumn('activities', 'detail_gallery_visible')) {
                $table->dropColumn('detail_gallery_visible');
            }
            if (Schema::hasColumn('activities', 'detail_description_visible')) {
                $table->dropColumn('detail_description_visible');
            }
            if (Schema::hasColumn('activities', 'detail_comments_visible')) {
                $table->dropColumn('detail_comments_visible');
            }
            if (Schema::hasColumn('activities', 'detail_participants_visible')) {
                $table->dropColumn('detail_participants_visible');
            }
        });
    }
};
