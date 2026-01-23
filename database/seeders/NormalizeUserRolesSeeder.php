<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NormalizeUserRolesSeeder extends Seeder
{
    public function run(): void
    {
        try {
            DB::statement('UPDATE users SET role = LOWER(TRIM(role)) WHERE role IS NOT NULL');
        } catch (\Throwable $e) {
            $users = DB::table('users')->select('id', 'role')->get();
            foreach ($users as $u) {
                $normalized = strtolower(trim((string) $u->role));
                DB::table('users')->where('id', $u->id)->update(['role' => $normalized ?: null]);
            }
        }

        DB::table('users')->whereIn('role', ['super admin', 'super-admin', 'super_admin'])
            ->update(['role' => 'superadmin']);
        DB::table('users')->whereIn('role', ['administrator', 'adminstrator'])
            ->update(['role' => 'admin']);
        DB::table('users')->whereIn('role', ['kreator', 'pembuat', 'pencipta'])
            ->update(['role' => 'creator']);
        DB::table('users')->where('role', '')->update(['role' => null]);

        $ids = DB::table('activities')->select('user_id')->whereNotNull('user_id')->distinct()->pluck('user_id');
        if ($ids->isNotEmpty()) {
            DB::table('users')
                ->whereIn('id', $ids)
                ->where(function ($q) {
                    $q->whereNull('role')->orWhereNotIn('role', ['superadmin', 'admin', 'creator']);
                })
                ->update(['role' => 'creator']);
        }
    }
}
