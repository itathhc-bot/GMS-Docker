<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('plate_number')->unique();
            $table->string('vin')->unique()->nullable();
            $table->string('make')->nullable();
            $table->string('model')->nullable();
            $table->integer('year')->nullable();
            $table->string('department')->nullable();
            $table->string('asset_id')->nullable();
            $table->integer('mileage')->default(0);
            $table->enum('status', ['Available', 'In Service', 'Awaiting Parts', 'Decommissioned'])->default('Available');
            $table->foreignUuid('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('plate_number');
            $table->index('status');
            $table->index('department');
            $table->index('driver_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
