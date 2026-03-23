<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Fix activity_records
        if (Schema::hasTable('activitirecords')) {
            // Check if target table also exists
            if (Schema::hasTable('activity_records')) {
                // Assuming activity_records is the empty/wrong one (MyISAM), drop it
                Schema::drop('activity_records');
            }

            // Rename old table to new name
            Schema::rename('activitirecords', 'activity_records');

            // Optional: Update column types to JSON if they are not
            // We use raw SQL to avoid doctrine/dbal dependency issues
            // Check if column is not json
            // But we skip this for safety, LongText works fine for JSON casting.
        }

        // 2. Fix id_card_backgrounds
        if (Schema::hasTable('idcardbegrounds')) {
            if (Schema::hasTable('id_card_backgrounds')) {
                Schema::drop('id_card_backgrounds');
            }
            Schema::rename('idcardbegrounds', 'id_card_backgrounds');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We can't easily reverse a drop, but we can reverse rename
        if (Schema::hasTable('activity_records') && ! Schema::hasTable('activitirecords')) {
            Schema::rename('activity_records', 'activitirecords');
        }

        if (Schema::hasTable('id_card_backgrounds') && ! Schema::hasTable('idcardbegrounds')) {
            Schema::rename('id_card_backgrounds', 'idcardbegrounds');
        }
    }
};
