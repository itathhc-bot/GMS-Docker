<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qc_checklist_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('qc_review_id')->constrained('qc_reviews')->cascadeOnDelete();
            $table->string('item_name');
            $table->string('category')->default('General');
            $table->enum('result', ['Pass', 'Fail', 'N/A'])->nullable();
            $table->text('notes')->nullable();
            $table->string('photo_url')->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qc_checklist_items');
    }
};
