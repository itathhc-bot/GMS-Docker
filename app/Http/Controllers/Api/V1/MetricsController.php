<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Services\MetricsService;

class MetricsController extends Controller {
    public function __construct(private MetricsService $metricsService) {}
    public function prometheus() {
        return response($this->metricsService->getPrometheusMetrics())
            ->header('Content-Type', 'text/plain; version=0.0.4');
    }
}
