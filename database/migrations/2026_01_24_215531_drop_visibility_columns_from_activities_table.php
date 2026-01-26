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
        /*
        Schema::table('activities', function (Blueprint $table) {
            $columns = [
                'detail_description_visible',
                'detail_gallery_visible',
                'detail_comments_visible',
                'detail_participants_visible',
                'detail_materials_visible',
                'detail_speakers_visible',
                'detail_rundown_visible',
                'description_visible',
                'participants_visible',
                'speakers_visible',
                'show_gallery',
                'rundown_visible',
                'materials_visible',
                'groups_visible',
            ];
            
            $toDrop = [];
            foreach ($columns as $col) {
                if (Schema::hasColumn('activities', $col)) {
                    $toDrop[] = $col;
                }
            }
            
            if (!empty($toDrop)) {
                $table->dropColumn($toDrop);
            }
        });
        */
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            if (!Schema::hasColumn('activities', 'detail_description_visible')) $table->boolean('detail_description_visible')->default(true);
            if (!Schema::hasColumn('activities', 'detail_gallery_visible')) $table->boolean('detail_gallery_visible')->default(true);
            if (!Schema::hasColumn('activities', 'detail_comments_visible')) $table->boolean('detail_comments_visible')->default(true);
            if (!Schema::hasColumn('activities', 'detail_participants_visible')) $table->boolean('detail_participants_visible')->default(true);
            if (!Schema::hasColumn('activities', 'detail_materials_visible')) $table->boolean('detail_materials_visible')->default(true);
            if (!Schema::hasColumn('activities', 'detail_speakers_visible')) $table->boolean('detail_speakers_visible')->default(true);
            if (!Schema::hasColumn('activities', 'detail_rundown_visible')) $table->boolean('detail_rundown_visible')->default(true);
            if (!Schema::hasColumn('activities', 'description_visible')) $table->boolean('description_visible')->default(true);
            if (!Schema::hasColumn('activities', 'participants_visible')) $table->boolean('participants_visible')->default(true);
            if (!Schema::hasColumn('activities', 'speakers_visible')) $table->boolean('speakers_visible')->default(true);
            if (!Schema::hasColumn('activities', 'show_gallery')) $table->boolean('show_gallery')->default(true);
            if (!Schema::hasColumn('activities', 'rundown_visible')) $table->boolean('rundown_visible')->default(true);
            if (!Schema::hasColumn('activities', 'materials_visible')) $table->boolean('materials_visible')->default(true);
            if (!Schema::hasColumn('activities', 'groups_visible')) $table->boolean('groups_visible')->default(true);
        });
    }
};
