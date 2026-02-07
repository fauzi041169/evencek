<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class UserManagementController extends Controller
{
    /**
     * Display a listing of all users with their roles
     * Only accessible by admin and superadmin
     */
    public function index(Request $request)
    {
        // Check if user is admin or superadmin
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            abort(403, 'Hanya admin dan superadmin yang dapat mengakses halaman ini');
        }

        $query = User::with(['profile', 'subscription.plan', 'activeSubscription.plan']);

        // Filter by role
        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        // Search by name or email
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Pagination with selectable per_page and "all"
        $perPageParam = $request->input('per_page');
        if ($request->boolean('all') || ($perPageParam === 'all')) {
            $users = $query->orderBy('created_at', 'desc')->get();
        } else {
            $allowed = [10, 25, 50, 100, 200, 500, 20];
            $perPage = (int) ($perPageParam ?: 20);
            if (! in_array($perPage, $allowed, true)) {
                $perPage = 20;
            }
            $users = $query->orderBy('created_at', 'desc')->paginate($perPage)->withQueryString();
        }

        // Get role statistics
        $roleStats = [
            'superadmin' => User::where('role', 'superadmin')->count(),
            'admin' => User::where('role', 'admin')->count(),
            'creator' => User::where('role', 'creator')->count(),
            'user' => User::where('role', 'user')->count(),
            'guest' => User::where('role', 'guest')->count(),
        ];

        // Available roles
        $availableRoles = ['guest', 'user', 'creator', 'admin', 'superadmin'];

        // Available subscription plans (active)
        $plans = \App\Models\SubscriptionPlan::where('is_active', true)->orderBy('sort_order')->get();

        return Inertia::render('UserManagement/Index', compact('users', 'roleStats', 'availableRoles', 'plans'));
    }

    /**
     * Fill missing gender for all users using name-based prediction
     * Admin/Superadmin only
     */
    public function fillGenderGlobal(Request $request)
    {
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }
        $limit = (int) ($request->input('limit') ?? 1000);
        if ($limit < 1) $limit = 1000;
        $stats = ['success' => 0, 'failed' => 0, 'skipped' => 0, 'total' => 0];
        $query = User::with('profile')->whereHas('profile', function ($q) {
            $q->whereNull('jenis_kelamin')->orWhere('jenis_kelamin', '')->orWhere('jenis_kelamin', '-');
        });
        if ($request->filled('role')) {
            $query->where('role', $request->string('role'));
        }
        if ($request->filled('search')) {
            $search = trim($request->string('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%");
            });
        }
        $users = $query->limit($limit)->get();
        foreach ($users as $user) {
            $stats['total']++;
            $profile = $user->profile;
            if (! $profile) {
                $stats['skipped']++;
                continue;
            }
            if (! empty($profile->jenis_kelamin) && $profile->jenis_kelamin !== '-') {
                $stats['skipped']++;
                continue;
            }
            $pred = \App\Helpers\GenderHelper::predict($user->name ?? '');
            if ($pred && in_array($pred, ['L', 'P'])) {
                try {
                    $profile->jenis_kelamin = $pred;
                    $profile->save();
                    $stats['success']++;
                } catch (\Exception $e) {
                    \Log::error('Fill gender error', ['user_id' => $user->id, 'error' => $e->getMessage()]);
                    $stats['failed']++;
                }
            } else {
                $stats['failed']++;
            }
        }
        // Bersihkan cache dashboard agar statistik gender terupdate
        try {
            Cache::flush();
        } catch (\Exception $e) {
            \Log::warning('Cache flush failed after fillGenderGlobal', ['error' => $e->getMessage()]);
        }
        return response()->json([
            'success' => true,
            'message' => "Berhasil mengisi {$stats['success']} jenis kelamin dari {$stats['total']} user yang diproses.",
            'stats' => $stats,
        ]);
    }

    /**
     * Debug: list users with empty gender and predicted value
     * Admin/Superadmin only
     */
    public function debugEmptyGender(Request $request)
    {
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }
        $limit = (int) ($request->input('limit') ?? 100);
        if ($limit < 1) $limit = 100;
        $users = User::with('profile')
            ->whereHas('profile', function ($q) {
                $q->whereNull('jenis_kelamin')->orWhere('jenis_kelamin', '')->orWhere('jenis_kelamin', '-');
            })
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
        $data = $users->map(function ($u) {
            $name = $u->name ?? '';
            $pred = \App\Helpers\GenderHelper::predict($name);
            return [
                'id' => $u->id,
                'name' => $name,
                'email' => $u->email,
                'predicted' => $pred,
            ];
        });
        return response()->json([
            'success' => true,
            'count' => $data->count(),
            'data' => $data,
        ]);
    }

    /**
     * Update user role
     */
    public function updateRole(Request $request, User $user)
    {
        // Check if user is admin or superadmin
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya admin dan superadmin yang dapat mengubah role',
            ], 403);
        }

        // Prevent changing own role
        if ($user->id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Anda tidak dapat mengubah role sendiri',
            ], 400);
        }

        $request->validate([
            'role' => 'required|in:guest,user,creator,admin,superadmin',
        ]);

        try {
            DB::beginTransaction();

            $oldRole = $user->role;
            $user->role = $request->role;
            $user->save();

            Log::info('User role updated', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'old_role' => $oldRole,
                'new_role' => $request->role,
                'changed_by' => auth()->id(),
                'changed_by_name' => auth()->user()->name,
            ]);

            DB::commit();

            if ($request->header('X-Inertia')) {
                return back()->with('success', 'Role berhasil diubah');
            }

            return response()->json([
                'success' => true,
                'message' => 'Role berhasil diubah',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'role' => $user->role,
                    'email' => $user->email,
                ],
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating user role', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString(),
            ]);

            if ($request->wantsJson() && ! $request->header('X-Inertia')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Terjadi kesalahan saat mengubah role: '.$e->getMessage(),
                ], 500);
            }
            
            return back()->with('error', 'Terjadi kesalahan saat mengubah role: '.$e->getMessage());
        }
    }

    /**
     * Get user details for modal
     */
    public function show(User $user)
    {
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        $user->load('profile.province', 'profile.regency', 'profile.district');

        return response()->json([
            'success' => true,
            'user' => $user,
        ]);
    }

    /**
     * Update user subscription by Superadmin
     */
    public function updateSubscription(Request $request, User $user)
    {
        // Only superadmin can change subscription status
        if (! auth()->user()->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya superadmin yang dapat mengubah status langganan',
            ], 403);
        }

        $request->validate([
            'action' => 'required|in:set_plan,unset',
            'plan_slug' => 'nullable|string',
        ]);

        try {
            \DB::beginTransaction();

            if ($request->action === 'unset') {
                // Cancel active subscription if exists
                $active = $user->activeSubscription()->first();
                if ($active) {
                    $active->cancel('Cancelled by superadmin');
                }
                // Clear pointer on user if any
                $user->subscription_id = null;
                $user->save();

                \DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Langganan pengguna dinonaktifkan',
                ]);
            }

            // Set or change plan
            $plan = \App\Models\SubscriptionPlan::where('slug', $request->plan_slug)
                ->where('is_active', true)
                ->first();

            if (! $plan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Paket langganan tidak ditemukan atau tidak aktif',
                ], 422);
            }

            $active = $user->activeSubscription()->first();
            if ($active) {
                $active->update([
                    'subscription_plan_id' => $plan->id,
                    'status' => 'active',
                    'start_date' => now(),
                    'end_date' => now()->addMonth(),
                    'next_billing_date' => now()->addMonth(),
                    'auto_renew' => false,
                    'midtrans_order_id' => null,
                    'midtrans_payment_token' => null,
                    'midtrans_response' => null,
                    'trial_ends_at' => null,
                ]);
                $subscription = $active;
            } else {
                $subscription = \App\Models\Subscription::create([
                    'user_id' => $user->id,
                    'subscription_plan_id' => $plan->id,
                    'status' => 'active',
                    'start_date' => now(),
                    'end_date' => now()->addMonth(),
                    'next_billing_date' => now()->addMonth(),
                    'auto_renew' => false,
                ]);
            }

            // Point user to current subscription
            $user->subscription_id = $subscription->id;
            $user->promoteToCreatorIfEligible();
            $user->save();

            \DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Langganan pengguna berhasil diperbarui',
                'subscription' => [
                    'plan' => $plan->name,
                    'end_date' => $subscription->end_date->format('d M Y'),
                    'status' => $subscription->status,
                ],
            ]);
        } catch (\Exception $e) {
            \DB::rollBack();
            \Log::error('Error updating user subscription', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat memperbarui langganan: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Reset user password by Admin/Superadmin
     */
    public function resetPassword(Request $request, User $user)
    {
        // Check if user is admin or superadmin
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Hanya admin dan superadmin yang dapat mereset password',
            ], 403);
        }

        // Prevent admin from resetting superadmin password
        if (auth()->user()->isAdmin() && $user->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Admin tidak dapat mereset password superadmin',
            ], 403);
        }

        $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        try {
            DB::beginTransaction();

            $user->password = \Illuminate\Support\Facades\Hash::make($request->password);
            $user->save();

            Log::info('User password reset by admin', [
                'user_id' => $user->id,
                'user_name' => $user->name,
                'reset_by' => auth()->id(),
                'reset_by_name' => auth()->user()->name,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Password berhasil direset',
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error resetting user password', [
                'error' => $e->getMessage(),
                'user_id' => $user->id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Terjadi kesalahan saat mereset password: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Delete user and all related data
     */
    public function destroy(User $user)
    {
        // Only superadmin can delete users
        if (! auth()->user()->isSuperAdmin()) {
            if (request()->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Hanya superadmin yang dapat menghapus user',
                ], 403);
            }
            abort(403, 'Hanya superadmin yang dapat menghapus user');
        }

        // Prevent deleting self
        if ($user->id === auth()->id()) {
            if (request()->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Anda tidak dapat menghapus akun sendiri',
                ], 400);
            }

            return back()->with('error', 'Anda tidak dapat menghapus akun sendiri');
        }

        try {
            DB::beginTransaction();

            // 1. Delete owned activities
            $activities = \App\Models\Activity::where('user_id', $user->id)->get();
            foreach ($activities as $activity) {
                // Delete Activity Files
                if ($activity->image) {
                    $this->deleteFile($activity->image);
                }

                // Delete Speakers Files
                foreach ($activity->speakers as $speaker) {
                    if ($speaker->photo) $this->deleteFile($speaker->photo);
                    if ($speaker->cv) $this->deleteFile($speaker->cv);
                    $speaker->delete();
                }

                // Delete Materials Files
                foreach ($activity->materials as $material) {
                    if ($material->file_path) $this->deleteFile($material->file_path);
                    if ($material->cover_image_path) $this->deleteFile($material->cover_image_path);
                    $material->delete();
                }

                // Delete Galleries Files
                foreach ($activity->galleries as $gallery) {
                    if ($gallery->image) $this->deleteFile($gallery->image);
                    $gallery->delete();
                }

                // Delete Certificate Backgrounds
                $certBackgrounds = \Illuminate\Support\Facades\DB::table('certificate_backgrounds')
                    ->where('activity_id', $activity->id)
                    ->get();
                foreach ($certBackgrounds as $bg) {
                    if ($bg->filename) {
                        // Legacy assets deletion
                        if (file_exists(public_path('assets/images/certificate/'.$bg->filename))) {
                            @unlink(public_path('assets/images/certificate/'.$bg->filename));
                        }
                        // Storage deletion
                        $this->deleteFile($bg->filename);
                    }
                }
                \Illuminate\Support\Facades\DB::table('certificate_backgrounds')
                    ->where('activity_id', $activity->id)
                    ->delete();

                // Delete Payments related to Activity
                foreach ($activity->payments as $payment) {
                    if ($payment->proof_of_payment) {
                        $this->deleteFile($payment->proof_of_payment);
                    }
                    $payment->delete();
                }

                // Delete Activity Enrollments (ActivityUser) & Files
                $enrollments = \App\Models\ActivityUser::where('activity_id', $activity->id)->get();
                foreach ($enrollments as $enrollment) {
                    if (isset($enrollment->image_path) && $enrollment->image_path) {
                        $this->deleteFile($enrollment->image_path);
                    }
                    $enrollment->delete();
                }

                // Delete related activity data
                $activity->batches()->delete();
                $activity->participantGroups()->delete();
                $activity->rundowns()->delete();
                $activity->divisions()->delete();
                $activity->committeeStructures()->delete();

                // Delete Activity Records (Attendance Logs)
                \App\Models\ActivityRecord::where('activity_id', $activity->id)->delete();

                // Delete Comments
                \App\Models\Comment::where('commentable_type', \App\Models\Activity::class)
                    ->where('commentable_id', $activity->id)
                    ->delete();

                $activity->delete();
            }

            // 2. Delete Activity Users (Participants)
            if (\Illuminate\Support\Facades\Schema::hasTable('activity_users')) {
                $participants = DB::table('activity_users')->where('user_id', $user->id)->get();
                foreach ($participants as $p) {
                    if (isset($p->image_path) && $p->image_path) {
                        $this->deleteFile($p->image_path);
                    }
                }
                DB::table('activity_users')->where('user_id', $user->id)->delete();
            }

            // 3. Delete Activity Owners pivot
            DB::table('activity_owners')->where('user_id', $user->id)->delete();

            // 4. Delete Attendances
            $user->attendanceRecords()->delete();

            // Delete User's Payments (as participant)
            $userPayments = \App\Models\Payment::where('user_id', $user->id)->get();
            foreach ($userPayments as $payment) {
                if ($payment->proof_of_payment) {
                    $this->deleteFile($payment->proof_of_payment);
                }
                $payment->delete();
            }

            // 5. Delete Profile
            if ($user->profile) {
                if ($user->profile->foto) {
                    $this->deleteFile($user->profile->foto);
                }
                $user->profile->delete();
            }

            // 6. Delete Subscriptions
            $user->subscriptions()->delete();

            // 7. Delete Comments
            \App\Models\Comment::where('user_id', $user->id)->delete();

            // 8. Delete News and Files
            $news = \App\Models\News::where('author_id', $user->id)->get();
            foreach ($news as $n) {
                if ($n->image) {
                    $this->deleteFile($n->image);
                }
                $n->delete();
            }

            // Delete User Avatar
            if ($user->avatar) {
                $this->deleteFile($user->avatar);
            }

            // Finally delete the user
            $user->delete();

            DB::commit();

            if (request()->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'User dan semua data terkait berhasil dihapus',
                ]);
            }

            return redirect()->route('user-management.index')->with('success', 'User dan semua data terkait berhasil dihapus');

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error deleting user', [
                'user_id' => $user->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            if (request()->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menghapus user: '.$e->getMessage(),
                ], 500);
            }

            return back()->with('error', 'Gagal menghapus user: '.$e->getMessage());
        }
    }

    /**
     * Real-time search API for users (AJAX)
     */
    public function searchUsers(Request $request)
    {
        // Check if user is admin or superadmin
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $query = User::with(['profile', 'subscription.plan', 'activeSubscription.plan']);

        // Filter by role if provided
        if ($request->filled('role')) {
            $query->where('role', $request->role);
        }

        // Search by name or email
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Get pagination info
        $perPageParam = $request->input('per_page');
        $showAll = $request->boolean('all') || ($perPageParam === 'all');
        $allowed = [10, 25, 50, 100, 200, 500, 20];
        $perPage = (int) ($perPageParam ?? 20);
        if (! in_array($perPage, $allowed, true)) {
            $perPage = 20;
        }

        // Paginate or get all results
        if ($showAll) {
            $users = $query->orderBy('created_at', 'desc')->get();
        } else {
            $users = $query->orderBy('created_at', 'desc')->paginate($perPage);
        }

        // Transform data for response
        $collection = $showAll ? $users : $users->getCollection();
        $usersData = $collection->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar' => $user->profile?->foto_url ?? asset('assets/images/profilefoto/default-profile.png'),
                'subscription' => $user->activeSubscription?->plan->name ?? 'Tidak Berlangganan',
                'subscription_status' => $user->activeSubscription ? 'Berlangganan' : 'Tidak Berlanggan',
                'created_at' => $user->created_at->format('d M Y'),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $usersData,
            'pagination' => [
                'total' => $showAll ? $users->count() : $users->total(),
                'per_page' => $showAll ? $users->count() : $users->perPage(),
                'current_page' => $showAll ? 1 : $users->currentPage(),
                'last_page' => $showAll ? 1 : $users->lastPage(),
                'from' => $showAll ? ($users->count() ? 1 : 0) : $users->firstItem(),
                'to' => $showAll ? $users->count() : $users->lastItem(),
            ],
        ]);
    }

    /**
     * Download template for user import
     */
    public function downloadTemplate()
    {
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            abort(403);
        }
        
        return \Maatwebsite\Excel\Facades\Excel::download(new \App\Exports\UsersTemplateExport, 'users_template.xlsx');
    }

    /**
     * Import users from Excel
     */
    public function import(Request $request)
    {
        if (! auth()->user()->isAdmin() && ! auth()->user()->isSuperAdmin()) {
            abort(403);
        }

        $request->validate([
            'file' => 'required|mimes:xlsx,xls,csv',
        ]);

        try {
            \Maatwebsite\Excel\Facades\Excel::import(new \App\Imports\UserUpdateImport, $request->file('file'));
            
            return back()->with('success', 'Data user berhasil diimport/diupdate.');
        } catch (\Exception $e) {
            \Log::error($e);
            return back()->with('error', 'Gagal mengimport data: ' . $e->getMessage());
        }
    }

    /**
     * Helper to delete file from storage or public path
     */
    private function deleteFile($path)
    {
        if (empty($path)) {
            return;
        }

        try {
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
            } elseif (file_exists(public_path('storage/' . $path))) {
                @unlink(public_path('storage/' . $path));
            } elseif (file_exists(public_path($path))) {
                @unlink(public_path($path));
            }
        } catch (\Exception $e) {
            Log::warning('Failed to delete file: ' . $path . ' - ' . $e->getMessage());
        }
    }
}
