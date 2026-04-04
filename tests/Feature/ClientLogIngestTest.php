<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClientLogIngestTest extends TestCase
{
    use RefreshDatabase;

    public function test_log_ingest_requires_token_or_auth(): void
    {
        config(['app.log_ingest_token' => 'secret']);

        $resp = $this->postJson('/api/logs', [
            'message' => 'test',
        ]);

        $resp->assertStatus(401);
    }

    public function test_log_ingest_accepts_token(): void
    {
        config(['app.log_ingest_token' => 'secret']);

        $resp = $this->withHeader('X-Log-Token', 'secret')->postJson('/api/logs', [
            'level' => 'error',
            'message' => 'boom',
            'context' => ['a' => 1],
            'tags' => ['frontend'],
            'source' => 'web',
        ]);

        $resp->assertStatus(201)->assertJson(['success' => true]);
        $this->assertDatabaseCount('client_logs', 1);
        $this->assertDatabaseHas('client_logs', ['level' => 'error', 'source' => 'web']);
    }

    public function test_log_ingest_accepts_sanctum_auth(): void
    {
        config(['app.log_ingest_token' => '']);

        $user = User::create([
            'name' => 'U',
            'email' => 'u@example.com',
            'password' => 'x',
            'role' => 'user',
        ]);

        $this->actingAs($user, 'sanctum');

        $resp = $this->postJson('/api/logs', [
            'message' => 'hello',
        ]);

        $resp->assertStatus(201)->assertJson(['success' => true]);
        $this->assertDatabaseHas('client_logs', ['user_id' => $user->id]);
    }

    public function test_log_index_requires_token_or_auth(): void
    {
        config(['app.log_ingest_token' => 'secret']);

        $resp = $this->getJson('/api/logs');
        $resp->assertStatus(401);
    }

    public function test_log_index_returns_data_with_token(): void
    {
        config(['app.log_ingest_token' => 'secret']);

        $this->withHeader('X-Log-Token', 'secret')->postJson('/api/logs', [
            'level' => 'info',
            'message' => 'hello',
            'tags' => ['monitor'],
            'source' => 'web',
        ])->assertStatus(201);

        $resp = $this->withHeader('X-Log-Token', 'secret')->getJson('/api/logs?per_page=10');
        $resp->assertStatus(200)
            ->assertJson(['success' => true])
            ->assertJsonStructure(['data' => ['current_page', 'data', 'per_page', 'total']]);
    }
}
