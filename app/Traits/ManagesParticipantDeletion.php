<?php

namespace App\Traits;

use App\Models\Activity;
use App\Models\ActivityChat;
use App\Models\ActivityHotelRoomAssignment;
use App\Models\ActivityRecord;
use App\Models\ActivityUser;
use App\Models\Attendance;
use App\Models\Comment;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

trait ManagesParticipantDeletion
{
    /**
     * Delete participants and all related data (payments, files, records, etc.)
     *
     * @param Activity $activity
     * @param array $userIds
     * @return array Result summary
     */
    protected function deleteParticipants(Activity $activity, array $userIds)
    {
        $count = 0;
        $errors = [];

        foreach ($userIds as $uid) {
            try {
                // Get user object (if exists) - optional check but good for logging
                $user = User::find($uid);
                
                // 1. Delete Payments & Proof Files
                $payments = Payment::where('activity_id', $activity->id)->where('user_id', $uid)->get();
                foreach ($payments as $payment) {
                    $this->deletePaymentProof($payment);
                    $payment->delete();
                }

                // 2. Delete Activity Enrollments & Image Files (Check both potential tables)
                // Main model deletion (handles the active table)
                $enrollments = ActivityUser::where('activity_id', $activity->id)->where('user_id', $uid)->get();
                foreach ($enrollments as $enrollment) {
                    // Check for files in custom_data
                    if (!empty($enrollment->custom_data)) {
                        $this->deleteCustomDataFiles($enrollment->custom_data);
                    }
                    
                    // Check for certificate file (if any stored)
                    if (!empty($enrollment->certificate_id)) {
                        $this->deleteCertificateFile($enrollment->certificate_id, $activity->id);
                    }

                    $this->deleteEnrollmentImage($enrollment);
                    $enrollment->delete();
                }
                
                // Explicit cleanup for legacy/typo tables to ensure no residue
                $legacyUserTables = ['activitiusers', 'activity_users'];
                foreach ($legacyUserTables as $table) {
                    if (Schema::hasTable($table)) {
                        DB::table($table)
                            ->where('activity_id', $activity->id)
                            ->where('user_id', $uid)
                            ->delete();
                    }
                }

                // 3. Delete Activity Record (Attendance) - Check both potential tables
                $attendanceIds = [];
                if (Schema::hasTable('attendances')) {
                    $attendanceIds = Attendance::where('activity_id', $activity->id)->pluck('id')->toArray();
                }

                if (!empty($attendanceIds)) {
                    // Main model
                    ActivityRecord::whereIn('attendance_id', $attendanceIds)->where('user_id', $uid)->delete();
                    
                    // Legacy/Typo tables
                    $legacyRecordTables = ['activitirecords', 'activity_records'];
                    foreach ($legacyRecordTables as $table) {
                        if (Schema::hasTable($table)) {
                            DB::table($table)
                                ->whereIn('attendance_id', $attendanceIds)
                                ->where('user_id', $uid)
                                ->delete();
                        }
                    }
                }

                // 4. Delete Room Assignments
                if (Schema::hasTable('activity_hotel_room_assignments')) {
                    ActivityHotelRoomAssignment::where('activity_id', $activity->id)->where('user_id', $uid)->delete();
                }

                // 5. Delete Comments (if any)
                Comment::where('commentable_id', $activity->id)
                    ->where('commentable_type', Activity::class)
                    ->where('user_id', $uid)
                    ->delete();
                    
                // 6. Delete Activity Chats
                if (Schema::hasTable('activity_chats')) {
                    // Delete chats where user is the participant context
                    ActivityChat::where('activity_id', $activity->id)
                        ->where('user_id', $uid)
                        ->delete();
                        
                    // Also delete chats where user is the sender (if any, though usually same as above)
                    ActivityChat::where('activity_id', $activity->id)
                        ->where('sender_id', $uid)
                        ->delete();
                }

                $count++;
            } catch (\Exception $e) {
                Log::error("Failed to delete participant $uid from activity {$activity->id}: " . $e->getMessage());
                $errors[] = $uid;
            }
        }

        return [
            'count' => $count,
            'errors' => $errors
        ];
    }

