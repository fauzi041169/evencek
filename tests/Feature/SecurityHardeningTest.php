<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Schema::dropIfExists('users');
        Schema::dropIfExists('profiles');
        Schema::dropIfExists('activities');
        Schema::dropIfExists('galleries');
        Schema::dropIfExists('idcardbegrounds');

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
            $table->unsignedBigInteger('user_id');
            $table->string('foto')->nullable();
            $table->timestamps();
        });

        Schema::create('activities', function ($table) {
            $table->id();
            $table->string('name')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->timestamps();
        });

        Schema::create('galleries', function ($table) {
            $table->id();
            $table->unsignedBigInteger('activity_id');
            $table->string('image');
            $table->string('caption')->nullable();
            $table->timestamps();
        });

        Schema::create('idcardbegrounds', function ($table) {
            $table->id();
            $table->string('filename');
            $table->string('original_name')->nullable();
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

    public function test_background_images_requires_auth(): void
    {
        $resp = $this->get(route('background.images'));
        $resp->assertStatus(302);
    }

    public function test_background_images_authenticated_returns_json(): void
    {
        $user = User::create(['name' => 'A', 'email' => 'a@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);

        DB::table('idcardbegrounds')->insert([
            'filename' => 'bg_123.png',
            'original_name' => 'my.png',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $resp = $this->getJson(route('background.images'));
        $resp->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['images' => [['filename', 'original_name', 'url']]]);
    }

    public function test_gallery_store_authorization_and_admin_success(): void
    {
        $activityId = DB::table('activities')->insertGetId(['name' => 'X', 'user_id' => null]);

        $respGuest = $this->post(route('gallery.store', ['activity' => $activityId]), []);
        $respGuest->assertStatus(302);

        $user = User::create(['name' => 'U', 'email' => 'u@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        $file = UploadedFile::fake()->image('u.jpg', 100, 100);
        $respForbidden = $this->post(route('gallery.store', ['activity' => $activityId]), [
            'image' => [$file],
        ]);
        $respForbidden->assertStatus(403);

        $admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);

        $file2 = UploadedFile::fake()->image('a.jpg', 100, 100);
        $respOk = $this->postJson(route('gallery.store', ['activity' => $activityId]), [
            'image' => [$file2],
        ]);
        $respOk->assertStatus(200)->assertJson(['success' => true]);
        $this->assertDatabaseCount('galleries', 1);
    }

    public function test_profile_photo_filename_sanitized_on_update(): void
    {
        $user = User::create(['name' => 'P', 'email' => 'p@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);

        $file = UploadedFile::fake()->image('orig.jpg', 100, 100);
        $resp = $this->postJson(route('profile.photo.update'), [
            'foto_file' => $file,
        ]);
        $resp->assertStatus(200)->assertJson(['success' => true]);
        $data = DB::table('profiles')->where('user_id', $user->id)->first();
        $this->assertNotNull($data);
        $this->assertStringStartsWith('profile_', $data->foto);
        $this->assertStringEndsWith('.jpg', $data->foto);
    }

    public function test_idcard_background_upload_random_filename(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin2@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);

        $activityId = DB::table('activities')->insertGetId(['name' => 'Act', 'user_id' => $admin->id]);
        $file = UploadedFile::fake()->image('orig.png', 100, 100);

        $resp = $this->postJson(route('idcard-background.upload'), [
            'activity_id' => $activityId,
            'background' => $file,
        ]);
        $resp->assertStatus(200)->assertJson(['success' => true]);

        $row = DB::table('idcardbegrounds')->first();
        $this->assertNotNull($row);
        $this->assertStringStartsWith('bg_', $row->filename);
        $this->assertStringEndsWith('.png', $row->filename);
    }
}
