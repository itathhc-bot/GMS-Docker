<?php

namespace App\Services;

use App\Models\JobCard;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Str;

class JobCardService
{
    public function createJobCard(array $data, string $actorId)
    {
        if (empty($data['job_number'])) {
            $data['job_number'] = $this->generateJobNumber();
        }

        $rawStatus = strtolower($data['status'] ?? 'Open');
        $statusMap = [
            'open' => 'Open',
            'in_progress' => 'In Progress',
            'pending_parts' => 'Pending Parts',
            'qc_review' => 'QC Review',
            'completed' => 'Completed',
            'delayed' => 'Delayed',
        ];
        $data['status'] = $statusMap[$rawStatus] ?? 'Open';

        if (isset($data['priority'])) {
            $data['priority'] = strtoupper($data['priority']);
        }
        
        $jobCard = JobCard::create($data);
        $this->logAudit($actorId, 'create', 'JobCard', $jobCard->id, ['job_number' => $data['job_number']]);

        return $jobCard;
    }

    public function updateStatus(string $id, string $status, string $actorId)
    {
        $jobCard = JobCard::findOrFail($id);
        $jobCard->update(['status' => $status]);

        if ($status === 'completed') {
            $jobCard->update(['completed_at' => now()]);
        }

        $this->logAudit($actorId, 'update_status', 'JobCard', $jobCard->id, ['status' => $status]);
        return $jobCard;
    }

    public function assign(string $id, string $userId, string $actorId)
    {
        $jobCard = JobCard::findOrFail($id);
        $jobCard->update(['assigned_to' => $userId]);
        $this->logAudit($actorId, 'assign', 'JobCard', $jobCard->id, ['assigned_to' => $userId]);
        return $jobCard;
    }

    public function signMechanic(string $id, string $signatureData, string $userId)
    {
        $jobCard = JobCard::findOrFail($id);
        $jobCard->update(['mechanic_signature' => $signatureData]);
        $this->logAudit($userId, 'sign_mechanic', 'JobCard', $jobCard->id, []);
        return $jobCard;
    }

    public function signSupervisor(string $id, string $signatureData, string $userId)
    {
        $jobCard = JobCard::findOrFail($id);
        $jobCard->update(['supervisor_signature' => $signatureData]);
        $this->logAudit($userId, 'sign_supervisor', 'JobCard', $jobCard->id, []);
        return $jobCard;
    }

    public function getSlaStatus(JobCard $jobCard)
    {
        if ($jobCard->status === 'completed') {
            return 'ok';
        }

        if (!$jobCard->sla_deadline) {
            return 'ok';
        }

        $now = now();
        if ($now->greaterThan($jobCard->sla_deadline)) {
            return 'breached';
        }

        if ($now->diffInHours($jobCard->sla_deadline) <= 12) {
            return 'warning';
        }

        return 'ok';
    }

    protected function generateJobNumber(): string
    {
        $prefix = config('garage.job_number_prefix', 'JC');
        $date = now()->format('Ymd');
        $random = strtoupper(Str::random(4));
        return "{$prefix}-{$date}-{$random}";
    }

    protected function logAudit(string $actorId, string $action, string $type, string $entityId, array $details)
    {
        try {
            $actor = User::find($actorId);
            AuditLog::create([
                'log_type'      => 'admin',
                'actor_user_id' => $actorId,
                'actor_name'    => $actor?->name,
                'action'        => $action,
                'entity_type'   => $type,
                'entity_id'     => $entityId,
                'details'       => $details,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning("Failed to write audit log in JobCardService: " . $e->getMessage());
        }
    }
}
