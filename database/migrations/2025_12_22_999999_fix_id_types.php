<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // 1. Drop Foreign Keys
        try {
            DB::statement('ALTER TABLE `activities` DROP FOREIGN KEY `activities_category_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activities` DROP FOREIGN KEY `activities_user_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_contents` DROP FOREIGN KEY `activity_contents_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_division_requirements` DROP FOREIGN KEY `activity_division_requirements_activity_division_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `comments` DROP FOREIGN KEY `comments_parent_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `comments` DROP FOREIGN KEY `comments_user_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `districts` DROP FOREIGN KEY `districts_regency_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `followers` DROP FOREIGN KEY `followers_follower_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `followers` DROP FOREIGN KEY `followers_user_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `galleries` DROP FOREIGN KEY `galleries_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `model_has_permissions` DROP FOREIGN KEY `model_has_permissions_permission_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `model_has_roles` DROP FOREIGN KEY `model_has_roles_role_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `news` DROP FOREIGN KEY `news_author_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `news` DROP FOREIGN KEY `news_category_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `payment_methods` DROP FOREIGN KEY `payment_methods_verified_by_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `profiles` DROP FOREIGN KEY `profiles_user_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `regencies` DROP FOREIGN KEY `regencies_province_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `role_has_permissions` DROP FOREIGN KEY `role_has_permissions_permission_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `role_has_permissions` DROP FOREIGN KEY `role_has_permissions_role_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `subscriptions` DROP FOREIGN KEY `subscriptions_subscription_plan_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `subscriptions` DROP FOREIGN KEY `subscriptions_user_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `users` DROP FOREIGN KEY `users_subscription_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `views` DROP FOREIGN KEY `views_user_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `withdrawal_requests` DROP FOREIGN KEY `withdrawal_requests_user_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `withdrawal_requests` DROP FOREIGN KEY `withdrawal_requests_verified_by_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `attendances` DROP FOREIGN KEY `attendances_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_users` DROP FOREIGN KEY `activity_users_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_users` DROP FOREIGN KEY `activity_users_user_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `certificate_settings` DROP FOREIGN KEY `certificate_settings_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `card_settings` DROP FOREIGN KEY `card_settings_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `payments` DROP FOREIGN KEY `payments_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `payments` DROP FOREIGN KEY `payments_payment_method_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `payments` DROP FOREIGN KEY `payments_user_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `payments` DROP FOREIGN KEY `payments_verified_by_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_rundowns` DROP FOREIGN KEY `activity_rundowns_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_materials` DROP FOREIGN KEY `activity_materials_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_materials` DROP FOREIGN KEY `activity_materials_uploaded_by_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_committee_structures` DROP FOREIGN KEY `activity_committee_structures_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_committee_structures` DROP FOREIGN KEY `activity_committee_structures_user_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_divisions` DROP FOREIGN KEY `activity_divisions_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activitirecords` DROP FOREIGN KEY `activitirecords_activity_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activitirecords` DROP FOREIGN KEY `activitirecords_attendance_id_foreign`');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activitirecords` DROP FOREIGN KEY `activitirecords_user_id_foreign`');
        } catch (\Throwable $e) {
        }

        // 2. Modify Primary Key columns (remove auto_increment, set to char(6))
        DB::statement('ALTER TABLE `activities` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activitirecords` MODIFY `id` CHAR(6) NOT NULL');
        if (Schema::hasTable('activity_users')) {
            DB::statement('ALTER TABLE `activity_users` MODIFY `id` CHAR(6) NOT NULL');
        }
        DB::statement('ALTER TABLE `activity_batches` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_committee_structures` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_contents` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_division_requirements` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_divisions` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_hotel_room_assignments` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_hotel_rooms` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_materials` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_rundowns` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `attendances` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `card_settings` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `categories` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `certificate_backgrounds` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `certificate_settings` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `comments` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `districts` MODIFY `id` CHAR(7) NOT NULL');
        DB::statement('ALTER TABLE `editable_contents` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `failed_jobs` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `financial_settings` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `followers` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `galleries` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `idcardbegrounds` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `jobs` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `maintenance_settings` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `mitras` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `news` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `partners` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `payment_methods` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `payments` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `pengurus` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `performance_logs` MODIFY `id` CHAR(6) NOT NULL');
        if (Schema::hasTable('permissions')) {
            DB::statement('ALTER TABLE `permissions` MODIFY `id` CHAR(6) NOT NULL');
        }
        DB::statement('ALTER TABLE `personal_access_tokens` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `profiles` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `provinces` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `regencies` MODIFY `id` CHAR(6) NOT NULL');
        if (Schema::hasTable('role_permissions')) {
            DB::statement('ALTER TABLE `role_permissions` MODIFY `id` CHAR(6) NOT NULL');
        }
        if (Schema::hasTable('roles')) {
            DB::statement('ALTER TABLE `roles` MODIFY `id` CHAR(6) NOT NULL');
        }
        DB::statement('ALTER TABLE `settings` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `subscription_plans` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `subscriptions` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `users` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `views` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `vouchers` MODIFY `id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `withdrawal_requests` MODIFY `id` CHAR(6) NOT NULL');

        // 3. Modify Foreign Key columns
        DB::statement('ALTER TABLE `activities` MODIFY `category_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activities` MODIFY `user_id` CHAR(6) NULL');
        DB::statement('ALTER TABLE `activity_contents` MODIFY `activity_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_division_requirements` MODIFY `activity_division_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `comments` MODIFY `parent_id` CHAR(6) NULL');
        DB::statement('ALTER TABLE `comments` MODIFY `user_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `districts` MODIFY `regency_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `followers` MODIFY `follower_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `followers` MODIFY `user_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `galleries` MODIFY `activity_id` CHAR(6) NOT NULL');
        if (Schema::hasTable('model_has_permissions')) {
            DB::statement('ALTER TABLE `model_has_permissions` MODIFY `permission_id` CHAR(6) NOT NULL');
        }
        if (Schema::hasTable('model_has_roles')) {
            DB::statement('ALTER TABLE `model_has_roles` MODIFY `role_id` CHAR(6) NOT NULL');
        }
        DB::statement('ALTER TABLE `news` MODIFY `author_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `news` MODIFY `category_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `payment_methods` MODIFY `verified_by` CHAR(6) NULL');
        DB::statement('ALTER TABLE `profiles` MODIFY `user_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `regencies` MODIFY `province_id` CHAR(6) NOT NULL');
        if (Schema::hasTable('role_has_permissions')) {
            DB::statement('ALTER TABLE `role_has_permissions` MODIFY `permission_id` CHAR(6) NOT NULL');
            DB::statement('ALTER TABLE `role_has_permissions` MODIFY `role_id` CHAR(6) NOT NULL');
        }
        DB::statement('ALTER TABLE `subscriptions` MODIFY `subscription_plan_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `subscriptions` MODIFY `user_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `users` MODIFY `subscription_id` CHAR(6) NULL');
        DB::statement('ALTER TABLE `views` MODIFY `user_id` CHAR(6) NULL');
        DB::statement('ALTER TABLE `withdrawal_requests` MODIFY `user_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `withdrawal_requests` MODIFY `verified_by` CHAR(6) NULL');
        DB::statement('ALTER TABLE `attendances` MODIFY `activity_id` CHAR(6) NOT NULL');
        if (Schema::hasTable('activity_users')) {
            DB::statement('ALTER TABLE `activity_users` MODIFY `activity_id` CHAR(6) NOT NULL');
            DB::statement('ALTER TABLE `activity_users` MODIFY `user_id` CHAR(6) NOT NULL');
        }
        DB::statement('ALTER TABLE `certificate_settings` MODIFY `activity_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `card_settings` MODIFY `activity_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `payments` MODIFY `activity_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `payments` MODIFY `payment_method_id` CHAR(6) NULL');
        DB::statement('ALTER TABLE `payments` MODIFY `user_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `payments` MODIFY `verified_by` CHAR(6) NULL');
        DB::statement('ALTER TABLE `activity_rundowns` MODIFY `activity_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_materials` MODIFY `activity_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_materials` MODIFY `uploaded_by` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_committee_structures` MODIFY `activity_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activity_committee_structures` MODIFY `user_id` CHAR(6) NULL');
        DB::statement('ALTER TABLE `activity_divisions` MODIFY `activity_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activitirecords` MODIFY `activity_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activitirecords` MODIFY `attendance_id` CHAR(6) NOT NULL');
        DB::statement('ALTER TABLE `activitirecords` MODIFY `user_id` CHAR(6) NOT NULL');

        // 4. Re-add Foreign Keys
        try {
            DB::statement('ALTER TABLE `activities` ADD CONSTRAINT `activities_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activities` ADD CONSTRAINT `activities_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_contents` ADD CONSTRAINT `activity_contents_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_division_requirements` ADD CONSTRAINT `activity_division_requirements_activity_division_id_foreign` FOREIGN KEY (`activity_division_id`) REFERENCES `activity_divisions` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `comments` ADD CONSTRAINT `comments_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `comments` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `comments` ADD CONSTRAINT `comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `districts` ADD CONSTRAINT `districts_regency_id_foreign` FOREIGN KEY (`regency_id`) REFERENCES `regencies` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `followers` ADD CONSTRAINT `followers_follower_id_foreign` FOREIGN KEY (`follower_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `followers` ADD CONSTRAINT `followers_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `galleries` ADD CONSTRAINT `galleries_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `model_has_permissions` ADD CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `model_has_roles` ADD CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `news` ADD CONSTRAINT `news_author_id_foreign` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `news` ADD CONSTRAINT `news_category_id_foreign` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `regencies` ADD CONSTRAINT `regencies_province_id_foreign` FOREIGN KEY (`province_id`) REFERENCES `provinces` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `role_has_permissions` ADD CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `role_has_permissions` ADD CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_subscription_plan_id_foreign` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `users` ADD CONSTRAINT `users_subscription_id_foreign` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `views` ADD CONSTRAINT `views_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `withdrawal_requests` ADD CONSTRAINT `withdrawal_requests_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `withdrawal_requests` ADD CONSTRAINT `withdrawal_requests_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `attendances` ADD CONSTRAINT `attendances_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_users` ADD CONSTRAINT `activity_users_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_users` ADD CONSTRAINT `activity_users_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `certificate_settings` ADD CONSTRAINT `certificate_settings_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `card_settings` ADD CONSTRAINT `card_settings_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `payments` ADD CONSTRAINT `payments_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `payments` ADD CONSTRAINT `payments_payment_method_id_foreign` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `payments` ADD CONSTRAINT `payments_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_rundowns` ADD CONSTRAINT `activity_rundowns_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_materials` ADD CONSTRAINT `activity_materials_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_materials` ADD CONSTRAINT `activity_materials_uploaded_by_foreign` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_committee_structures` ADD CONSTRAINT `activity_committee_structures_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_committee_structures` ADD CONSTRAINT `activity_committee_structures_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activity_divisions` ADD CONSTRAINT `activity_divisions_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activitirecords` ADD CONSTRAINT `activitirecords_activity_id_foreign` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activitirecords` ADD CONSTRAINT `activitirecords_attendance_id_foreign` FOREIGN KEY (`attendance_id`) REFERENCES `attendances` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
        try {
            DB::statement('ALTER TABLE `activitirecords` ADD CONSTRAINT `activitirecords_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION');
        } catch (\Throwable $e) {
        }
    }

    public function down()
    {
        // Irreversible without complex logic
    }
};
