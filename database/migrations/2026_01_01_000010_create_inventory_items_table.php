<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('sku')->unique();
            $table->string('part_name');
            $table->string('category')->default('General');
            $table->string('location')->nullable();
            $table->integer('stock_quantity')->default(0);
            $table->integer('min_threshold')->default(5);
            $table->decimal('unit_price', 10, 2)->default(0);
            $table->enum('status', ['In Stock', 'Low Stock', 'Out of Stock'])->default('In Stock');
            $table->timestamps();
            $table->softDeletes();

            $table->index('sku');
            $table->index('category');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_items');
    }
};
