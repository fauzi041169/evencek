<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected function generateId()
    {
        $letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $numbers = '0123456789';

        $randomLetters = '';
        for ($i = 0; $i < 3; $i++) {
            $randomLetters .= $letters[rand(0, strlen($letters) - 1)];
        }

        $randomNumbers = '';
        for ($i = 0; $i < 3; $i++) {
            $randomNumbers .= $numbers[rand(0, strlen($numbers) - 1)];
        }

        $combined = str_split($randomLetters.$randomNumbers);
        shuffle($combined);

        return implode('', $combined);
    }

    public function up()
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->customUid();
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type')->default('string'); // string, color, number, boolean
            $table->string('group')->default('general'); // colors, general, etc
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Insert default color settings
        DB::table('settings')->insert([
            // Primary Colors
            ['id' => $this->generateId(), 'key' => 'color_primary', 'value' => '#3b82f6', 'type' => 'color', 'group' => 'colors', 'description' => 'Primary color (Blue)', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $this->generateId(), 'key' => 'color_secondary', 'value' => '#6b7280', 'type' => 'color', 'group' => 'colors', 'description' => 'Secondary color (Gray)', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $this->generateId(), 'key' => 'color_success', 'value' => '#10b981', 'type' => 'color', 'group' => 'colors', 'description' => 'Success color (Green)', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $this->generateId(), 'key' => 'color_danger', 'value' => '#ef4444', 'type' => 'color', 'group' => 'colors', 'description' => 'Danger color (Red)', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $this->generateId(), 'key' => 'color_warning', 'value' => '#f59e0b', 'type' => 'color', 'group' => 'colors', 'description' => 'Warning color (Orange)', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $this->generateId(), 'key' => 'color_info', 'value' => '#06b6d4', 'type' => 'color', 'group' => 'colors', 'description' => 'Info color (Cyan)', 'created_at' => now(), 'updated_at' => now()],

            // Navbar & Header
            ['id' => $this->generateId(), 'key' => 'color_navbar_start', 'value' => '#7c3aed', 'type' => 'color', 'group' => 'colors', 'description' => 'Navbar gradient start (Purple)', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $this->generateId(), 'key' => 'color_navbar_end', 'value' => '#3b82f6', 'type' => 'color', 'group' => 'colors', 'description' => 'Navbar gradient end (Blue)', 'created_at' => now(), 'updated_at' => now()],

            // Hero Section
            ['id' => $this->generateId(), 'key' => 'color_hero_start', 'value' => '#7c3aed', 'type' => 'color', 'group' => 'colors', 'description' => 'Hero gradient start (Purple)', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $this->generateId(), 'key' => 'color_hero_end', 'value' => '#3b82f6', 'type' => 'color', 'group' => 'colors', 'description' => 'Hero gradient end (Blue)', 'created_at' => now(), 'updated_at' => now()],

            // Card Colors
            ['id' => $this->generateId(), 'key' => 'color_card_blue', 'value' => '#f0f7ff', 'type' => 'color', 'group' => 'colors', 'description' => 'Card blue background', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $this->generateId(), 'key' => 'color_card_pink', 'value' => '#fef3f2', 'type' => 'color', 'group' => 'colors', 'description' => 'Card pink background', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $this->generateId(), 'key' => 'color_card_green', 'value' => '#f0fdf4', 'type' => 'color', 'group' => 'colors', 'description' => 'Card green background', 'created_at' => now(), 'updated_at' => now()],

            // Application Settings
            ['id' => $this->generateId(), 'key' => 'app_name', 'value' => 'ADZKIATEKNO', 'type' => 'string', 'group' => 'general', 'description' => 'Nama aplikasi', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $this->generateId(), 'key' => 'app_logo', 'value' => 'assets/images/logo.png', 'type' => 'file', 'group' => 'general', 'description' => 'Logo aplikasi', 'created_at' => now(), 'updated_at' => now()],
            ['id' => $this->generateId(), 'key' => 'app_favicon', 'value' => 'assets/images/logo.png', 'type' => 'file', 'group' => 'general', 'description' => 'Favicon aplikasi', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down()
    {
        Schema::dropIfExists('settings');
    }
};
