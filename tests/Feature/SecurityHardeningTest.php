<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SecurityHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_background_images_requires_auth(): void
    {
        $resp = $this->get(route('background.images'));
        $resp->assertStatus(302);
    }

    public function test_background_images_authenticated_returns_json(): void
    {
        $user = User::create(['name' => 'A', 'email' => 'a@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);

        $resp = $this->getJson(route('background.images'));
        $resp->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['images']);
    }

    public function test_gallery_store_authorization_and_admin_success(): void
    {
        $activityId = Activity::factory()->create(['name' => 'X'])->id;

        $respGuest = $this->post(route('gallery.store', ['activity' => $activityId]), []);
        $respGuest->assertStatus(302);

        $user = User::create(['name' => 'U', 'email' => 'u@example.com', 'password' => 'x', 'role' => 'user']);
        $this->actingAs($user);
        $file = UploadedFile::fake()->createWithContent('u.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOZp6b0AAAAASUVORK5CYII='));
        $respForbidden = $this->post(route('gallery.store', ['activity' => $activityId]), [
            'image' => [$file],
        ]);
        $respForbidden->assertStatus(403);

        $admin = User::create(['name' => 'Admin', 'email' => 'admin@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);

        $file2 = UploadedFile::fake()->createWithContent('a.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOZp6b0AAAAASUVORK5CYII='));
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

        $file = UploadedFile::fake()->createWithContent('orig.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOZp6b0AAAAASUVORK5CYII='));
        $resp = $this->postJson(route('profile.photo.update'), [
            'foto_file' => $file,
        ]);
        $resp->assertStatus(200)->assertJson(['success' => true]);
        $data = DB::table('profiles')->where('user_id', $user->id)->first();
        $this->assertNotNull($data);
        $this->assertStringContainsString('profile-photos/', (string) $data->foto);
        $this->assertStringEndsWith('.png', (string) $data->foto);
    }

    public function test_idcard_background_upload_random_filename(): void
    {
        $admin = User::create(['name' => 'Admin', 'email' => 'admin2@example.com', 'password' => 'x', 'role' => 'admin']);
        $this->actingAs($admin);

        $activityId = Activity::factory()->create(['name' => 'Act', 'user_id' => $admin->id])->id;
        $file = UploadedFile::fake()->createWithContent('orig.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAOZp6b0AAAAASUVORK5CYII='));

        $resp = $this->postJson(route('idcard-background.upload'), [
            'activity_id' => $activityId,
            'background' => $file,
        ]);
        $resp->assertStatus(200)->assertJson(['success' => true]);

        $row = DB::table('id_card_backgrounds')->first();
        $this->assertNotNull($row);
        $this->assertStringContainsString('id-card-backgrounds/'.$activityId.'/', (string) $row->filename);
    }
}
