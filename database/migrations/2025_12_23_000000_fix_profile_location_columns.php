<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        if (\Illuminate\Support\Facades\DB::getDriverName() === 'sqlite') {
            return;
        }

        Schema::table('profiles', function (Blueprint $table) {
            // Change char(6) columns to string to accommodate custom UID format
            $table->string('province_id')->nullable()->change();
            $table->string('regency_id')->nullable()->change();
            $table->string('district_id')->nullable()->change();
        });
    }

    public function down()
    {
        if (\Illuminate\Support\Facades\DB::getDriverName() === 'sqlite') {
            return;
        }

        if (\Illuminate\Support\Facades\DB::table('profiles')
            ->whereRaw('CHAR_LENGTH(province_id) > 6')
            ->orWhereRaw('CHAR_LENGTH(regency_id) > 6')
            ->orWhereRaw('CHAR_LENGTH(district_id) > 6')
            ->exists()) {
            return;
        }

        Schema::table('profiles', function (Blueprint $table) {
            // Revert back to char(6)
            $table->char('province_id', 6)->nullable()->change();
            $table->char('regency_id', 6)->nullable()->change();
            $table->char('district_id', 6)->nullable()->change();
        });
    }
};
