<?php
namespace App\Services;
use App\Models\JobCard;
use App\Models\Vehicle;
use App\Models\PartsRequest;

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