    /**
     * Delete payment proof file with robust path checking
     */
    protected function deletePaymentProof(Payment $payment)
    {
        if (!$payment->proof_of_payment) return;

        // Skip default assets
        if (str_contains($payment->proof_of_payment, 'assets/images/credit/bukti bayar.png')) return;

        try {
            if (Storage::disk('public')->exists($payment->proof_of_payment)) {
                Storage::disk('public')->delete($payment->proof_of_payment);
            } else {
                // Fallback paths
                $pathsToCheck = [
                    public_path($payment->proof_of_payment),
                    public_path('storage/' . $payment->proof_of_payment)
                ];
                
                foreach ($pathsToCheck as $path) {
                    if (File::exists($path)) {
                        File::delete($path);
                    }
                }
            }
        } catch (\Exception $e) {
            Log::warning("Failed to delete payment proof for payment {$payment->id}: " . $e->getMessage());
        }
    }

    /**
     * Delete enrollment image file with robust path checking
     */
    protected function deleteEnrollmentImage(ActivityUser $enrollment)
    {
        if (!$enrollment->image_path) return;

        try {
            if (Storage::disk('public')->exists($enrollment->image_path)) {
                Storage::disk('public')->delete($enrollment->image_path);
            } else {
                // Fallback paths
                $path = public_path($enrollment->image_path);
                if (File::exists($path)) {
                    File::delete($path);
                }
            }
        } catch (\Exception $e) {
            Log::warning("Failed to delete enrollment image for enrollment {$enrollment->id}: " . $e->getMessage());
        }
    }

    /**
     * Expand user IDs to include their group members if applicable
     */
    protected function expandUserIdsWithGroups($activityId, array $userIds)
    {
        $allUserIds = collect($userIds);

        // Find groups these users belong to
        $groupIds = ActivityUser::where('activity_id', $activityId)
            ->whereIn('user_id', $userIds)
            ->whereNotNull('activity_participant_group_id')
            ->pluck('activity_participant_group_id')
            ->unique();

        if ($groupIds->isNotEmpty()) {
            // Get all members of these groups
            $groupMemberIds = ActivityUser::where('activity_id', $activityId)
                ->whereIn('activity_participant_group_id', $groupIds)
                ->pluck('user_id');
            
            $allUserIds = $allUserIds->merge($groupMemberIds);
        }

        return $allUserIds->unique()->values()->all();
    }

    /**
     * Delete files found in custom_data
     */
    protected function deleteCustomDataFiles($customData)
    {
        if (!is_array($customData)) return;

        foreach ($customData as $key => $value) {
            // Check if value looks like a file path
            if (is_string($value) && (
                strpos($value, 'storage/') === 0 || 
                strpos($value, 'uploads/') === 0 || 
                strpos($value, '/storage/') !== false
            )) {
                try {
                    // Try to delete if it looks like a file path and exists
                    $path = public_path($value);
                    if (File::exists($path) && is_file($path)) {
                        File::delete($path);
                    } else {
                        // Check relative to storage
                        $storagePath = str_replace('storage/', '', $value);
                        if (Storage::disk('public')->exists($storagePath)) {
                            Storage::disk('public')->delete($storagePath);
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning("Failed to delete custom data file {$value}: " . $e->getMessage());
                }
            }
        }
    }

    /**
     * Delete certificate file if it exists
     */
    protected function deleteCertificateFile($certificateId, $activityId)
    {
        // Speculative paths where certificates might be stored
        $paths = [
            "certificates/{$activityId}/{$certificateId}.pdf",
            "certificates/{$certificateId}.pdf",
            "public/certificates/{$activityId}/{$certificateId}.pdf",
            "public/certificates/{$certificateId}.pdf",
        ];

        foreach ($paths as $path) {
            try {
                if (Storage::disk('public')->exists($path)) {
                    Storage::disk('public')->delete($path);
                }
            } catch (\Exception $e) {
                // Ignore errors
            }
        }
    }
}
