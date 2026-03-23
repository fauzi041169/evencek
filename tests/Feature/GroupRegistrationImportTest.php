<?php

namespace Tests\Feature;

use App\Models\Activity;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class GroupRegistrationImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
    }

    public function test_group_import_statistics_and_payment_redirect()
    {
        $admin = User::create([
            'name' => 'Admin Test',
            'email' => 'admin_test_import@example.com',
            'password' => bcrypt('password'),
            'role' => 'admin',
        ]);
        Profile::create(['user_id' => $admin->id, 'foto' => 'profile.jpg']);

        $activity = Activity::factory()->create([
            'name' => 'Test Import Activity',
            'uid' => 'A1B2C3',
            'user_id' => $admin->id,
            'price' => 50000,
            'pendaftaran' => 1,
            'payment_method_type' => 'manual',
        ]);

        // Create an existing user to be imported
        $existingUserEmail = 'existing_'.time().'@example.com';
        $existingUser = User::create([
            'name' => 'Existing User',
            'email' => $existingUserEmail,
            'password' => bcrypt('password'),
        ]);
        Profile::create(['user_id' => $existingUser->id]);

        // 2. Create CSV Content
        // Header: email, name, no_hp
        $csvContent = "email,name,no_hp\n";
        $csvContent .= "{$existingUserEmail},Existing User,08123456789\n";
        $csvContent .= 'newuser_'.time()."@example.com,New User,08987654321\n";

        $file = UploadedFile::fake()->createWithContent('participants.csv', $csvContent);

        // 3. Perform Import
        $this->actingAs($admin);

        $response = $this->post(route('activity.preparation.import-participants', ['activityId' => $activity->id]), [
            'file' => $file,
            'type_id' => null,
            'item_id' => null,
            'return_to' => 'index', // Default behavior
        ]);

        // 4. Assertions

        // Assert Redirect to Payment Page
        // The URL should match route('payments.create', ...)
        // We can check if it redirects to a URL containing 'payments/create'
        $response->assertRedirect();
        $targetUrl = $response->headers->get('Location');
        $this->assertStringContainsString('payments', $targetUrl);
        $this->assertStringContainsString((string) $activity->id, $targetUrl);

        // Assert Session Data
        $importResult = session('import_result');
        $this->assertNotNull($importResult, 'Session import_result is missing');

        // Check Stats
        $stats = $importResult['stats'];
        // We expect 2 new participants (1 existing user linked + 1 new user linked)
        $this->assertEquals(2, $stats['new_participants'], 'new_participants count mismatch');

        // Check Total Bill
        // 2 participants * 50000 = 100000
        $this->assertEquals(100000, $stats['total_bill'], 'total_bill mismatch');

        // Check Bulk Payment Available flag
        $this->assertArrayHasKey('bulk_payment_available', $importResult);

        // Check Redirect URL in JSON response (although we got a redirect response, the data should be there)
        if (isset($importResult['redirect_url'])) {
            $this->assertStringContainsString('payments', $importResult['redirect_url']);
        }

        // Clean up
    }
}
