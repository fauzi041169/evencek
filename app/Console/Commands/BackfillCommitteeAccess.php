<?php

namespace App\Console\Commands;

use App\Models\ActivityCommitteeStructure;
use App\Models\PerformanceLog;
use Carbon\Carbon;
use Illuminate\Console\Command;

class BackfillCommitteeAccess extends Command
{
    protected $signature = 'app:backfill-committee-access';

    protected $description = 'Backfill committee access data from performance logs';

    public function handle()
    {
        $this->info('Starting backfill...');

        $committees = ActivityCommitteeStructure::with('activity')->get();
        $bar = $this->output->createProgressBar($committees->count());

        foreach ($committees as $committee) {
            if (! $committee->user_id || ! $committee->activity_id) {
                $bar->advance();

                continue;
            }

            // Find logs for this user related to this activity
            // URI pattern: activity/{id}/...
            $activityId = $committee->activity_id;

            // Note: URI might be "activity/ABC/dashboard"
            $logs = PerformanceLog::where('user_id', $committee->user_id)
                ->where('uri', 'like', "activity/{$activityId}%")
                ->orderBy('created_at')
                ->get(['created_at']);

            $count = $logs->count();
            $durationMinutes = 0;
            $lastTime = null;

            foreach ($logs as $log) {
                $currentTime = Carbon::parse($log->created_at);

                if ($lastTime) {
                    $diff = $lastTime->diffInMinutes($currentTime);
                    if ($diff < 30 && $diff > 0) {
                        $durationMinutes += $diff;
                    }
                }

                $lastTime = $currentTime;
            }

            // If duration is 0 but count > 0, maybe give 1 min per 10 hits?
            if ($count > 0 && $durationMinutes == 0) {
                $durationMinutes = max(1, intval($count / 10));
            }

            $committee->update([
                'jumlah_akses' => $count,
                'lama_akses' => $durationMinutes,
                'last_access_at' => $lastTime,
            ]);

            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Backfill completed.');
    }
}
