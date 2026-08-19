<?php

namespace App\Services;

use App\Models\JobCard;
use App\Models\PartsRequest;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ExportService
{
    public function exportPartsRequestsToCsv(array $filters): string
    {
        $query = PartsRequest::with(['requestedBy', 'jobCard']);
        
        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }

        $filename = 'exports/parts_requests_' . now()->format('Ymd_His') . '_' . Str::random(5) . '.csv';
        $path = storage_path('app/' . $filename);
        
        Storage::makeDirectory('exports');
        
        $file = fopen($path, 'w');
        fputcsv($file, [
            'Request #', 'Part Name', 'Part Number', 'Quantity', 'Urgency', 
            'Status', 'Requested By', 'Job Card', 'Bay', 'Created At'
        ]);

        $query->chunk(100, function ($requests) use ($file) {
            foreach ($requests as $request) {
                fputcsv($file, [
                    $request->request_number,
                    $request->part_name,
                    $request->part_number,
                    $request->quantity,
                    $request->urgency,
                    $request->status,
                    $request->requestedBy?->name ?? 'N/A',
                    $request->jobCard?->job_number ?? 'N/A',
                    $request->jobCard?->bay_number ?? 'N/A',
                    $request->created_at->format('Y-m-d H:i:s'),
                ]);
            }
        });

        fclose($file);

        return $filename;
    }

    public function exportJobCardsToCsv(array $filters): string
    {
        $query = JobCard::with(['assignedMechanic']);
        
        if (!empty($filters['date_from'])) {
            $query->whereDate('created_at', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate('created_at', '<=', $filters['date_to']);
        }
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (!empty($filters['mechanic_id'])) {
            $query->where('assigned_to', $filters['mechanic_id']);
        }

        $filename = 'exports/job_cards_' . now()->format('Ymd_His') . '_' . Str::random(5) . '.csv';
        $path = storage_path('app/' . $filename);
        
        Storage::makeDirectory('exports');

        $file = fopen($path, 'w');
        fputcsv($file, [
            'Job #', 'Vehicle Plate', 'Status', 'Priority', 'Assigned To', 
            'Bay', 'Started At', 'Completed At', 'SLA Hours', 'Created At'
        ]);

        $query->chunk(100, function ($jobs) use ($file) {
            foreach ($jobs as $job) {
                fputcsv($file, [
                    $job->job_number,
                    $job->vehicle_id, // Assuming this maps to plate in real scenario
                    $job->status,
                    $job->priority,
                    $job->assignedMechanic?->name ?? 'Unassigned',
                    $job->bay_number,
                    $job->started_at?->format('Y-m-d H:i:s') ?? 'N/A',
                    $job->completed_at?->format('Y-m-d H:i:s') ?? 'N/A',
                    $job->sla_hours ?? 'N/A',
                    $job->created_at->format('Y-m-d H:i:s'),
                ]);
            }
        });

        fclose($file);

        return $filename;
    }

    public function cleanupOldExports(): void
    {
        $days = config('garage.reports.export_retention_days', 7);
        $files = Storage::files('exports');
        
        $threshold = now()->subDays($days)->getTimestamp();
        
        foreach ($files as $file) {
            if (Storage::lastModified($file) < $threshold) {
                Storage::delete($file);
            }
        }
    }
}
