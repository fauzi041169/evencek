<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('mitras', function (Blueprint $table) {
            $table->customUid();
            $table->string('company_name');
            $table->string('company_email')->unique();
            $table->string('company_phone');
            $table->text('company_address');
            $table->string('website')->nullable();
            $table->string('industry')->nullable();
            $table->string('company_size')->nullable();
            $table->string('contact_person');
            $table->string('contact_position');
            $table->string('contact_phone');
            $table->string('contact_email');
            $table->text('description')->nullable();
            $table->string('logo')->nullable();
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('mitras');
    }
};
