<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\Request;
class DashboardController extends Controller {
    public function __construct(private ReportService $reportService) {}
    public function index() {
        return response()->json($this->reportService->dashboardStats());
    }
}
