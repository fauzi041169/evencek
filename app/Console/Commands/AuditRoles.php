<?php

namespace App\Console\Commands;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AuditRoles extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'roles:audit {--details : Tampilkan daftar rinci untuk anomali}';

    /**
     * The console command description.
     */
    protected $description = 'Audit konsistensi peran dan pengakuan kreator antara lingkungan lokal dan produksi.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('== Audit Peran & Pengakuan Kreator ==');

        // Distribusi nilai role
        $this->line('');
        $this->info('Distribusi Role:');
        $distribution = User::select('role', DB::raw('COUNT(*) as count'))
            ->groupBy('role')
            ->orderBy('role')
            ->get()
            ->map(function ($row) {
                return [
                    'role' => $row->role ?? '(NULL)',
                    'count' => $row->count,
                ];
            })->toArray();
        if (empty($distribution)) {
            $this->warn('Tidak ada data pengguna.');
        } else {
            $this->table(['Role', 'Jumlah'], $distribution);
        }

        // Pengguna pemilik aktivitas tetapi bukan admin/superadmin/creator
        $this->line('');
        $this->info('Pengguna dengan aktivitas tetapi role tidak sesuai:');
        $ownersWithActivities = User::query()
            ->select('users.id', 'users.name', 'users.email', 'users.role', DB::raw('COUNT(activities.id) as activity_count'))
            ->leftJoin('activities', 'activities.user_id', '=', 'users.id')
            ->groupBy('users.id', 'users.name', 'users.email', 'users.role')
            ->havingRaw('COUNT(activities.id) > 0')
            ->whereNotIn('users.role', ['superadmin', 'admin', 'creator'])
            ->get();
        $this->table(['ID', 'Nama', 'Email', 'Role', 'Jumlah Aktivitas'], $ownersWithActivities->map(fn ($u) => [
            $u->id, $u->name, $u->email, $u->role ?? '(NULL)', $u->activity_count,
        ])->toArray());
        if ($ownersWithActivities->isEmpty()) {
            $this->line('Tidak ada anomali pada pemilik aktivitas.');
        }

        // Creator tanpa aktivitas
        $this->line('');
        $this->info('Creator tanpa aktivitas:');
        $creatorsWithoutActivities = User::query()
            ->select('users.id', 'users.name', 'users.email')
            ->where('users.role', 'creator')
            ->leftJoin('activities', 'activities.user_id', '=', 'users.id')
            ->groupBy('users.id', 'users.name', 'users.email')
            ->havingRaw('COUNT(activities.id) = 0')
            ->get();
        $this->table(['ID', 'Nama', 'Email'], $creatorsWithoutActivities->map(fn ($u) => [
            $u->id, $u->name, $u->email,
        ])->toArray());
        if ($creatorsWithoutActivities->isEmpty()) {
            $this->line('Semua creator memiliki setidaknya satu aktivitas.');
        }

        // Aktivitas dengan user_id kosong atau tidak valid
        $this->line('');
        $this->info('Aktivitas dengan owner tidak valid:');
        $activitiesWithInvalidOwner = Activity::query()
            ->select('activities.id', 'activities.name', 'activities.user_id')
            ->leftJoin('users', 'users.id', '=', 'activities.user_id')
            ->where(function ($q) {
                $q->whereNull('activities.user_id')
                    ->orWhereNull('users.id');
            })
            ->orderBy('activities.created_at')
            ->get();
        $this->table(['ID', 'Judul', 'User ID'], $activitiesWithInvalidOwner->map(fn ($a) => [
            $a->id, $a->name, $a->user_id ?? '(NULL)',
        ])->toArray());
        if ($activitiesWithInvalidOwner->isEmpty()) {
            $this->line('Tidak ada aktivitas dengan owner tidak valid.');
        }

        // Role berpotensi tidak ternormalisasi (spasi/kapitalisasi)
        $this->line('');
        $this->info('Nilai role berpotensi tidak ternormalisasi:');
        $unnormalized = User::query()
            ->select('id', 'name', 'email', 'role')
            ->whereNotNull('role')
            ->where(function ($q) {
                $q->whereRaw('role != LOWER(role)')
                    ->orWhereRaw("role LIKE '% %'");
            })
            ->orderBy('id')
            ->get();
        $this->table(['ID', 'Nama', 'Email', 'Role'], $unnormalized->map(fn ($u) => [
            $u->id, $u->name, $u->email, $u->role,
        ])->toArray());
        if ($unnormalized->isEmpty()) {
            $this->line('Semua role sudah dalam format lower-case tanpa spasi.');
        }

        if ($this->option('details')) {
            $this->line('');
            $this->info('Rincian:');
            $this->line('Pengguna anomali (owner aktivitas tanpa role yang tepat):');
            foreach ($ownersWithActivities as $u) {
                $this->line("- {$u->id} {$u->name} <{$u->email}> role={$u->role} aktivitas={$u->activity_count}");
            }
        }

        $this->line('');
        $this->comment('Tips: Jalankan php artisan roles:normalize --promote untuk memperbaiki anomali umum.');

        return self::SUCCESS;
    }
}
