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
        Schema::dropIfExists('facilities');
        Schema::dropIfExists('schools');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // We cannot easily recreate the tables without the original structure.
        // Since we are deleting them as per request, we leave down() empty or could try to recreate basic structure if needed,
        // but typically for cleanup migrations, down() might not be fully reversible if original migrations are lost/deleted.
    }
};
