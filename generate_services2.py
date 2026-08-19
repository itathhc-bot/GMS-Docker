import os

base = os.getcwd()

def write_file(path, content):
    full_path = os.path.join(base, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

services = {
    "ReportService": """<?php
namespace App\\Services;
use App\\Models\\JobCard;
use App\\Models\\Vehicle;
use App\\Models\\PartsRequest;

class ReportService {
    public function dashboardStats() {
        return [
            'activeJobs' => JobCard::active()->count(),
            'slaBreaches' => JobCard::overdueSla()->count(),
            'pendingParts' => PartsRequest::where('status', 'pending')->count(),
            'vehicleCount' => Vehicle::count(),
        ];
    }
    public function vehicles() { return Vehicle::with('driver')->get(); }
    public function jobCards() { return JobCard::with('vehicle')->get(); }
    public function parts() { return PartsRequest::with('jobCard')->get(); }
}
""",
    "MetricsService": """<?php
namespace App\\Services;
use App\\Models\\JobCard;
use App\\Models\\InventoryItem;

class MetricsService {
    public function getPrometheusMetrics(): string {
        $activeJobs = JobCard::active()->count();
        $lowStock = InventoryItem::lowStock()->count();
        return "# HELP garage_active_jobs_total Number of active job cards\\n# TYPE garage_active_jobs_total gauge\\ngarage_active_jobs_total {$activeJobs}\\n# HELP garage_low_stock_items Number of items with low stock\\n# TYPE garage_low_stock_items gauge\\ngarage_low_stock_items {$lowStock}\\n";
    }
}
""",
    "OcrService": """<?php
namespace App\\Services;
use Illuminate\\Support\\Facades\\Http;

class OcrService {
    public function processImage(string $imageData) {
        return [
            'plate' => 'ABC1234',
            'confidence' => 0.95,
            'rawText' => 'Raw OCR data detected plate ABC1234'
        ];
    }
}
""",
    "QcService": """<?php
namespace App\\Services;
use App\\Models\\QcReview;
class QcService {
    public function createReview($jobCardId, $inspectorId) {
        return QcReview::create(['job_card_id' => $jobCardId, 'inspector_id' => $inspectorId, 'status' => 'pending']);
    }
    public function updateChecklist($reviewId, array $items) {
        $review = QcReview::findOrFail($reviewId);
        $review->checklistItems()->delete();
        $review->checklistItems()->createMany($items);
        return $review;
    }
    public function finalizeReview($reviewId, $status, $signature, $actorId) {
        $review = QcReview::findOrFail($reviewId);
        $review->update(['status' => $status, 'inspector_signature' => $signature]);
        return $review;
    }
}
""",
}

for name, code in services.items():
    write_file(f"app/Services/{name}.php", code)

middleware = {
    "ForceJsonResponse": """<?php
namespace App\\Http\\Middleware;
use Closure;
use Illuminate\\Http\\Request;
class ForceJsonResponse {
    public function handle(Request $request, Closure $next) {
        $request->headers->set('Accept', 'application/json');
        return $next($request);
    }
}
""",
    "SecurityHeaders": """<?php
namespace App\\Http\\Middleware;
use Closure;
use Illuminate\\Http\\Request;
class SecurityHeaders {
    public function handle(Request $request, Closure $next) {
        $response = $next($request);
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        return $response;
    }
}
"""
}

for name, code in middleware.items():
    write_file(f"app/Http/Middleware/{name}.php", code)

print("Generated Remaining Services and Middleware.")
