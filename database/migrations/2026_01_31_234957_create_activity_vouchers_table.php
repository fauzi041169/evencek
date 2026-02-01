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
        Schema::create('activity_vouchers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignCustomUid('activity_id')->constrained('activities')->onDelete('cascade');
            $table->string('code');
            $table->integer('usage_limit')->nullable();
            $table->integer('usage_count')->default(0);
            $table->timestamp('valid_until')->nullable();
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Unique code per activity
            $table->unique(['activity_id', 'code']);
        });

        // Migrate existing data
        // Migrate existing data
        $activities = \Illuminate\Support\Facades\DB::table('activities')
            ->whereNotNull('committee_voucher_code')
            ->where('committee_voucher_code', '!=', '')
            ->get();

        foreach ($activities as $activity) {
            \Illuminate\Support\Facades\DB::table('activity_vouchers')->insert([
                'id' => \Illuminate\Support\Str::uuid(),
                'activity_id' => $activity->id,
                'code' => $activity->committee_voucher_code,
                'usage_limit' => $activity->committee_voucher_usage_limit,
                'usage_count' => $activity->committee_voucher_usage_count ?? 0,
                // Note: valid_until might need casting if it's already a timestamp string
                'valid_until' => $activity->committee_voucher_valid_until,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_vouchers');
    }
};
