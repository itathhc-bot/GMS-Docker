<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->foreignUuid('user_id')->primary()->constrained('users')->cascadeOnDelete();
            $table->string('full_name')->nullable();
            $table->string('employee_id')->nullable();
            $table->string('department')->nullable();
            $table->string('avatar_url')->nullable();
            $table->string('preferred_language')->nullable();
            $table->json('parts_export_columns')->nullable();
            $table->string('parts_history_location_filter')->nullable();
            $table->boolean('preview_cache_enabled')->default(false);
            $table->integer('preview_cache_ttl_seconds')->nullable();
            $table->boolean('is_deactivated')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
