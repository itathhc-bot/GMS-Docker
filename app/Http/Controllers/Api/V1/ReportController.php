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
        $this->authorize('viewDashboard', \App\Models\Report::class);
        
        try {
            $stats = $this->service->getDashboardStats();
            return response()->json($stats);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to load dashboard: ' . $e->getMessage()], 500);
        }
    }

    public function vehicles(Request $request): JsonResponse
    {
        $this->authorize('viewReports', \App\Models\Report::class);

        try {
            $filters = $request->only(['date_from', 'date_to', 'department', 'status']);
            $report = $this->service->getVehicleReport($filters);
            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to load vehicle report: ' . $e->getMessage()], 500);
        }
    }

    public function jobCards(Request $request): JsonResponse
    {
        $this->authorize('viewReports', \App\Models\Report::class);

        try {
            $filters = $request->only(['date_from', 'date_to', 'status', 'mechanic_id']);
            $report = $this->service->getJobCardReport($filters);
            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to load job card report: ' . $e->getMessage()], 500);
        }
    }

    public function parts(Request $request): JsonResponse
    {
        $this->authorize('viewReports', \App\Models\Report::class);

        try {
            $filters = $request->only(['date_from', 'date_to']);
            if ($request->query('export') === 'csv') {
                $exportService = app(\App\Services\ExportService::class);
                $path = $exportService->exportPartsRequestsToCsv($filters);
                return response()->json(['message' => 'Export generated', 'path' => $path]);
            }
            
            $report = $this->service->getPartsReport($filters);
            return response()->json($report);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to load parts report: ' . $e->getMessage()], 500);
        }
    }
}
