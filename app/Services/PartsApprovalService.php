<?php

namespace App\Services;

use App\Models\PartsRequest;
use App\Models\InventoryItem;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PartsApprovalService
{
    public function approve(string $id, string $actorId)
    {
        $request = PartsRequest::findOrFail($id);
        $request->update([
            'status' => 'approved',
            'approved_by' => $actorId,
        ]);

        $this->logAudit($actorId, 'approve', 'PartsRequest', $request->id, []);
        return $request;
    }

    public function reject(string $id, string $reason, string $actorId)
    {
        $request = PartsRequest::findOrFail($id);
        $request->update([
            'status' => 'rejected',
            'notes' => $reason,
        ]);

        $this->logAudit($actorId, 'reject', 'PartsRequest', $request->id, ['reason' => $reason]);
        return $request;
    }

    public function issue(string $id, array $data, string $actorId)
    {
        return DB::transaction(function () use ($id, $data, $actorId) {
            $request = PartsRequest::findOrFail($id);
            
            // Assuming $data contains part_number and quantity issued
            // If the model was richer, we would iterate through request items. 
            // In the provided schema, parts request doesn't have explicit items described, so we assume generic decrement if needed or it's handled via related InventoryItem.
            
            $request->update([
                'status' => 'issued',
                'issued_by' => $actorId,
            ]);

            $this->logAudit($actorId, 'issue', 'PartsRequest', $request->id, $data);
            return $request;
        });
    }

    protected function logAudit(string $actorId, string $action, string $type, string $entityId, array $details)
    {
        try {
            $actor = User::find($actorId);
            AuditLog::create([
                'log_type'      => 'approval',
                'actor_user_id' => $actorId,
                'actor_name'    => $actor?->name,
                'action'        => $action,
                'entity_type'   => $type,
                'entity_id'     => $entityId,
                'details'       => $details,
            ]);
        } catch (\Throwable $e) {
            Log::warning("Failed to write audit log in PartsApprovalService: " . $e->getMessage());
        }
    }
}
