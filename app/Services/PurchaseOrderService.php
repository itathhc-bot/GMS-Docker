<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use App\Models\AuditLog;
use Illuminate\Support\Str;

class PurchaseOrderService
{
    public function create(array $data, string $actorId)
    {
        $data['po_number'] = $this->generatePoNumber();
        $data['status'] = 'pending';
        $data['requested_by'] = $actorId;

        $po = PurchaseOrder::create($data);

        if (!empty($data['items'])) {
            $po->items()->createMany($data['items']);
        }

        $this->logAudit($actorId, 'create', 'PurchaseOrder', $po->id, ['po_number' => $data['po_number']]);
        return $po;
    }

    public function approveManager(string $id, string $notes, string $actorId)
    {
        $po = PurchaseOrder::findOrFail($id);
        $po->update([
            'status' => 'manager_approved',
            'manager_notes' => $notes,
        ]);

        $this->logAudit($actorId, 'approve_manager', 'PurchaseOrder', $po->id, ['notes' => $notes]);
        return $po;
    }

    public function approveFinance(string $id, string $notes, string $actorId)
    {
        $po = PurchaseOrder::findOrFail($id);
        $po->update([
            'status' => 'finance_approved',
            'finance_notes' => $notes,
        ]);

        $this->logAudit($actorId, 'approve_finance', 'PurchaseOrder', $po->id, ['notes' => $notes]);
        return $po;
    }

    public function reject(string $id, string $reason, string $actorId)
    {
        $po = PurchaseOrder::findOrFail($id);
        $po->update([
            'status' => 'rejected',
            'manager_notes' => $reason, // using manager_notes for simplicity as general rejection reason
        ]);

        $this->logAudit($actorId, 'reject', 'PurchaseOrder', $po->id, ['reason' => $reason]);
        return $po;
    }

    protected function generatePoNumber(): string
    {
        $prefix = config('garage.po_number_prefix', 'PO');
        $date = now()->format('Ym');
        $random = strtoupper(Str::random(4));
        return "{$prefix}-{$date}-{$random}";
    }

    protected function logAudit(string $actorId, string $action, string $type, string $entityId, array $details)
    {
        AuditLog::create([
            'actor_id' => $actorId,
            'action' => $action,
            'entity_type' => $type,
            'entity_id' => $entityId,
            'details' => $details,
        ]);
    }
}
