<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Migrate Data (Smart Migration)
        if (Schema::hasTable('activities')) {
            $activities = DB::table('activities')->get();
            foreach ($activities as $activity) {
                $updates = [];
                
                // Migrate visibility columns to visible_sections JSON
                if (empty($activity->visible_sections)) {
                    $visibleSections = [];
                    // Mapping old boolean columns to new JSON keys
                    $map = [
                        'description_visible' => 'description',
                        'detail_description_visible' => 'description',
                        'participants_visible' => 'participants',
                        'detail_participants_visible' => 'participants',
                        'speakers_visible' => 'speakers',
                        'detail_speakers_visible' => 'speakers',
                        'show_gallery' => 'gallery',
                        'detail_gallery_visible' => 'gallery',
                        'rundown_visible' => 'rundown',
                        'detail_rundown_visible' => 'rundown',
                        'materials_visible' => 'materials',
                        'detail_materials_visible' => 'materials',
                        'groups_visible' => 'groups',
                        'detail_comments_visible' => 'comments',
                    ];

                    foreach ($map as $col => $key) {
                        if (property_exists($activity, $col)) {
                            // If any of the mapped columns is true, set the section to true
                            // (OR logic if multiple columns map to same key, though usually only one set exists)
                            if ($activity->$col) {
                                $visibleSections[$key] = true;
                            } elseif (!isset($visibleSections[$key])) {
                                $visibleSections[$key] = false;
                            }
                        }
                    }
                    
                    // If we found any mapping, update the JSON
                    if (!empty($visibleSections)) {
                        $updates['visible_sections'] = json_encode($visibleSections);
                    }
                }
                
                // Migrate 'materi' text to ActivityMaterial if not empty
                if (property_exists($activity, 'materi') && !empty($activity->materi)) {
                    // Check if this content is already in activity_materials to avoid duplication?
                    // It's hard to check for text content equivalence.
                    // We'll just create a new record if it looks like a file path or substantial text.
                    
                    // Generate a custom UID for the new material
                    $uid = $this->generateCustomUid();
                    
                    try {
                        DB::table('activity_materials')->insert([
                            'id' => $uid,
                            'activity_id' => $activity->id,
                            'name' => 'Materi (Legacy)',
                            'description' => 'Migrated from legacy materi column',
                            'file_path' => $activity->materi, // Assuming it might be a path or text
                            'file_name' => basename($activity->materi),
                            'file_type' => 'legacy',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } catch (\Exception $e) {
                        // Ignore if fails
                    }
                }

                if (!empty($updates)) {
                    DB::table('activities')->where('id', $activity->id)->update($updates);
                }
            }
        }

        // 2. Drop Columns
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
                'materi', // Redundant text column
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
    }

    private function generateCustomUid()
    {
        $letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numbers = '0123456789';
        do {
            $randomLetters = '';
            for ($i = 0; $i < 3; $i++) {
                $randomLetters .= $letters[rand(0, strlen($letters) - 1)];
            }
            $randomNumbers = '';
            for ($i = 0; $i < 3; $i++) {
                $randomNumbers .= $numbers[rand(0, strlen($numbers) - 1)];
            }
            $combined = str_split($randomLetters.$randomNumbers);
            shuffle($combined);
            $uid = implode('', $combined);
        } while (DB::table('activity_materials')->where('id', $uid)->exists());
        
        return $uid;
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            // Restore columns if needed (simplified restoration with default values)
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
            if (!Schema::hasColumn('activities', 'materi')) $table->text('materi')->nullable();
        });
    }
};
