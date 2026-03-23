<?php

namespace App\Console\Commands;

use App\Helpers\GenderHelper;
use App\Models\Profile;
use Illuminate\Console\Command;

class NormalizeGender extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'gender:normalize';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Normalize gender format and predict missing gender based on name';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $this->info('Starting gender normalization...');

        if (config('services.ai_gender.enabled')) {
            $this->info('AI Gender Prediction is ENABLED using '.config('services.ai_gender.model'));
            $this->warn('This process may be slow due to API requests.');
        } else {
            $this->info('Using Local Dictionary for Gender Prediction (AI Disabled)');
        }

        $profiles = Profile::with('user')->get();
        $countNormalized = 0;
        $countPredicted = 0;

        $bar = $this->output->createProgressBar(count($profiles));
        $bar->start();

        foreach ($profiles as $profile) {
            $originalGender = $profile->jenis_kelamin;

            // Logic is already in Profile::boot() -> saving event.
            // We just need to trigger save.
            // However, to count what happened, we can simulate the logic here or check after save.
            // Checking after save is hard because we don't know what it was before if we don't store it.
            // So we will rely on the Model event for the actual work, but we can pre-calculate for reporting.

            $normalized = GenderHelper::normalize($originalGender);
            $predicted = null;

            if (empty($normalized) && $profile->user) {
                $predicted = GenderHelper::predict($profile->user->name);
            }

            // Check if changes will happen
            $willChange = false;
            if ($originalGender !== $normalized && ! empty($normalized)) {
                $countNormalized++;
                $willChange = true;
            }
            if (empty($normalized) && ! empty($predicted)) {
                $countPredicted++;
                $willChange = true;
            }

            // Trigger the model event logic
            // We need to assign at least one attribute to make it 'dirty' if we want save() to definitely hit database,
            // but the 'saving' event fires regardless of dirty state in some versions?
            // No, Eloquent checks isDirty().
            // So we should manually set the attribute here to ensure it saves.

            $profile->jenis_kelamin = $normalized; // Apply normalization
            if (empty($profile->jenis_kelamin) && $predicted) {
                $profile->jenis_kelamin = $predicted; // Apply prediction
            }

            if ($profile->isDirty('jenis_kelamin')) {
                $profile->save();
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Process completed.');
        $this->info("Normalized records: $countNormalized");
        $this->info("Predicted records: $countPredicted");

        return 0;
    }
}
