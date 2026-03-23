<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// This model doesn't exist yet but we'll create it before running migration or use DB facade

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('custom_fields')) {
            Schema::create('custom_fields', function (Blueprint $table) {
                $table->id();
                $table->string('label');
                $table->string('key')->unique(); // e.g., ukuran_kaos
                $table->string('type')->default('text'); // text, dropdown, number, date
                $table->text('options')->nullable(); // For dropdown options (comma separated or JSON)
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('activity_custom_field')) {
            Schema::create('activity_custom_field', function (Blueprint $table) {
                $table->id();
                $table->foreignCustomUid('activity_id')->constrained('activities')->onDelete('cascade');
                $table->foreignId('custom_field_id')->constrained('custom_fields')->onDelete('cascade');
                $table->boolean('is_required')->default(false);
                $table->timestamps();
            });
        }

        // Migrate existing data
        // We use DB facade to avoid dependency on Models that might change or not exist yet
        // Check if column exists first before trying to read from it
        if (Schema::hasColumn('activities', 'custom_fields')) {
            $activities = DB::table('activities')->select('id', 'custom_fields')->get();

            foreach ($activities as $activity) {
                if (! empty($activity->custom_fields)) {
                    $fields = json_decode($activity->custom_fields, true);
                    if (is_array($fields)) {
                        foreach ($fields as $field) {
                            // Normalize key from label if key is missing
                            $label = $field['label'] ?? 'Unknown';
                            $key = $field['key'] ?? \Illuminate\Support\Str::slug($label, '_');
                            $type = $field['type'] ?? 'text';
                            $options = $field['options'] ?? null;

                            // Check if exists using DB to be safe
                            $customField = DB::table('custom_fields')->where('key', $key)->first();

                            if (! $customField) {
                                $id = DB::table('custom_fields')->insertGetId([
                                    'label' => $label,
                                    'key' => $key,
                                    'type' => $type,
                                    'options' => $options,
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                                $customFieldId = $id;
                            } else {
                                $customFieldId = $customField->id;
                            }

                            // Attach to activity
                            $exists = DB::table('activity_custom_field')
                                ->where('activity_id', $activity->id)
                                ->where('custom_field_id', $customFieldId)
                                ->exists();

                            if (! $exists) {
                                DB::table('activity_custom_field')->insert([
                                    'activity_id' => $activity->id,
                                    'custom_field_id' => $customFieldId,
                                    'is_required' => ! empty($field['is_required']),
                                    'created_at' => now(),
                                    'updated_at' => now(),
                                ]);
                            }
                        }
                    }
                }
            }

            // Drop the old column
            Schema::table('activities', function (Blueprint $table) {
                $table->dropColumn('custom_fields');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Restore the column
        Schema::table('activities', function (Blueprint $table) {
            $table->json('custom_fields')->nullable();
        });

        Schema::dropIfExists('activity_custom_field');
        Schema::dropIfExists('custom_fields');
    }
};
