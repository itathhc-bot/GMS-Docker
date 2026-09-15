<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        try {
            DB::statement("ALTER TABLE purchase_orders MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Draft'");
        } catch (\Throwable $e) {
            // Fallback for non-MySQL or already altered
        }
    }

    public function down(): void
    {
        try {
            DB::statement("ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('Draft', 'Pending Manager Approval', 'Pending Finance Approval', 'Approved', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Draft'");
        } catch (\Throwable $e) {
            // Fallback
        }
    }
};
