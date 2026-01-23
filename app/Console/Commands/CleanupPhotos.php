<?php

namespace App\Console\Commands;

use App\Models\Profile;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanupPhotos extends Command
{
    protected $signature = 'cleanup:photos';

    protected $description = 'Cleanup unused profile photos';

    public function handle()
    {
        $this->info('Starting photo cleanup...');

        // Get all photos in storage
        $files = Storage::disk('public')->files('profile-photos');
        $usedPhotos = Profile::whereNotNull('foto')->pluck('foto')->toArray();

        $count = 0;
        foreach ($files as $file) {
            $filename = basename($file);
            if (! in_array($filename, $usedPhotos)) {
                Storage::disk('public')->delete($file);
                $count++;
            }
        }

        $this->info("Cleaned up {$count} unused photos");
    }
}
