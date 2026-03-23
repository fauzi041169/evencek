<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SelfRegistrationTest extends TestCase
{
    use RefreshDatabase; // Use RefreshDatabase to reset the database after each test

    /**
     * Test successful user registration (pendaftaran mandiri).
     *
     * @return void
     */
    public function test_user_can_register_themselves()
    {
        // Data pendaftaran
        $userData = [
            'name' => 'Test User',
            'email' => 'testuser@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'user',
            // Honeypot fields
            'hp_field' => '',
            'hp_time' => time() - 5, // 5 seconds ago
        ];

        // Kirim request POST ke endpoint registrasi
        $response = $this->post(route('auth.register.store'), $userData);

        // Assert redirect (biasanya ke halaman verifikasi email atau login)
        // Kita cek status code dulu, biasanya 302 (redirect)
        $response->assertStatus(302);

        // Cek apakah user berhasil dibuat di database
        $this->assertDatabaseHas('users', [
            'email' => 'testuser@example.com',
            'name' => 'Test User',
            'role' => 'user',
        ]);

        // Ambil user yang baru dibuat
        $user = User::where('email', 'testuser@example.com')->first();

        // Pastikan password di-hash (tidak plain text)
        $this->assertNotEquals('Password123!', $user->password);

        // Pastikan profile dibuat (berdasarkan controller logic)
        $this->assertNotNull($user->profile);

        // Pastikan token verifikasi email ada
        $this->assertNotNull($user->email_verification_token);
    }

    /**
     * Test registration validation errors.
     *
     * @return void
     */
    public function test_registration_validation_errors()
    {
        // Data pendaftaran tidak valid (password lemah, email salah format)
        $userData = [
            'name' => 'Test User',
            'email' => 'invalid-email',
            'password' => 'weak',
            'password_confirmation' => 'mismatch',
            'role' => 'user',
            'hp_field' => '',
            'hp_time' => time() - 5,
        ];

        $response = $this->post(route('auth.register.store'), $userData);

        $response->assertSessionHasErrors(['email', 'password', 'password_confirmation']);

        $this->assertDatabaseMissing('users', [
            'name' => 'Test User',
        ]);
    }

    /**
     * Test honeypot protection.
     *
     * @return void
     */
    public function test_honeypot_protection()
    {
        // 1. Test hp_field filled (bot behavior)
        $botData = [
            'name' => 'Bot User',
            'email' => 'bot@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'user',
            'hp_field' => 'I am a bot', // Filled
            'hp_time' => time() - 5,
        ];

        $response = $this->post(route('auth.register.store'), $botData);

        // Harusnya gagal/redirect back dengan error, dan tidak masuk database
        $response->assertStatus(302);
        $this->assertDatabaseMissing('users', ['email' => 'bot@example.com']);

        // 2. Test too fast submission
        $fastData = [
            'name' => 'Fast User',
            'email' => 'fast@example.com',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
            'role' => 'user',
            'hp_field' => '',
            'hp_time' => time(), // Just now (too fast)
        ];

        $response = $this->post(route('auth.register.store'), $fastData);
        $response->assertStatus(302);
        $this->assertDatabaseMissing('users', ['email' => 'fast@example.com']);
    }
}
