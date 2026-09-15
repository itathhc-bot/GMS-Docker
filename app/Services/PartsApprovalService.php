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
    public function approve(string $id, string $actorId, ?string $remarks = null)
    {
        $request = PartsRequest::findOrFail($id);
        $updateData = [
            'status'      => 'Approved',
            'approved_by' => $actorId,
        ];
        if ($remarks !== null) {
            $updateData['supervisor_remarks'] = $remarks;
        }

        $request->update($updateData);

        $this->logAudit($actorId, 'approve', 'PartsRequest', $request->id, ['supervisor_remarks' => $remarks]);
        return $request;
    }

    public function reject(string $id, string $reason, string $actorId)
    {
        $request = PartsRequest::findOrFail($id);
        $request->update([
            'status'         => 'Rejected',
            'rejection_note' => $reason,
        ]);

        $this->logAudit($actorId, 'reject', 'PartsRequest', $request->id, ['reason' => $reason]);
        return $request;
    }

    public function issue(string $id, array $data, string $actorId)
    {
        return DB::transaction(function () use ($id, $data, $actorId) {
            $request = PartsRequest::findOrFail($id);
            
            $updateData = [
                'status'            => 'Issued',
                'issued_by'         => $actorId,
                'issued_at'         => now(),
                'collected_by_name' => $data['collected_by_name'] ?? $request->collected_by_name,
                'signature_data'    => $data['signature_data'] ?? $request->signature_data,
                'issuance_notes'    => $data['issuance_notes'] ?? $request->issuance_notes,
            ];

            if (!empty($data['bay_number'])) {
                $updateData['bay_number'] = $data['bay_number'];
            }

            $request->update($updateData);

            // Decrement inventory stock if matching item found
            $sku = $request->part_number;
            $inv = InventoryItem::where(function ($q) use ($sku, $request) {
                if ($sku) {
                    $q->where('sku', $sku)->orWhere('part_name', $request->part_name);
                } else {
                    $q->where('part_name', $request->part_name);
                }
            })->first();

            if ($inv && $inv->stock_quantity >= $request->quantity) {
                $inv->decrement('stock_quantity', (int)$request->quantity);
            }

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
