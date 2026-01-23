<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('editable_contents')) {
            Schema::create('editable_contents', function (Blueprint $table) {
                $table->customUid();
                $table->string('page_path', 120)->index();
                $table->string('selector', 120);
                $table->longText('content_html')->nullable();
                $table->json('styles_json')->nullable();
                $table->char('updated_by', 6)->nullable();
                $table->timestamps();

                $table->unique(['page_path', 'selector'], 'editable_contents_page_path_selector_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('editable_contents');
    }
};
