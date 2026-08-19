<?php
namespace App\Services;
use App\Models\JobCard;
use App\Models\InventoryItem;

class MetricsService {
    public function getPrometheusMetrics(): string {
        $activeJobs = JobCard::active()->count();
        $lowStock = InventoryItem::lowStock()->count();
        return "# HELP garage_active_jobs_total Number of active job cards\n# TYPE garage_active_jobs_total gauge\ngarage_active_jobs_total {$activeJobs}\n# HELP garage_low_stock_items Number of items with low stock\n# TYPE garage_low_stock_items gauge\ngarage_low_stock_items {$lowStock}\n";
    }
}
