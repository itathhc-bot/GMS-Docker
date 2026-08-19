<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scan_sessions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('pair_code', 8)->unique();
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['pending', 'active', 'completed', 'expired'])->default('pending');
            $table->string('last_plate')->nullable();
            $table->decimal('last_confidence', 5, 2)->nullable();
            $table->string('last_image_url')->nullable();
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index('pair_code');
            $table->index('status');
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scan_sessions');
    }
};
