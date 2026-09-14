<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportService $service) {}

    public function dashboard(Request $request): JsonResponse
    {
        $this->authorize('reports.view');
        
        try {
            $stats = $this->service->dashboardStats();
            return response()->json($stats);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to load dashboard: ' . $e->getMessage()], 500);
        }
    }

    public function vehicles(Request $request): JsonResponse
    {
        $this->authorize('reports.view');

        try {
            $report = $this->service->vehicles();
            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to load vehicle report: ' . $e->getMessage()], 500);
        }
    }

    public function jobCards(Request $request): JsonResponse
    {
        $this->authorize('reports.view');

        try {
            $report = $this->service->jobCards();
            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to load job card report: ' . $e->getMessage()], 500);
        }
    }

    public function parts(Request $request): JsonResponse
    {
        $this->authorize('reports.view');

        try {
            $report = $this->service->parts();
            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to load parts report: ' . $e->getMessage()], 500);
        }
    }
}
