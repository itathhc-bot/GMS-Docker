<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('job_number')->unique();
            $table->foreignUuid('vehicle_id')->nullable()->constrained('vehicles')->nullOnDelete();
            $table->foreignUuid('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['Open', 'In Progress', 'Pending Parts', 'QC Review', 'Completed', 'Delayed'])->default('Open');
            $table->enum('priority', ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'])->default('MEDIUM');
            $table->text('description')->nullable();
            $table->string('bay_number')->nullable();
            $table->decimal('sla_hours', 8, 2)->default(4.00);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('mechanic_signature')->nullable();
            $table->timestamp('mechanic_signed_at')->nullable();
            $table->uuid('mechanic_signed_by')->nullable();
            $table->string('mechanic_signed_name')->nullable();
            $table->text('supervisor_signature')->nullable();
            $table->timestamp('supervisor_signed_at')->nullable();
            $table->uuid('supervisor_signed_by')->nullable();
            $table->string('supervisor_signed_name')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('priority');
            $table->index('assigned_to');
            $table->index('vehicle_id');
            $table->index('job_number');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_cards');
    }
};
