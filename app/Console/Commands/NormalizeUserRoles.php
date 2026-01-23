<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class NormalizeUserRoles extends Command
{
    protected $signature = 'roles:normalize {--promote : Promote users with activities to creator}';

    protected $description = 'Normalize users.role values and optionally promote creators based on activity ownership';

    public function handle(): int
    {
        $this->info('Starting role normalization...');

        $before = DB::table('users')
            ->select('role', DB::raw('COUNT(*) as count'))
            ->groupBy('role')
            ->get();
        $this->table(['role', 'count'], $before->map(fn ($r) => [(string) $r->role, $r->count])->toArray());

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

        if ($this->option('promote')) {
            $this->info('Promoting users with owned activities to creator where appropriate...');
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

        $after = DB::table('users')
            ->select('role', DB::raw('COUNT(*) as count'))
            ->groupBy('role')
            ->get();
        $this->info('Normalization completed. Distribution after changes:');
        $this->table(['role', 'count'], $after->map(fn ($r) => [(string) $r->role, $r->count])->toArray());

        return self::SUCCESS;
    }
}
