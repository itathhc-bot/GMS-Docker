<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qc_reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('job_card_id')->constrained('job_cards')->cascadeOnDelete();
            $table->foreignUuid('inspector_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['Pending', 'In Review', 'Passed', 'Failed', 'Rework'])->default('Pending');
            $table->text('remarks')->nullable();
            $table->text('signature_data')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique('job_card_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qc_reviews');
    }
};
