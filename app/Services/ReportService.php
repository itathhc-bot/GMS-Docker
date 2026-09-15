<?php
namespace App\Services;
use App\Models\JobCard;
use App\Models\Vehicle;
use App\Models\PartsRequest;

class ReportService {
    public function dashboardStats() {
        $activeJobs = JobCard::active()->count();
        $slaBreaches = JobCard::overdueSla()->count();
        $pendingParts = PartsRequest::whereIn('status', ['Pending', 'pending'])->count();
        $vehicleCount = Vehicle::count();

        // Workload breakdown by status
        $statuses = ['Open', 'In Progress', 'Pending Parts', 'QC Review', 'Completed'];
        $workload = [];
        foreach ($statuses as $st) {
            $count = JobCard::where('status', $st)->count();
            if ($count > 0 || in_array($st, ['Open', 'In Progress', 'Pending Parts'])) {
                $workload[$st] = $count;
            }
        }

        // Repair trends for last 6 months
        $repairTrends = [];
        for ($i = 5; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthName = $date->format('M');
            $year = $date->year;
            $month = $date->month;
            $count = JobCard::whereYear('created_at', $year)
                ->whereMonth('created_at', $month)
                ->count();
            $repairTrends[] = [
                'month' => $monthName,
                'jobs' => $count,
            ];
        }

        return [
            // camelCase keys
            'activeJobs' => $activeJobs,
            'slaBreaches' => $slaBreaches,
            'pendingParts' => $pendingParts,
            'vehicleCount' => $vehicleCount,
            'workload' => $workload,
            'workloadByStatus' => $workload,
            'repairTrends' => $repairTrends,
            // snake_case keys
            'active_jobs' => $activeJobs,
            'sla_breaches' => $slaBreaches,
            'pending_parts' => $pendingParts,
            'vehicle_count' => $vehicleCount,
            'repair_trends' => $repairTrends,
        ];
    }
    public function vehicles() { return Vehicle::with('driver')->get(); }
    public function jobCards() { return JobCard::with(['vehicle', 'assignedUser'])->get(); }
    public function parts() { return PartsRequest::with(['jobCard', 'requestedBy'])->get(); }
}
