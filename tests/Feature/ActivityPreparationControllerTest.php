<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ActivityPreparationControllerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware([\App\Http\Middleware\VerifyCsrfToken::class, \App\Http\Middleware\PreventRequestsDuringMaintenance::class]);
        $this->withoutMiddleware([\App\Http\Middleware\ActivityLogger::class, \App\Http\Middleware\PerformanceLogger::class]);

        Schema::dropIfExists('users');
        Schema::dropIfExists('activities');
        Schema::dropIfExists('activity_materials');
        Schema::dropIfExists('activity_committee_structures');
        Schema::dropIfExists('activity_divisions');
        Schema::dropIfExists('profiles');
        Schema::dropIfExists('activitiusers');

        Schema::create('users', function ($table) {
            $table->id();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->string('password')->nullable();
            $table->string('role')->nullable();
            $table->timestamps();
        });
        Schema::create('profiles', function ($table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('no_hp')->nullable();
            $table->timestamps();
        });
        Schema::create('activitiusers', function ($table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('activity_id');
            $table->integer('status')->default(0);
            $table->timestamps();
        });

        Schema::create('activities', function ($table) {
            $table->id();
            $table->string('name')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();
        });

        Schema::create('activity_materials', function ($table) {
            $table->id();
            $table->unsignedBigInteger('activity_id');
            $table->string('name');
            $table->string('file_name')->nullable();
            $table->string('file_path')->nullable();
            $table->string('file_type')->nullable();
            $table->string('mime_type')->nullable();
            $table->integer('file_size')->default(0);
            $table->text('description')->nullable();
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();
        });

        Schema::create('activity_committee_structures', function ($table) {
            $table->id();
            $table->unsignedBigInteger('activity_id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('position')->nullable();
            $table->string('name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->integer('order')->nullable();
            $table->timestamps();
        });
        Schema::create('activity_divisions', function ($table) {
            $table->id();
            $table->unsignedBigInteger('activity_id');
            $table->string('name')->nullable();
            $table->string('description')->nullable();
            $table->string('leader_name')->nullable();
            $table->string('leader_phone')->nullable();
            $table->timestamps();
        });
    }

    public function test_store_material_requires_auth_and_authorization(): void
    {
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        $respGuest = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [], ['HTTP_REFERER' => '/']);
        $respGuest->assertStatus(302);

        $user = User::create(['name' => 'U', 'email' => 'u@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        Storage::fake('public');
        $file = UploadedFile::fake()->image('materi.png', 100, 100);
        $respForbidden = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($respForbidden->getStatusCode(), [403, 503]));
        $this->assertDatabaseCount('activity_materials', 0);
    }

    public function test_store_material_admin_uploads_file_success_and_stored(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->image('materi.png', 120, 120);
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi',
            'file' => $file,
            'description' => 'D',
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertStringStartsWith('activity_materials/'.$activityId.'/', $row->file_path);
        $this->assertStringEndsWith('.png', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
        $this->assertSame('materi.png', $row->file_name);
        $this->assertSame('image', $row->file_type);
    }

    public function test_store_material_committee_can_store_link(): void
    {
        $user = User::create(['name' => 'Committee', 'email' => 'c@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        DB::table('activity_committee_structures')->insert([
            'activity_id' => $activityId,
            'user_id' => $user->id,
            'position' => 'Panitia',
            'name' => $user->name,
            'email' => $user->email,
            'order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi Link',
            'link_url' => 'https://example.com/doc.pdf',
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertNull($row->file_name);
        $this->assertSame('https://example.com/doc.pdf', $row->file_path);
        $this->assertSame('link', $row->file_type);
    }

    public function test_store_material_committee_uploads_file_success_and_stored(): void
    {
        $user = User::create(['name' => 'Committee', 'email' => 'cfile@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        DB::table('activity_committee_structures')->insert([
            'activity_id' => $activityId,
            'user_id' => $user->id,
            'position' => 'Panitia',
            'name' => $user->name,
            'email' => $user->email,
            'order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Storage::fake('public');
        $file = UploadedFile::fake()->image('materi2.jpg', 64, 64);
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi Gambar',
            'file' => $file,
            'description' => 'Desc',
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('materi2.jpg', $row->file_name);
        $this->assertSame('image', $row->file_type);
        $this->assertStringStartsWith('activity_materials/'.$activityId.'/', $row->file_path);
        $this->assertStringEndsWith('.jpg', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_destroy_material_admin_deletes_material_and_file(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admindel@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->image('materi-del.png', 80, 80);
        $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi Hapus',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        Storage::disk('public')->assertExists($row->file_path);

        $resp = $this->delete(route('activity.preparation.destroy-material', ['activityId' => $activityId, 'materialId' => $row->id]));
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));

        Storage::disk('public')->assertMissing($row->file_path);
        $this->assertDatabaseCount('activity_materials', 0);
    }

    public function test_download_material_committee_can_download(): void
    {
        $user = User::create(['name' => 'Committee', 'email' => 'cdl@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        DB::table('activity_committee_structures')->insert([
            'activity_id' => $activityId,
            'user_id' => $user->id,
            'position' => 'Panitia',
            'name' => $user->name,
            'email' => $user->email,
            'order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Storage::fake('public');
        $file = UploadedFile::fake()->image('materi-dl.png', 40, 40);
        $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi Unduh',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        Storage::disk('public')->assertExists($row->file_path);

        $resp = $this->get(route('activity.preparation.download-material', ['activityId' => $activityId, 'materialId' => $row->id]));
        $this->assertTrue(in_array($resp->getStatusCode(), [200, 302, 503]));
        if ($resp->getStatusCode() === 200) {
            $this->assertTrue($resp->headers->has('content-disposition'));
            $this->assertStringContainsString($row->file_name, $resp->headers->get('content-disposition'));
        }
    }

    public function test_store_material_admin_pdf_detected_as_pdf(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminpdf@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi.pdf', 10, 'application/pdf');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi PDF',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('pdf', $row->file_type);
        $this->assertStringEndsWith('.pdf', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_store_material_admin_pptx_detected_as_ppt(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminpptx@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('slides.pptx', 12, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi PPTX',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('ppt', $row->file_type);
        $this->assertStringEndsWith('.pptx', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_download_material_participant_active_can_download(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminu@example.com', 'password' => 'x', 'role' => 'admin']);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        $this->actingAs($admin);
        Storage::fake('public');
        $file = UploadedFile::fake()->image('materi-part.png', 30, 30);
        $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi Peserta',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $row = DB::table('activity_materials')->first();

        $participant = User::create(['name' => 'Participant', 'email' => 'p@example.com', 'password' => 'x', 'role' => 'user']);
        DB::table('activitiusers')->insert([
            'user_id' => $participant->id,
            'activity_id' => $activityId,
            'status' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($participant);
        $resp = $this->get(route('activity.preparation.download-material', ['activityId' => $activityId, 'materialId' => $row->id]));
        $this->assertTrue(in_array($resp->getStatusCode(), [200, 302, 503]));
    }

    public function test_download_material_non_participant_forbidden(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminu2@example.com', 'password' => 'x', 'role' => 'admin']);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        $this->actingAs($admin);
        Storage::fake('public');
        $file = UploadedFile::fake()->image('materi-np.png', 30, 30);
        $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi NonPeserta',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $row = DB::table('activity_materials')->first();

        $user = User::create(['name' => 'Random', 'email' => 'r@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        $resp = $this->get(route('activity.preparation.download-material', ['activityId' => $activityId, 'materialId' => $row->id]));
        $this->assertTrue(in_array($resp->getStatusCode(), [403, 503]));
    }

    public function test_store_material_admin_docx_detected_as_doc(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admindocx@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi.docx', 8, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi DOCX',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('doc', $row->file_type);
        $this->assertStringEndsWith('.docx', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_store_material_admin_mp4_detected_as_video(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminmp4@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi.mp4', 100, 'video/mp4');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi MP4',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('video', $row->file_type);
        $this->assertStringEndsWith('.mp4', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_store_material_admin_mp3_detected_as_audio(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminmp3@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi.mp3', 50, 'audio/mpeg');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi MP3',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('audio', $row->file_type);
        $this->assertStringEndsWith('.mp3', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_store_material_admin_doc_detected_as_doc(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admindoc@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi.doc', 6, 'application/msword');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi DOC',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('doc', $row->file_type);
        $this->assertStringEndsWith('.doc', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_store_material_admin_ppt_detected_as_ppt(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminppt@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi.ppt', 7, 'application/vnd.ms-powerpoint');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi PPT',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));

        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('ppt', $row->file_type);
        $this->assertStringEndsWith('.ppt', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_store_material_committee_invalid_link_rejected(): void
    {
        $user = User::create(['name' => 'Committee', 'email' => 'c-bad@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        DB::table('activity_committee_structures')->insert([
            'activity_id' => $activityId,
            'user_id' => $user->id,
            'position' => 'Panitia',
            'name' => $user->name,
            'email' => $user->email,
            'order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi Link Invalid',
            'link_url' => 'invalid_url',
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $this->assertDatabaseCount('activity_materials', 0);
    }

    public function test_store_material_requires_file_or_link_error(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminempty@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi Kosong',
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $this->assertDatabaseCount('activity_materials', 0);
    }

    public function test_store_material_file_too_large_validation_fails(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminsize@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi-big.bin', 60000, 'application/octet-stream');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi Besar',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $this->assertDatabaseCount('activity_materials', 0);
    }

    public function test_store_material_file_max_size_boundary_passes(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminsizeok@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi-ok.bin', 51200, 'application/octet-stream');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi Batas OK',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $this->assertDatabaseCount('activity_materials', 1);
        $row = DB::table('activity_materials')->first();
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_store_material_file_and_link_prefers_file(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminprefer@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);

        Storage::fake('public');
        $file = UploadedFile::fake()->image('materi-prefer.png', 24, 24);
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi Preferensi',
            'file' => $file,
            'link_url' => 'https://should-not-be-used.example.com',
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertNotSame('link', $row->file_type);
        $this->assertSame('materi-prefer.png', $row->file_name);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_download_material_participant_non_active_forbidden(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'adminnonactive@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        Storage::fake('public');
        $file = UploadedFile::fake()->image('materi-nonact.png', 20, 20);
        $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi Non Aktif',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $row = DB::table('activity_materials')->first();

        $participant = User::create(['name' => 'Participant', 'email' => 'pna@example.com', 'password' => 'x', 'role' => 'user']);
        DB::table('activitiusers')->insert([
            'user_id' => $participant->id,
            'activity_id' => $activityId,
            'status' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->actingAs($participant);
        $resp = $this->get(route('activity.preparation.download-material', ['activityId' => $activityId, 'materialId' => $row->id]));
        $this->assertTrue(in_array($resp->getStatusCode(), [403, 503]));
    }

    public function test_store_material_committee_doc_detected_as_doc(): void
    {
        $user = User::create(['name' => 'Committee', 'email' => 'c-doc@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        DB::table('activity_committee_structures')->insert([
            'activity_id' => $activityId,
            'user_id' => $user->id,
            'position' => 'Panitia',
            'name' => $user->name,
            'email' => $user->email,
            'order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi-committee.docx', 10, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi DOCX Panitia',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('doc', $row->file_type);
        $this->assertStringEndsWith('.docx', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_store_material_committee_ppt_detected_as_ppt(): void
    {
        $user = User::create(['name' => 'Committee', 'email' => 'c-ppt@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        DB::table('activity_committee_structures')->insert([
            'activity_id' => $activityId,
            'user_id' => $user->id,
            'position' => 'Panitia',
            'name' => $user->name,
            'email' => $user->email,
            'order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi-committee.ppt', 9, 'application/vnd.ms-powerpoint');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi PPT Panitia',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('ppt', $row->file_type);
        $this->assertStringEndsWith('.ppt', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_store_material_committee_mp4_detected_as_video(): void
    {
        $user = User::create(['name' => 'Committee', 'email' => 'c-mp4@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        DB::table('activity_committee_structures')->insert([
            'activity_id' => $activityId,
            'user_id' => $user->id,
            'position' => 'Panitia',
            'name' => $user->name,
            'email' => $user->email,
            'order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi-committee.mp4', 20, 'video/mp4');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi MP4 Panitia',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('video', $row->file_type);
        $this->assertStringEndsWith('.mp4', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }

    public function test_store_material_committee_mp3_detected_as_audio(): void
    {
        $user = User::create(['name' => 'Committee', 'email' => 'c-mp3@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        $activityId = DB::table('activities')->insertGetId(['name' => 'A', 'user_id' => null]);
        DB::table('activity_committee_structures')->insert([
            'activity_id' => $activityId,
            'user_id' => $user->id,
            'position' => 'Panitia',
            'name' => $user->name,
            'email' => $user->email,
            'order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Storage::fake('public');
        $file = UploadedFile::fake()->create('materi-committee.mp3', 12, 'audio/mpeg');
        $resp = $this->post(route('activity.preparation.store-material', ['activityId' => $activityId]), [
            'name' => 'Materi MP3 Panitia',
            'file' => $file,
        ], ['HTTP_REFERER' => '/']);
        $this->assertTrue(in_array($resp->getStatusCode(), [302, 200, 503]));
        $row = DB::table('activity_materials')->first();
        $this->assertNotNull($row);
        $this->assertSame('audio', $row->file_type);
        $this->assertStringEndsWith('.mp3', $row->file_path);
        Storage::disk('public')->assertExists($row->file_path);
    }
}
