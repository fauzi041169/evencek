<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AttendanceEndpointsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('activitirecords');
        Schema::dropIfExists('activitiusers');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('activities');
        Schema::dropIfExists('users');

        Schema::create('users', function ($table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->string('password')->nullable();
            $table->string('role')->nullable();
            $table->timestamps();
        });

        Schema::create('activities', function ($table) {
            $table->id();
            $table->string('name')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->date('date')->nullable();
            $table->timestamps();
        });

        Schema::create('attendances', function ($table) {
            $table->id();
            $table->unsignedBigInteger('activity_id');
            $table->string('name')->nullable();
            $table->string('jenis_absen')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('activitirecords', function ($table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('activity_id');
            $table->unsignedBigInteger('attendance_id');
            $table->integer('status')->default(1);
            $table->string('record_type')->nullable();
            $table->text('device_info')->nullable();
            $table->json('location')->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        Schema::create('activitiusers', function ($table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('activity_id');
            $table->integer('status')->default(1);
            $table->string('image_path')->nullable();
            $table->string('card_status')->nullable();
            $table->timestamps();
        });
    }

    public function test_toggle_attendance_creates_and_deletes_record(): void
    {
        $admin = User::create(['role' => 'admin']);
        $this->actingAs($admin);

        DB::table('activities')->insert(['id' => 1, 'name' => 'A', 'user_id' => $admin->id]);
        DB::table('attendances')->insert(['id' => 1, 'activity_id' => 1, 'name' => 'Manual', 'jenis_absen' => 'Manual']);
        $userId = DB::table('users')->insertGetId(['role' => 'user']);

        $respCreate = $this->postJson(route('attendance.toggle'), [
            'activity_id' => 1,
            'attendance_id' => 1,
            'user_id' => $userId,
        ]);
        $respCreate->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseHas('activitirecords', [
            'activity_id' => 1,
            'attendance_id' => 1,
            'user_id' => $userId,
            'status' => 1,
        ]);

        $respDelete = $this->postJson(route('attendance.toggle'), [
            'activity_id' => 1,
            'attendance_id' => 1,
            'user_id' => $userId,
        ]);
        $respDelete->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseMissing('activitirecords', [
            'activity_id' => 1,
            'attendance_id' => 1,
            'user_id' => $userId,
        ]);
    }

    public function test_record_status_set_and_clear(): void
    {
        $admin = User::create(['role' => 'admin']);
        $this->actingAs($admin);

        DB::table('activities')->insert(['id' => 2, 'name' => 'B', 'user_id' => $admin->id]);
        DB::table('attendances')->insert(['id' => 2, 'activity_id' => 2, 'name' => 'Manual', 'jenis_absen' => 'Manual']);
        $userId = DB::table('users')->insertGetId(['role' => 'user']);

        $set = $this->postJson(route('attendance.record.status'), [
            'activity_id' => 2,
            'attendance_id' => 2,
            'user_id' => $userId,
            'status' => 1,
        ]);
        $set->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseHas('activitirecords', [
            'activity_id' => 2,
            'attendance_id' => 2,
            'user_id' => $userId,
            'status' => 1,
            'record_type' => 'manual',
        ]);

        $clear = $this->postJson(route('attendance.record.status'), [
            'activity_id' => 2,
            'attendance_id' => 2,
            'user_id' => $userId,
            'status' => 0,
        ]);
        $clear->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseMissing('activitirecords', [
            'activity_id' => 2,
            'attendance_id' => 2,
            'user_id' => $userId,
        ]);
    }

    public function test_mark_all_present_marks_participants(): void
    {
        $admin = User::create(['role' => 'admin']);
        $this->actingAs($admin);

        DB::table('activities')->insert(['id' => 3, 'name' => 'C', 'user_id' => $admin->id]);
        DB::table('attendances')->insert(['id' => 3, 'activity_id' => 3, 'name' => 'Manual', 'jenis_absen' => 'Manual']);

        $u1 = DB::table('users')->insertGetId(['role' => 'user']);
        $u2 = DB::table('users')->insertGetId(['role' => 'user']);

        DB::table('activitiusers')->insert([
            ['user_id' => $u1, 'activity_id' => 3, 'status' => 1],
            ['user_id' => $u2, 'activity_id' => 3, 'status' => 1],
        ]);

        $resp = $this->postJson(route('attendance.mark.all.present'), [
            'attendance_id' => 3,
            'activity_id' => 3,
        ]);
        $resp->assertStatus(200)->assertJson(['success' => true]);

        $this->assertDatabaseHas('activitirecords', [
            'activity_id' => 3,
            'attendance_id' => 3,
            'user_id' => $u1,
            'status' => 1,
        ]);
        $this->assertDatabaseHas('activitirecords', [
            'activity_id' => 3,
            'attendance_id' => 3,
            'user_id' => $u2,
            'status' => 1,
        ]);
    }

    public function test_mandiri_attendance_records(): void
    {
        $user = User::create(['role' => 'user']);
        $this->actingAs($user);

        DB::table('activities')->insert(['id' => 4, 'name' => 'D', 'user_id' => $user->id]);
        DB::table('attendances')->insert(['id' => 4, 'activity_id' => 4, 'name' => 'Mandiri', 'jenis_absen' => 'Mandiri', 'description' => json_encode(['enabled' => true])]);
        DB::table('activitiusers')->insert(['user_id' => $user->id, 'activity_id' => 4, 'status' => 1]);

        $resp = $this->postJson(route('attendance.mandiri'), [
            'attendance_id' => 4,
            'activity_id' => 4,
        ]);
        $resp->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseHas('activitirecords', [
            'activity_id' => 4,
            'attendance_id' => 4,
            'user_id' => $user->id,
            'status' => 1,
            'record_type' => 'mandiri',
        ]);
    }

    public function test_last_record_returns_timestamp(): void
    {
        $admin = User::create(['role' => 'admin']);
        $this->actingAs($admin);

        DB::table('activities')->insert(['id' => 5, 'name' => 'E', 'user_id' => $admin->id]);
        DB::table('attendances')->insert(['id' => 5, 'activity_id' => 5, 'name' => 'Manual', 'jenis_absen' => 'Manual']);
        $userId = DB::table('users')->insertGetId(['role' => 'user']);

        DB::table('activitirecords')->insert([
            'activity_id' => 5,
            'attendance_id' => 5,
            'user_id' => $userId,
            'status' => 1,
            'record_type' => 'manual',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resp = $this->getJson(route('attendance.last.record', ['user_id' => $userId, 'activity_id' => 5]));
        $resp->assertStatus(200)->assertJsonStructure(['updated_at', 'marked_at']);
    }
}
