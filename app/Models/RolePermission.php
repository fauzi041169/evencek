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

        if ($permission) {
            return (bool) $permission->allowed;
        }

        return self::getDefaultAllowed($role, $permissionKey);
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

        if (! empty($permissions)) {
            return $permissions;
        }

        return array_keys(array_filter(self::getDefaultPermissions()[$role] ?? []));
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

    protected static function getDefaultAllowed(string $role, string $permissionKey): bool
    {
        $defaults = self::getDefaultPermissions();
        if (! isset($defaults[$role])) {
            return false;
        }
        $map = $defaults[$role];

        return (bool) ($map[$permissionKey] ?? false);
    }

    protected static function getDefaultPermissions(): array
    {
        return [
            'admin' => [
                'access_dashboard_admin' => true,
                'access_dashboard_user' => true,
                'view_home_activities' => true,
                'create_activity' => true,
                'edit_activity' => true,
                'delete_activity' => true,
                'register_activity' => true,
                'manage_activity_participants' => true,
                'remove_activity_participants' => true,
                'print_participant_cards' => true,
                'print_certificates' => true,
                'export_activity_data' => true,
                'manage_attendance' => true,
                'manage_activity_gallery' => true,
                'manage_certificate_settings' => true,
                'view_activity_list' => true,
                'view_activity_detail' => true,
                'manage_activity_preparation' => true,
                'toggle_activity_registration' => true,
                'toggle_card_visibility' => false,
                'create_news' => true,
                'edit_news' => true,
                'delete_news' => true,
                'read_news' => true,
                'view_news_list' => true,
                'view_news_detail' => true,
                'view_participants' => true,
                'edit_participants' => true,
                'delete_participants' => true,
                'import_participants' => true,
                'export_participants' => true,
                'update_participant_role' => true,
                'approve_participant_enrollment' => true,
                'reject_participant_enrollment' => true,
                'manage_participant_enrollment' => true,
                'manage_categories' => true,
                'manage_partners' => true,
                'manage_pengurus' => true,
                'make_payment' => true,
                'verify_payment' => true,
                'verify_payment_own_activity' => true,
                'view_payments' => true,
                'view_payments_own_activity' => true,
                'view_payment_detail' => true,
                'view_user_management' => false,
                'change_user_role' => false,
                'maintenance_mode' => false,
                'change_system_settings' => false,
                'view_settings' => true,
                'access_mitra_page' => true,
                'access_pengurus_page' => true,
                'access_kategori_page' => true,
                'access_news_page' => true,
                'access_activity_preparation_page' => true,
                'access_attendance_management_page' => true,
                'edit_own_profile' => true,
                'change_password' => true,
                'edit_other_profiles' => true,
            ],
            'creator' => [
                'access_dashboard_admin' => false,
                'access_dashboard_user' => true,
                'view_home_activities' => true,
                'create_activity' => true,
                'edit_activity' => true,
                'delete_activity' => false,
                'register_activity' => true,
                'manage_activity_participants' => true,
                'remove_activity_participants' => true,
                'print_participant_cards' => true,
                'print_certificates' => true,
                'export_activity_data' => true,
                'manage_attendance' => true,
                'manage_activity_gallery' => true,
                'manage_certificate_settings' => true,
                'view_activity_list' => true,
                'view_activity_detail' => true,
                'manage_activity_preparation' => true,
                'toggle_activity_registration' => true,
                'toggle_card_visibility' => false,
                'create_news' => true,
                'edit_news' => true,
                'delete_news' => false,
                'read_news' => true,
                'view_news_list' => true,
                'view_news_detail' => true,
                'view_participants' => true,
                'edit_participants' => true,
                'delete_participants' => false,
                'import_participants' => true,
                'export_participants' => true,
                'update_participant_role' => false,
                'approve_participant_enrollment' => true,
                'reject_participant_enrollment' => true,
                'manage_participant_enrollment' => true,
                'manage_categories' => false,
                'manage_partners' => false,
                'manage_pengurus' => false,
                'make_payment' => true,
                'verify_payment' => false,
                'verify_payment_own_activity' => true,
                'view_payments' => false,
                'view_payments_own_activity' => true,
                'view_payment_detail' => true,
                'view_user_management' => false,
                'change_user_role' => false,
                'maintenance_mode' => false,
                'change_system_settings' => false,
                'view_settings' => false,
                'access_mitra_page' => false,
                'access_pengurus_page' => false,
                'access_kategori_page' => false,
                'access_news_page' => true,
                'access_activity_preparation_page' => true,
                'access_attendance_management_page' => true,
                'edit_own_profile' => true,
                'change_password' => true,
                'edit_other_profiles' => false,
            ],
            'user' => [
                'access_dashboard_admin' => false,
                'access_dashboard_user' => true,
                'view_home_activities' => true,
                'create_activity' => false,
                'edit_activity' => false,
                'delete_activity' => false,
                'register_activity' => true,
                'manage_activity_participants' => false,
                'remove_activity_participants' => false,
                'print_participant_cards' => false,
                'print_certificates' => false,
                'export_activity_data' => false,
                'manage_attendance' => false,
                'manage_activity_gallery' => false,
                'manage_certificate_settings' => false,
                'view_activity_list' => true,
                'view_activity_detail' => true,
                'manage_activity_preparation' => false,
                'toggle_activity_registration' => false,
                'toggle_card_visibility' => false,
                'create_news' => false,
                'edit_news' => false,
                'delete_news' => false,
                'read_news' => true,
                'view_news_list' => true,
                'view_news_detail' => true,
                'view_participants' => false,
                'edit_participants' => false,
                'delete_participants' => false,
                'import_participants' => false,
                'export_participants' => false,
                'update_participant_role' => false,
                'approve_participant_enrollment' => false,
                'reject_participant_enrollment' => false,
                'manage_participant_enrollment' => false,
                'manage_categories' => false,
                'manage_partners' => false,
                'manage_pengurus' => false,
                'make_payment' => true,
                'verify_payment' => false,
                'verify_payment_own_activity' => false,
                'view_payments' => false,
                'view_payments_own_activity' => false,
                'view_payment_detail' => true,
                'view_user_management' => false,
                'change_user_role' => false,
                'maintenance_mode' => false,
                'change_system_settings' => false,
                'view_settings' => false,
                'access_mitra_page' => false,
                'access_pengurus_page' => false,
                'access_kategori_page' => false,
                'access_news_page' => true,
                'access_activity_preparation_page' => false,
                'access_attendance_management_page' => false,
                'edit_own_profile' => true,
                'change_password' => true,
                'edit_other_profiles' => false,
            ],
            'guest' => [
                'access_dashboard_admin' => false,
                'access_dashboard_user' => false,
                'view_home_activities' => true,
                'create_activity' => false,
                'edit_activity' => false,
                'delete_activity' => false,
                'register_activity' => false,
                'manage_activity_participants' => false,
                'remove_activity_participants' => false,
                'print_participant_cards' => false,
                'print_certificates' => false,
                'export_activity_data' => false,
                'manage_attendance' => false,
                'manage_activity_gallery' => false,
                'manage_certificate_settings' => false,
                'view_activity_list' => true,
                'view_activity_detail' => true,
                'manage_activity_preparation' => false,
                'toggle_activity_registration' => false,
                'toggle_card_visibility' => false,
                'create_news' => false,
                'edit_news' => false,
                'delete_news' => false,
                'read_news' => true,
                'view_news_list' => true,
                'view_news_detail' => true,
                'view_participants' => false,
                'edit_participants' => false,
                'delete_participants' => false,
                'import_participants' => false,
                'export_participants' => false,
                'update_participant_role' => false,
                'approve_participant_enrollment' => false,
                'reject_participant_enrollment' => false,
                'manage_participant_enrollment' => false,
                'manage_categories' => false,
                'manage_partners' => false,
                'manage_pengurus' => false,
                'make_payment' => false,
                'verify_payment' => false,
                'verify_payment_own_activity' => false,
                'view_payments' => false,
                'view_payments_own_activity' => false,
                'view_payment_detail' => false,
                'view_user_management' => false,
                'change_user_role' => false,
                'maintenance_mode' => false,
                'change_system_settings' => false,
                'view_settings' => false,
                'access_mitra_page' => false,
                'access_pengurus_page' => false,
                'access_kategori_page' => false,
                'access_news_page' => true,
                'access_activity_preparation_page' => false,
                'access_attendance_management_page' => false,
                'edit_own_profile' => false,
                'change_password' => false,
                'edit_other_profiles' => false,
            ],
        ];
    }
}
