<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->customUid();
            $table->foreignCustomUid('user_id')->constrained()->onDelete('cascade');
            $table->string('no_hp')->nullable();
            $table->string('nik', 20)->nullable();
            $table->string('alamat')->nullable();
            $table->string('foto')->nullable();
            $table->string('pekerjaan')->nullable();
            $table->string('instansi')->nullable();
            $table->string('jabatan')->nullable();
            $table->string('jenis_kelamin', 20)->nullable();
            $table->string('birth_place')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('province_id')->nullable();
            $table->string('regency_id')->nullable();
            $table->string('district_id')->nullable();
            $table->json('additional_data')->nullable();
            $table->timestamps();

            // Indexes
            $table->index('user_id', 'profiles_user_id_index');
            $table->index('province_id', 'profiles_province_id_index');
            $table->index('regency_id', 'profiles_regency_id_index');
            $table->index('district_id', 'profiles_district_id_index');
            $table->index('created_at', 'profiles_created_at_index');
        });
    }

    public function down()
    {
        Schema::dropIfExists('profiles');
    }
};
