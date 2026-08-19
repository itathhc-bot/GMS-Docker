<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('log_type', ['admin', 'approval'])->default('admin');
            $table->foreignUuid('actor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_name')->nullable();
            $table->uuid('target_user_id')->nullable();
            $table->string('target_name')->nullable();
            $table->string('action');
            $table->string('entity_type')->nullable();
            $table->uuid('entity_id')->nullable();
            $table->string('entity_ref')->nullable();
            $table->string('stage')->nullable();
            $table->text('reason')->nullable();
            $table->json('details')->nullable();
            $table->timestamps();

            $table->index('log_type');
            $table->index('action');
            $table->index('actor_user_id');
            $table->index(['entity_type', 'entity_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
