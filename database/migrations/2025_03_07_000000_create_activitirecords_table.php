<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateActivitirecordsTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        if (! Schema::hasTable('activitirecords')) {
            Schema::create('activitirecords', function (Blueprint $table) {
                $table->customUid();
                $table->foreignCustomUid('user_id')->constrained('users');
                $table->foreignCustomUid('activity_id')->constrained('activities');
                $table->foreignCustomUid('activity_batch_id')->nullable()->constrained('activity_batches')->nullOnDelete();
                $table->foreignCustomUid('attendance_id')->constrained('attendances');
                $table->integer('status');
                $table->string('device_info')->nullable();
                $table->json('location')->nullable();
                $table->string('record_type');
                $table->string('description')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('activitirecords');
    }
}
