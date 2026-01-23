<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RolePermission extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = [
        'role',
        'permission_key',
        'allowed',
    ];

    protected $casts = [
        'allowed' => 'boolean',
    ];

    /**
     * Check if role has permission
     */
    public static function hasPermission(string $role, string $permissionKey): bool
    {
        // Superadmin always has all permissions
        if ($role === 'superadmin') {
            return true;
        }

        $permission = self::where('role', $role)
            ->where('permission_key', $permissionKey)
            ->first();

        // If permission not found in database, return false (deny by default)
        return $permission ? $permission->allowed : false;
    }

    /**
     * Get all permissions for a role
     */
    public static function getPermissionsForRole(string $role): array
    {
        $permissions = self::where('role', $role)
            ->where('allowed', true)
            ->pluck('permission_key')
            ->toArray();

        // Superadmin always has all permissions
        if ($role === 'superadmin') {
            return self::getAllPermissionKeys();
        }

        return $permissions;
    }

    /**
     * Get all available permission keys
     */
    public static function getAllPermissionKeys(): array
    {
        return [
            // Dashboard & Akses Utama
            'access_dashboard_admin',
            'access_dashboard_user',
            'view_home_activities',

            // Manajemen Aktivitas
            'create_activity',
            'edit_activity',
            'delete_activity',
            'register_activity',
            'manage_activity_participants',
            'remove_activity_participants',
            'print_participant_cards',
            'print_certificates',
            'export_activity_data',
            'manage_attendance',
            'manage_activity_gallery',
            'manage_certificate_settings',
            'view_activity_list', // Melihat daftar aktivitas
            'view_activity_detail', // Melihat detail aktivitas
            'manage_activity_preparation', // Mengelola persiapan aktivitas (divisi, panitia, rundown)
            'toggle_activity_registration', // Mengubah status pendaftaran aktivitas
            'toggle_card_visibility', // Mengubah visibility card buttons

            // Manajemen Konten
            'create_news',
            'edit_news',
            'delete_news',
            'read_news',
            'view_news_list', // Melihat daftar berita
            'view_news_detail', // Melihat detail berita

            // Manajemen Peserta
            'view_participants',
            'edit_participants',
            'delete_participants',
            'import_participants',
            'export_participants', // Export data peserta
            'update_participant_role', // Mengubah role peserta
            'approve_participant_enrollment', // Menyetujui pendaftaran peserta baru
            'reject_participant_enrollment', // Menolak pendaftaran peserta baru
            'manage_participant_enrollment', // Mengelola validasi pendaftaran peserta (termasuk approve/reject)

            // Manajemen Data Master
            'manage_categories',
            'manage_partners',
            'manage_pengurus',

            // Manajemen Pembayaran
            'make_payment',
            'verify_payment',
            'verify_payment_own_activity', // Creator/panitia bisa verifikasi pembayaran kegiatan mereka
            'view_payments',
            'view_payments_own_activity', // Creator/panitia bisa lihat pembayaran kegiatan mereka
            'view_payment_detail', // Melihat detail pembayaran

            // Manajemen User & Sistem
            'view_user_management',
            'change_user_role',
            'maintenance_mode',
            'change_system_settings',
            'view_settings', // Melihat pengaturan sistem
            'access_mitra_page', // Akses ke halaman mitra
            'access_pengurus_page', // Akses ke halaman pengurus
            'access_kategori_page', // Akses ke halaman kategori
            'access_news_page', // Akses ke halaman berita
            'access_activity_preparation_page', // Akses ke halaman persiapan aktivitas
            'access_attendance_management_page', // Akses ke halaman manajemen absensi

            // Profil & Akun
            'edit_own_profile',
            'change_password',
            'edit_other_profiles',
        ];
    }

    /**
     * Set permission for role
     */
    public static function setPermission(string $role, string $permissionKey, bool $allowed): void
    {
        self::updateOrCreate(
            [
                'role' => $role,
                'permission_key' => $permissionKey,
            ],
            [
                'allowed' => $allowed,
            ]
        );
    }

    /**
     * Bulk set permissions for role
     */
    public static function setPermissionsForRole(string $role, array $permissions): void
    {
        foreach ($permissions as $key => $allowed) {
            self::setPermission($role, $key, (bool) $allowed);
        }
    }
}
