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

        Schema::dropIfExists('activity_records');
        Schema::dropIfExists('activity_users');
        Schema::dropIfExists('attendances');
        Schema::dropIfExists('activities');
        Schema::dropIfExists('profiles');
        Schema::dropIfExists('users');

        Schema::create('users', function ($table) {
            $table->char('id', 6)->primary();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->string('password')->nullable();
            $table->string('role')->nullable();
            $table->timestamps();
        });

        Schema::create('profiles', function ($table) {
            $table->char('id', 6)->primary();
            $table->char('user_id', 6)->nullable();
            $table->string('foto')->nullable();
            $table->string('no_hp')->nullable();
            $table->timestamps();
        });

        Schema::create('activities', function ($table) {
            $table->char('id', 6)->primary();
            $table->string('uid')->nullable();
            $table->string('name')->nullable();
            $table->char('user_id', 6)->nullable();
            $table->date('date')->nullable();
            $table->timestamps();
        });

        Schema::create('attendances', function ($table) {
            $table->char('id', 6)->primary();
            $table->char('activity_id', 6);
            $table->string('name')->nullable();
            $table->string('jenis_absen')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('activity_records', function ($table) {
            $table->char('id', 6)->primary();
            $table->char('user_id', 6);
            $table->char('activity_id', 6);
            $table->char('attendance_id', 6);
            $table->char('activity_batch_id', 6)->nullable();
            $table->integer('status')->default(1);
            $table->string('record_type')->nullable();
            $table->text('device_info')->nullable();
            $table->json('location')->nullable();
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });

        Schema::create('activity_users', function ($table) {
            $table->char('id', 6)->primary();
            $table->char('user_id', 6);
            $table->char('activity_id', 6);
            $table->char('activity_batch_id', 6)->nullable();
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

        DB::table('activities')->insert(['id' => 'A1B2C3', 'name' => 'A', 'user_id' => $admin->id]);
        DB::table('attendances')->insert(['id' => 'T1E2S3', 'activity_id' => 'A1B2C3', 'name' => 'Manual', 'jenis_absen' => 'Manual']);
        $userId = User::create(['role' => 'user'])->id;

        $respCreate = $this->postJson(route('attendance.toggle'), [
            'activity_id' => 'A1B2C3',
            'attendance_id' => 'T1E2S3',
            'user_id' => $userId,
        ]);
        $respCreate->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseHas('activity_records', [
            'activity_id' => 'A1B2C3',
            'attendance_id' => 'T1E2S3',
            'user_id' => $userId,
            'status' => 1,
        ]);

        $respDelete = $this->postJson(route('attendance.toggle'), [
            'activity_id' => 'A1B2C3',
            'attendance_id' => 'T1E2S3',
            'user_id' => $userId,
        ]);
        $respDelete->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseMissing('activity_records', [
            'activity_id' => 'A1B2C3',
            'attendance_id' => 'T1E2S3',
            'user_id' => $userId,
        ]);
    }

    public function test_record_status_set_and_clear(): void
    {
        $admin = User::create(['role' => 'admin']);
        $this->actingAs($admin);

        DB::table('activities')->insert(['id' => 'B1C2D3', 'name' => 'B', 'user_id' => $admin->id]);
        DB::table('attendances')->insert(['id' => 'S1T2A3', 'activity_id' => 'B1C2D3', 'name' => 'Manual', 'jenis_absen' => 'Manual']);
        $userId = User::create(['role' => 'user'])->id;

        $set = $this->postJson(route('attendance.record.status'), [
            'activity_id' => 'B1C2D3',
            'attendance_id' => 'S1T2A3',
            'user_id' => $userId,
            'status' => 1,
        ]);
        $set->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseHas('activity_records', [
            'activity_id' => 'B1C2D3',
            'attendance_id' => 'S1T2A3',
            'user_id' => $userId,
            'status' => 1,
            'record_type' => 'manual',
        ]);

        $clear = $this->postJson(route('attendance.record.status'), [
            'activity_id' => 'B1C2D3',
            'attendance_id' => 'S1T2A3',
            'user_id' => $userId,
            'status' => 0,
        ]);
        $clear->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseMissing('activity_records', [
            'activity_id' => 'B1C2D3',
            'attendance_id' => 'S1T2A3',
            'user_id' => $userId,
        ]);
    }

    public function test_mark_all_present_marks_participants(): void
    {
        $admin = User::create(['role' => 'admin']);
        $this->actingAs($admin);

        DB::table('activities')->insert(['id' => 'C1D2E3', 'name' => 'C', 'user_id' => $admin->id]);
        DB::table('attendances')->insert(['id' => 'A7B8C9', 'activity_id' => 'C1D2E3', 'name' => 'Manual', 'jenis_absen' => 'Manual']);

        $u1 = User::create(['role' => 'user'])->id;
        $u2 = User::create(['role' => 'user'])->id;

        DB::table('activity_users')->insert([
            ['id' => 'U1A2B3', 'user_id' => $u1, 'activity_id' => 'C1D2E3', 'status' => 1],
            ['id' => 'U1A2B4', 'user_id' => $u2, 'activity_id' => 'C1D2E3', 'status' => 1],
        ]);

        $resp = $this->postJson(route('attendance.mark.all.present'), [
            'attendance_id' => 'A7B8C9',
            'activity_id' => 'C1D2E3',
        ]);
        $resp->assertStatus(200)->assertJson(['success' => true]);

        $this->assertDatabaseHas('activity_records', [
            'activity_id' => 'C1D2E3',
            'attendance_id' => 'A7B8C9',
            'user_id' => $u1,
            'status' => 1,
        ]);
        $this->assertDatabaseHas('activity_records', [
            'activity_id' => 'C1D2E3',
            'attendance_id' => 'A7B8C9',
            'user_id' => $u2,
            'status' => 1,
        ]);
    }

    public function test_mandiri_attendance_records(): void
    {
        $user = User::create(['role' => 'user']);
        $this->actingAs($user);

        DB::table('activities')->insert(['id' => 'D1E2F3', 'name' => 'D', 'user_id' => $user->id]);
        DB::table('attendances')->insert(['id' => 'M1N2D3', 'activity_id' => 'D1E2F3', 'name' => 'Mandiri', 'jenis_absen' => 'Mandiri', 'description' => json_encode(['enabled' => true])]);
        DB::table('activity_users')->insert(['id' => 'U1A2B3', 'user_id' => $user->id, 'activity_id' => 'D1E2F3', 'status' => 1]);

        $resp = $this->postJson(route('attendance.mandiri'), [
            'attendance_id' => 'M1N2D3',
            'activity_id' => 'D1E2F3',
        ]);
        $resp->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseHas('activity_records', [
            'activity_id' => 'D1E2F3',
            'attendance_id' => 'M1N2D3',
            'user_id' => $user->id,
            'status' => 1,
            'record_type' => 'mandiri',
        ]);
    }

    public function test_last_record_returns_timestamp(): void
    {
        $admin = User::create(['role' => 'admin']);
        $this->actingAs($admin);

        DB::table('activities')->insert(['id' => 'E1F2G3', 'name' => 'E', 'user_id' => $admin->id]);
        DB::table('attendances')->insert(['id' => 'L1S2T3', 'activity_id' => 'E1F2G3', 'name' => 'Manual', 'jenis_absen' => 'Manual']);
        $userId = User::create(['role' => 'user'])->id;

        DB::table('activity_records')->insert([
            'id' => 'R1E2C3',
            'activity_id' => 'E1F2G3',
            'attendance_id' => 'L1S2T3',
            'user_id' => $userId,
            'status' => 1,
            'record_type' => 'manual',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resp = $this->getJson(route('attendance.last.record', [
            'activity_id' => 'E1F2G3',
            'user_id' => $userId,
        ]));
        $resp->assertStatus(200)->assertJsonStructure(['updated_at', 'marked_at']);
    }
}
