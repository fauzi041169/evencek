<?php

namespace Database\Seeders;

use App\Models\RolePermission;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get all permission keys
        $allPermissions = RolePermission::getAllPermissionKeys();

        // Default permissions untuk setiap role
        $defaultPermissions = [
            'admin' => [
                // Dashboard & Akses Utama
                'access_dashboard_admin' => true,
                'access_dashboard_user' => true,
                'view_home_activities' => true,

                // Manajemen Aktivitas
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
                'toggle_card_visibility' => false, // Hanya superadmin

                // Manajemen Konten
                'create_news' => true,
                'edit_news' => true,
                'delete_news' => true,
                'read_news' => true,
                'view_news_list' => true,
                'view_news_detail' => true,

                // Manajemen Peserta
                'view_participants' => true,
                'edit_participants' => true,
                'delete_participants' => false, // Hanya superadmin
                'import_participants' => true,
                'export_participants' => true,
                'update_participant_role' => false, // Hanya superadmin
                'approve_participant_enrollment' => true, // Admin bisa approve pendaftaran peserta
                'reject_participant_enrollment' => true, // Admin bisa reject pendaftaran peserta
                'manage_participant_enrollment' => true, // Admin bisa kelola validasi pendaftaran peserta

                // Manajemen Data Master
                'manage_categories' => true,
                'manage_partners' => true,
                'manage_pengurus' => true,

                // Manajemen Pembayaran
                'make_payment' => true,
                'verify_payment' => true,
                'verify_payment_own_activity' => true,
                'view_payments' => true,
                'view_payments_own_activity' => true,
                'view_payment_detail' => true,

                // Manajemen User & Sistem
                'view_user_management' => false, // Hanya superadmin
                'change_user_role' => false, // Hanya superadmin
                'maintenance_mode' => false, // Hanya superadmin
                'change_system_settings' => false, // Hanya superadmin
                'view_settings' => true,
                'access_mitra_page' => true,
                'access_pengurus_page' => true,
                'access_kategori_page' => true,
                'access_news_page' => true,
                'access_activity_preparation_page' => true,
                'access_attendance_management_page' => true,

                // Profil & Akun
                'edit_own_profile' => true,
                'change_password' => true,
                'edit_other_profiles' => true,
            ],
            'creator' => [
                // Dashboard & Akses Utama
                'access_dashboard_admin' => false,
                'access_dashboard_user' => true,
                'view_home_activities' => true,

                // Manajemen Aktivitas
                'create_activity' => true,
                'edit_activity' => true, // Hanya aktivitas sendiri
                'delete_activity' => false, // Creator tidak bisa hapus aktivitas
                'register_activity' => true,
                'manage_activity_participants' => true, // Hanya aktivitas sendiri
                'remove_activity_participants' => true, // Hanya aktivitas sendiri
                'print_participant_cards' => true, // Creator bisa print kartu peserta untuk aktivitas mereka
                'print_certificates' => true, // Creator bisa print sertifikat untuk aktivitas mereka
                'export_activity_data' => true, // Hanya aktivitas sendiri
                'manage_attendance' => true, // Hanya aktivitas sendiri
                'manage_activity_gallery' => true, // Hanya aktivitas sendiri
                'manage_certificate_settings' => true, // Hanya aktivitas sendiri
                'view_activity_list' => true,
                'view_activity_detail' => true,
                'manage_activity_preparation' => true, // Hanya aktivitas sendiri
                'toggle_activity_registration' => true, // Hanya aktivitas sendiri
                'toggle_card_visibility' => false, // Hanya superadmin

                // Manajemen Konten
                'create_news' => true,
                'edit_news' => true, // Hanya berita sendiri
                'delete_news' => false,
                'read_news' => true,
                'view_news_list' => true,
                'view_news_detail' => true,

                // Manajemen Peserta
                'view_participants' => true, // Creator bisa lihat peserta aktivitas mereka
                'edit_participants' => true, // Creator bisa edit peserta aktivitas mereka
                'delete_participants' => false, // Hanya superadmin
                'import_participants' => true, // Creator bisa import peserta untuk aktivitas mereka
                'export_participants' => true, // Creator bisa export peserta aktivitas mereka
                'update_participant_role' => false, // Hanya superadmin
                'approve_participant_enrollment' => true, // Creator bisa approve pendaftaran peserta untuk aktivitas mereka
                'reject_participant_enrollment' => true, // Creator bisa reject pendaftaran peserta untuk aktivitas mereka
                'manage_participant_enrollment' => true, // Creator bisa kelola validasi pendaftaran peserta untuk aktivitas mereka

                // Manajemen Data Master
                'manage_categories' => false,
                'manage_partners' => false,
                'manage_pengurus' => false,

                // Manajemen Pembayaran
                'make_payment' => true,
                'verify_payment' => false,
                'verify_payment_own_activity' => true, // Hanya aktivitas sendiri
                // Penting: creator TIDAK memiliki akses penuh ke semua pembayaran
                'view_payments' => false,
                'view_payments_own_activity' => true, // Hanya aktivitas sendiri
                'view_payment_detail' => true, // Hanya pembayaran sendiri atau aktivitas yang dikelola

                // Manajemen User & Sistem
                'view_user_management' => false,
                'change_user_role' => false,
                'maintenance_mode' => false,
                'change_system_settings' => false,
                'view_settings' => false,
                'access_mitra_page' => false,
                'access_pengurus_page' => false,
                'access_kategori_page' => false,
                'access_news_page' => true,
                'access_activity_preparation_page' => true, // Hanya aktivitas sendiri
                'access_attendance_management_page' => true, // Hanya aktivitas sendiri

                // Profil & Akun
                'edit_own_profile' => true,
                'change_password' => true,
                'edit_other_profiles' => false,
            ],
            'user' => [
                // Dashboard & Akses Utama
                'access_dashboard_admin' => false,
                'access_dashboard_user' => true,
                'view_home_activities' => true,

                // Manajemen Aktivitas
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
                'manage_activity_preparation' => true, // User bisa manage jika mereka panitia (dicek di controller)
                'toggle_activity_registration' => false,
                'toggle_card_visibility' => false,

                // Manajemen Konten
                'create_news' => false,
                'edit_news' => false,
                'delete_news' => false,
                'read_news' => true,
                'view_news_list' => true,
                'view_news_detail' => true,

                // Manajemen Peserta
                'view_participants' => false,
                'edit_participants' => false,
                'delete_participants' => false,
                'import_participants' => false,
                'export_participants' => false,
                'update_participant_role' => false,
                'approve_participant_enrollment' => false,
                'reject_participant_enrollment' => false,
                'manage_participant_enrollment' => false,

                // Manajemen Data Master
                'manage_categories' => false,
                'manage_partners' => false,
                'manage_pengurus' => false,

                // Manajemen Pembayaran
                'make_payment' => true,
                'verify_payment' => false,
                'verify_payment_own_activity' => true, // User (panitia/creator aktivitas) dapat verify aktivitas yang dikelola
                // Penting: user TIDAK memiliki akses penuh ke semua pembayaran
                'view_payments' => false,
                'view_payments_own_activity' => true, // User panitia/creator bisa lihat pembayaran aktivitas yang mereka kelola
                'view_payment_detail' => true, // Hanya pembayaran sendiri

                // Manajemen User & Sistem
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

                // Profil & Akun
                'edit_own_profile' => true,
                'change_password' => true,
                'edit_other_profiles' => false,
            ],
            'guest' => [
                // Dashboard & Akses Utama
                'access_dashboard_admin' => false,
                'access_dashboard_user' => false,
                'view_home_activities' => true,

                // Manajemen Aktivitas
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

                // Manajemen Konten
                'create_news' => false,
                'edit_news' => false,
                'delete_news' => false,
                'read_news' => true,
                'view_news_list' => true,
                'view_news_detail' => true,

                // Manajemen Peserta
                'view_participants' => false,
                'edit_participants' => false,
                'delete_participants' => false,
                'import_participants' => false,
                'export_participants' => false,
                'update_participant_role' => false,
                'approve_participant_enrollment' => false,
                'reject_participant_enrollment' => false,
                'manage_participant_enrollment' => false,

                // Manajemen Data Master
                'manage_categories' => false,
                'manage_partners' => false,
                'manage_pengurus' => false,

                // Manajemen Pembayaran
                'make_payment' => false,
                'verify_payment' => false,
                'verify_payment_own_activity' => false,
                'view_payments' => false,
                'view_payments_own_activity' => false,
                'view_payment_detail' => false,

                // Manajemen User & Sistem
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

                // Profil & Akun
                'edit_own_profile' => true,
                'change_password' => true,
                'edit_other_profiles' => false,
            ],
        ];

        // Insert permissions untuk setiap role
        foreach ($defaultPermissions as $role => $permissions) {
            foreach ($allPermissions as $permissionKey) {
                // Set permission jika ada di defaultPermissions, jika tidak set ke false
                $allowed = isset($permissions[$permissionKey]) ? $permissions[$permissionKey] : false;

                RolePermission::updateOrCreate(
                    [
                        'role' => $role,
                        'permission_key' => $permissionKey,
                    ],
                    [
                        'allowed' => $allowed,
                    ]
                );
            }
        }

        $this->command->info('Default permissions seeded successfully!');
    }
}
