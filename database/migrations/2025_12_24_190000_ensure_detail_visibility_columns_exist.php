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
            // We generally don't want to drop columns in a "ensure" migration if they might have existed before,
            // but for symmetry we can list them. However, since the previous migration also claims to handle them,
            // this might be tricky. Let's just leave down empty or drop if we are sure.
            // Safe to leave empty or careful drop.
            $columnsToDrop = [];
            if (Schema::hasColumn('activities', 'detail_gallery_visible')) {
                $columnsToDrop[] = 'detail_gallery_visible';
            }
            if (Schema::hasColumn('activities', 'detail_description_visible')) {
                $columnsToDrop[] = 'detail_description_visible';
            }
            if (Schema::hasColumn('activities', 'detail_comments_visible')) {
                $columnsToDrop[] = 'detail_comments_visible';
            }
            if (Schema::hasColumn('activities', 'detail_participants_visible')) {
                $columnsToDrop[] = 'detail_participants_visible';
            }

            if (! empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
