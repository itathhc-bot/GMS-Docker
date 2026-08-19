<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bay_comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('bay_number');
            $table->foreignUuid('job_card_id')->nullable()->constrained('job_cards')->nullOnDelete();
            $table->foreignUuid('author_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('author_name')->nullable();
            $table->text('comment');
            $table->timestamps();

            $table->index(['bay_number', 'created_at']);
            $table->index(['job_card_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bay_comments');
    }
};
