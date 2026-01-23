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
        Schema::create('performance_logs', function (Blueprint $table) {
            $table->customUid();
            $table->string('route_name')->nullable();
            $table->string('method', 10)->index();
            $table->string('uri')->index();
            $table->unsignedSmallInteger('status_code')->nullable();
            $table->unsignedInteger('duration_ms')->index();
            $table->unsignedInteger('query_count')->default(0);
            $table->unsignedInteger('query_time_ms')->default(0);
            $table->decimal('memory_mb', 8, 2)->nullable();
            $table->char('user_id', 6)->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('performance_logs');
    }
};
