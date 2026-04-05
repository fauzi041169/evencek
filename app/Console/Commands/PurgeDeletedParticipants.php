<?php

namespace App\Console\Commands;

use App\Models\Activity;
use App\Models\ActivityChat;
use App\Models\ActivityHotelRoomAssignment;
use App\Models\ActivityUser;
use App\Models\Comment;
use App\Models\EventActivity;
use App\Models\EventActivityResponse;
use App\Models\Payment;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class PurgeDeletedParticipants extends Command
{
    protected $signature = 'participants:purge-deleted {--days=10} {--limit=1000}';

    protected $description = 'Permanently delete soft-deleted activity participants older than N days and remove related data/files.';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $limit = (int) $this->option('limit');
        if ($days < 1) {
            $days = 10;
        }
        if ($limit < 1) {
            $limit = 1000;
        }

        if (! Schema::hasTable('activity_users') || ! Schema::hasColumn('activity_users', 'deleted_at')) {
            $this->info('activity_users.deleted_at tidak ada, tidak ada yang dipurge.');

            return self::SUCCESS;
        }

        $cutoff = now()->subDays($days);

        $query = ActivityUser::onlyTrashed()
            ->whereNotNull('deleted_at')
            ->where('deleted_at', '<', $cutoff)
            ->orderBy('deleted_at', 'asc')
            ->limit($limit);

        $rows = $query->get();
        if ($rows->isEmpty()) {
            $this->info('Tidak ada peserta terhapus yang melewati batas purge.');

            return self::SUCCESS;
        }

        $count = 0;
        foreach ($rows as $enrollment) {
            DB::beginTransaction();
            try {
                $activityId = (string) $enrollment->activity_id;
                $userId = (string) $enrollment->user_id;
                $batchId = $enrollment->activity_batch_id ? (string) $enrollment->activity_batch_id : null;

                $this->deleteEnrollmentFiles($activityId, $enrollment);

                if (Schema::hasTable('payments')) {
                    $payments = Payment::where('activity_id', $activityId)->where('user_id', $userId)->get();
                    foreach ($payments as $payment) {
                        $this->deletePaymentProof($payment->proof_of_payment);
                        $payment->delete();
                    }
                }

                if (Schema::hasTable('activity_hotel_room_assignments')) {
                    $q = ActivityHotelRoomAssignment::where('activity_id', $activityId)->where('user_id', $userId);
                    if (Schema::hasColumn('activity_hotel_room_assignments', 'activity_batch_id') && $batchId !== null) {
                        $q->where('activity_batch_id', $batchId);
                    }
                    $q->delete();
                }

                if (Schema::hasTable('activity_records')) {
                    $recordQuery = DB::table('activity_records')->where('activity_id', $activityId)->where('user_id', $userId);
                    if (Schema::hasColumn('activity_records', 'activity_batch_id') && $batchId !== null) {
                        $recordQuery->where('activity_batch_id', $batchId);
                    }
                    $recordQuery->delete();
                }

                if (Schema::hasTable('activity_chats')) {
                    ActivityChat::where('activity_id', $activityId)
                        ->where(function ($q) use ($userId) {
                            $q->where('user_id', $userId)->orWhere('sender_id', $userId);
                        })
                        ->delete();
                }

                if (Schema::hasTable('comments')) {
                    Comment::where('commentable_type', Activity::class)
                        ->where('commentable_id', $activityId)
                        ->where('user_id', $userId)
                        ->delete();
                }

                if (Schema::hasTable('event_activity_responses')) {
                    $eventActivityIds = EventActivity::where('activity_id', $activityId)->pluck('id');
                    if ($eventActivityIds->isNotEmpty()) {
                        EventActivityResponse::whereIn('event_activity_id', $eventActivityIds)
                            ->where('user_id', $userId)
                            ->delete();
                    }
                }

                $enrollment->forceDelete();
                DB::commit();
                $count++;
            } catch (\Throwable $e) {
                DB::rollBack();
                $this->error('Gagal purge: '.$e->getMessage());
            }
        }

        $this->info("Selesai purge: {$count} peserta.");

        return self::SUCCESS;
    }

    private function deletePaymentProof($path): void
    {
        $p = (string) ($path ?? '');
        if ($p === '' || str_contains($p, 'assets/images/credit/bukti bayar.png')) {
            return;
        }

        try {
            if (Storage::disk('public')->exists($p)) {
                Storage::disk('public')->delete($p);

                return;
            }
        } catch (\Throwable $e) {
        }

        $pathsToCheck = [
            public_path($p),
            public_path('storage/'.$p),
            storage_path('app/public/'.$p),
        ];
        foreach ($pathsToCheck as $fsPath) {
            try {
                if (File::exists($fsPath) && is_file($fsPath)) {
                    File::delete($fsPath);

                    return;
                }
            } catch (\Throwable $e) {
            }
        }
    }

    private function deleteEnrollmentFiles(string $activityId, ActivityUser $enrollment): void
    {
        $imagePath = (string) ($enrollment->image_path ?? '');
        if ($imagePath !== '') {
            $pathsToCheck = [
                public_path($imagePath),
                public_path('storage/'.$imagePath),
                storage_path('app/public/'.$imagePath),
            ];
            foreach ($pathsToCheck as $fsPath) {
                try {
                    if (File::exists($fsPath) && is_file($fsPath)) {
                        File::delete($fsPath);
                        break;
                    }
                } catch (\Throwable $e) {
                }
            }
        }

        $customData = $enrollment->custom_data;
        if (is_array($customData)) {
            foreach ($customData as $value) {
                if (! is_string($value)) {
                    continue;
                }
                $v = trim($value);
                if ($v === '') {
                    continue;
                }
                if (! (str_starts_with($v, 'storage/') || str_starts_with($v, 'uploads/') || str_contains($v, '/storage/') || preg_match('#^(activities/|public/)#', $v))) {
                    continue;
                }
                try {
                    $fsPath = public_path($v);
                    if (File::exists($fsPath) && is_file($fsPath)) {
                        File::delete($fsPath);

                        continue;
                    }
                } catch (\Throwable $e) {
                }
                try {
                    $storagePath = ltrim(preg_replace('#^storage/#', '', $v), '/');
                    if (Storage::disk('public')->exists($storagePath)) {
                        Storage::disk('public')->delete($storagePath);
                    }
                } catch (\Throwable $e) {
                }
            }
        }

        $certificateId = (string) ($enrollment->certificate_id ?? '');
        if ($certificateId !== '') {
            $paths = [
                "certificates/{$activityId}/{$certificateId}.pdf",
                "certificates/{$certificateId}.pdf",
            ];
            foreach ($paths as $p) {
                try {
                    if (Storage::disk('public')->exists($p)) {
                        Storage::disk('public')->delete($p);
                    }
                } catch (\Throwable $e) {
                }
            }
        }
    }
}
