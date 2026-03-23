<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\ActivityParticipantGroup;
use App\Models\ActivityUser;
use Illuminate\Http\Request;

class ActivityParticipantGroupController extends Controller
{
    private function checkPermission($activityId)
    {
        $activity = Activity::findOrFail($activityId);

        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            if (! $activity->canManageRegistration(auth()->id())) {
                abort(403, 'Anda tidak memiliki izin untuk mengelola aktivitas ini.');
            }
        }

        return $activity;
    }

    public function index($activityId)
    {
        $this->checkPermission($activityId);
        $groups = ActivityParticipantGroup::where('activity_id', $activityId)
            ->withCount('participants')
            ->get();

        return response()->json($groups);
    }

    public function store(Request $request, $activityId)
    {
        $this->checkPermission($activityId);

        $request->validate([
            'name' => 'required|string|max:191',
        ]);

        $group = ActivityParticipantGroup::create([
            'activity_id' => $activityId,
            'name' => $request->name,
        ]);

        if ($request->ajax()) {
            $rowHtml = '
            <tr>
                <td class="px-4 py-2 whitespace-nowrap font-medium">
                    <form action="'.route('activity.participant-groups.update', ['activity' => $activityId, 'group' => $group->id]).'" method="POST" class="flex gap-2 items-center">
                        <input type="hidden" name="_token" value="'.csrf_token().'">
                        <input type="hidden" name="_method" value="PUT">
                        <input type="text" name="name" value="'.htmlspecialchars($group->name).'" class="border-none bg-transparent focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1 w-full">
                        <button type="submit" class="text-indigo-600 hover:text-indigo-900" title="Simpan"><i class="fas fa-save"></i></button>
                    </form>
                </td>
                <td class="px-4 py-2 whitespace-nowrap">0</td>
                <td class="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                    <form action="'.route('activity.participant-groups.destroy', ['activity' => $activityId, 'group' => $group->id]).'" method="POST" class="inline-block" onsubmit="return confirm(\'Apakah Anda yakin ingin menghapus kelompok ini? Peserta dalam kelompok ini akan dikeluarkan dari kelompok.\')">
                        <input type="hidden" name="_token" value="'.csrf_token().'">
                        <input type="hidden" name="_method" value="DELETE">
                        <button type="submit" class="text-red-600 hover:text-red-900 ml-2" title="Hapus"><i class="fas fa-trash"></i></button>
                    </form>
                </td>
            </tr>';

            return response()->json([
                'status' => 'success',
                'html' => $rowHtml,
                'group' => $group,
            ]);
        }

        return redirect()->back()->with('success', 'Kelompok berhasil dibuat.');
    }

    public function update(Request $request, $activityId, $groupId)
    {
        $this->checkPermission($activityId);

        $request->validate([
            'name' => 'required|string|max:191',
        ]);

        $group = ActivityParticipantGroup::where('activity_id', $activityId)
            ->where('id', $groupId)
            ->firstOrFail();

        $group->update([
            'name' => $request->name,
        ]);

        return redirect()->back()->with('success', 'Kelompok berhasil diperbarui.');
    }

    public function destroy($activityId, $groupId)
    {
        $this->checkPermission($activityId);

        $group = ActivityParticipantGroup::where('activity_id', $activityId)
            ->where('id', $groupId)
            ->firstOrFail();

        // Update participants to remove group_id
        ActivityUser::where('activity_participant_group_id', $groupId)->update(['activity_participant_group_id' => null]);

        $group->delete();

        return redirect()->back()->with('success', 'Kelompok berhasil dihapus.');
    }

    public function assign(Request $request, $activityId)
    {
        $this->checkPermission($activityId);

        // Handle string input from hidden field
        if ($request->has('user_ids') && is_string($request->user_ids)) {
            $ids = array_filter(explode(',', $request->user_ids), function ($value) {
                return $value !== '';
            });
            $request->merge(['user_ids' => array_values($ids)]);
        }

        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
            'group_id' => 'nullable',
        ]);

        if ($validator->fails()) {
            return redirect()->back()
                ->withErrors($validator)
                ->withInput()
                ->with('error', 'Harap pilih peserta yang akan dimasukkan ke kelompok.');
        }

        $groupId = $request->group_id;

        if ($groupId === 'new_group') {
            return redirect()->back()->with('error', 'Silakan simpan nama kelompok baru terlebih dahulu (klik tombol Simpan di sebelah kolom input) sebelum melanjutkan.');
        }

        $selectedUserIds = $request->user_ids;

        $activityUsers = ActivityUser::where('activity_id', $activityId)
            ->whereIn('user_id', $selectedUserIds)
            ->get();

        $existingGroupIds = $activityUsers->pluck('activity_participant_group_id')->filter()->unique();

        foreach ($existingGroupIds as $existingGroupId) {
            $groupMemberIds = ActivityUser::where('activity_id', $activityId)
                ->where('activity_participant_group_id', $existingGroupId)
                ->pluck('user_id')
                ->toArray();

            $missingInSelection = array_diff($groupMemberIds, $selectedUserIds);

            if (! empty($missingInSelection)) {
                return redirect()->back()->with('error', 'Tidak boleh memindahkan sebagian anggota dari kelompok yang sama. Pilih semua anggota kelompok berdasarkan bukti transfer atau proses impor yang sama.');
            }
        }

        $bulkPayments = Payment::where('activity_id', $activityId)
            ->whereNotNull('notes')
            ->get();

        foreach ($bulkPayments as $payment) {
            $decoded = json_decode($payment->notes, true);

            if (! is_array($decoded) || empty($decoded['bulk_import'])) {
                continue;
            }

            $userIdsFromPayment = (array) ($decoded['user_ids'] ?? []);

            if (empty($userIdsFromPayment)) {
                continue;
            }

            $intersection = array_intersect($userIdsFromPayment, $selectedUserIds);

            if (! empty($intersection)) {
                $missingFromSelection = array_diff($userIdsFromPayment, $selectedUserIds);

                if (! empty($missingFromSelection)) {
                    return redirect()->back()->with('error', 'Peserta dalam satu bukti transfer tidak boleh dipisah. Pilih semua peserta yang terdaftar pada bukti transfer tersebut.');
                }
            }
        }

        if ($groupId === 'remove_group') {
            $groupId = null;
        } elseif ($groupId) {
            // Verify group belongs to activity
            ActivityParticipantGroup::where('activity_id', $activityId)
                ->where('id', $groupId)
                ->firstOrFail();
        } else {
            return redirect()->back()->with('error', 'Silakan pilih kelompok target.');
        }

        ActivityUser::where('activity_id', $activityId)
            ->whereIn('user_id', $request->user_ids)
            ->update(['activity_participant_group_id' => $groupId]);

        return redirect()->back()->with('success', 'Peserta berhasil dipindahkan ke kelompok.');
    }
}
