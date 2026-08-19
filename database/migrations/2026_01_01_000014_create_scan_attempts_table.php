<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scan_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('session_id')->constrained('scan_sessions')->cascadeOnDelete();
            $table->string('plate')->nullable();
            $table->text('raw_text')->nullable();
            $table->decimal('confidence', 5, 2)->nullable();
            $table->boolean('confirmed')->default(false);
            $table->string('source')->nullable();
            $table->string('thumbnail_url')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scan_attempts');
    }
};
