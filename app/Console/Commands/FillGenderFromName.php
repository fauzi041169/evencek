<?php

namespace App\Console\Commands;

use App\Helpers\GenderHelper;
use App\Models\Profile;
use Illuminate\Console\Command;

class FillGenderFromName extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'gender:fill 
                            {--activity= : Filter by specific activity UID}
                            {--limit= : Limit number of records to process}
                            {--dry-run : Run without saving changes}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fill empty gender fields based on participant names using AI';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Starting gender prediction process...');

        $activityUid = $this->option('activity');
        $limit = $this->option('limit');
        $dryRun = $this->option('dry-run');

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes will be saved');
        }

        // Build query for profiles with empty gender
        $query = Profile::query()
            ->whereNull('jenis_kelamin')
            ->orWhere('jenis_kelamin', '')
            ->whereHas('user'); // Only profiles with users

        // Filter by activity if specified
        if ($activityUid) {
            $this->info("Filtering by activity: {$activityUid}");
            $query->whereHas('user.activityUsers', function ($q) use ($activityUid) {
                $q->whereHas('activity', function ($aq) use ($activityUid) {
                    $aq->where('uid', $activityUid);
                });
            });
        }

        if ($limit) {
            $query->limit((int) $limit);
        }

        $profiles = $query->with('user')->get();
        $total = $profiles->count();

        if ($total === 0) {
            $this->info('No profiles found with empty gender field.');

            return 0;
        }

        $this->info("Found {$total} profiles with empty gender field.");

        $bar = $this->output->createProgressBar($total);
        $bar->start();

        $stats = [
            'success' => 0,
            'failed' => 0,
            'skipped' => 0,
        ];

        foreach ($profiles as $profile) {
            $user = $profile->user;

            if (! $user || ! $user->name) {
                $stats['skipped']++;
                $bar->advance();

                continue;
            }

            // Predict gender using GenderHelper (which uses AI if enabled)
            $predictedGender = GenderHelper::predict($user->name);

            if ($predictedGender && in_array($predictedGender, ['L', 'P'])) {
                if (! $dryRun) {
                    try {
                        $profile->jenis_kelamin = $predictedGender;
                        $profile->save();
                        $stats['success']++;
                    } catch (\Exception $e) {
                        $this->error("\nError updating profile ID {$profile->id}: ".$e->getMessage());
                        $stats['failed']++;
                    }
                } else {
                    // In dry run, just count as success
                    $stats['success']++;
                    $this->line("\n[DRY RUN] Would set gender for '{$user->name}' to '{$predictedGender}'");
                }
            } else {
                $stats['failed']++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        // Display statistics
        $this->info('Process completed!');
        $this->table(
            ['Status', 'Count'],
            [
                ['Success', $stats['success']],
                ['Failed', $stats['failed']],
                ['Skipped', $stats['skipped']],
                ['Total', $total],
            ]
        );

        if ($dryRun) {
            $this->warn('DRY RUN MODE - No changes were saved. Run without --dry-run to apply changes.');
        }

        return 0;
    }
}
