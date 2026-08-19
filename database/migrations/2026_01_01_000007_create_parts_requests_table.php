<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parts_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('request_number')->unique();
            $table->foreignUuid('job_card_id')->nullable()->constrained('job_cards')->nullOnDelete();
            $table->foreignUuid('requested_by')->constrained('users')->cascadeOnDelete();
            $table->string('part_name');
            $table->string('part_number')->nullable();
            $table->integer('quantity')->default(1);
            $table->enum('urgency', ['Normal', 'Urgent', 'Emergency'])->default('Normal');
            $table->enum('status', ['Pending', 'Approved', 'Rejected', 'Issued'])->default('Pending');
            $table->text('reason')->nullable();
            $table->text('rejection_note')->nullable();
            $table->text('supervisor_remarks')->nullable();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('bay_number')->nullable();
            $table->foreignUuid('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('issued_at')->nullable();
            $table->text('issuance_notes')->nullable();
            $table->string('collected_by_name')->nullable();
            $table->text('signature_data')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('urgency');
            $table->index('requested_by');
            $table->index('job_card_id');
            $table->index('request_number');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parts_requests');
    }
};
