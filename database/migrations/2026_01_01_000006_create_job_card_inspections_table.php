<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_card_inspections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('job_card_id')->constrained('job_cards')->cascadeOnDelete();
            $table->string('item_key');
            $table->string('item_label');
            $table->string('category')->default('General');
            $table->enum('result', ['Pass', 'Fail', 'N/A'])->default('N/A');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['job_card_id', 'item_key']);
            $table->index('result');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('job_card_inspections');
    }
};
