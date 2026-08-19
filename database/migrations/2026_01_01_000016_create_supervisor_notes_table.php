<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supervisor_notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('author_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('author_name')->nullable();
            $table->text('note');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supervisor_notes');
    }
};
