<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class PurchaseOrderService
{
    public function create(array $data, string $actorId)
    {
        $actor = User::with('profile')->find($actorId);

        $data['po_number'] = $this->generatePoNumber();
        $data['status'] = $data['status'] ?? 'pending_manager';
        $data['requested_by'] = $actorId;
        $data['requested_by_name'] = $actor?->profile?->full_name ?? $actor?->name;

        $items = $data['items'] ?? [];
        unset($data['items']);

        $po = PurchaseOrder::create($data);

        if (!empty($items)) {
            $formattedItems = array_map(function ($item) use ($po) {
                return [
                    'id' => (string) Str::uuid(),
                    'purchase_order_id' => $po->id,
                    'part_name' => $item['part_name'],
                    'part_number' => $item['part_number'] ?? null,
                    'quantity' => $item['quantity'] ?? 1,
                    'unit_price' => $item['unit_price'] ?? 0,
                    'total' => $item['total'] ?? 0,
                    'notes' => $item['notes'] ?? null,
                ];
            }, $items);

            $po->items()->createMany($formattedItems);
        }

        $this->logAudit($actorId, 'create', 'PurchaseOrder', $po->id, ['po_number' => $data['po_number']]);
        return $po->fresh(['supplier', 'items', 'requestedByUser']);
    }

    public function approveManager(string $id, ?string $notes, string $actorId)
    {
        $po = PurchaseOrder::findOrFail($id);
        $po->update([
            'status' => 'pending_finance',
            'manager_approved_by' => $actorId,
            'manager_approved_at' => now(),
            'manager_notes' => $notes,
        ]);

        $this->logAudit($actorId, 'approve_manager', 'PurchaseOrder', $po->id, ['notes' => $notes]);
        return $po->fresh(['supplier', 'items', 'requestedByUser']);
    }

    public function approveFinance(string $id, ?string $notes, string $actorId)
    {
        $po = PurchaseOrder::findOrFail($id);
        $po->update([
            'status' => 'approved',
            'finance_approved_by' => $actorId,
            'finance_approved_at' => now(),
            'finance_notes' => $notes,
        ]);

        $this->logAudit($actorId, 'approve_finance', 'PurchaseOrder', $po->id, ['notes' => $notes]);
        return $po->fresh(['supplier', 'items', 'requestedByUser']);
    }

    public function reject(string $id, string $reason, string $actorId)
    {
        $po = PurchaseOrder::findOrFail($id);
        $po->update([
            'status' => 'rejected',
            'rejected_reason' => $reason,
        ]);

        $this->logAudit($actorId, 'reject', 'PurchaseOrder', $po->id, ['reason' => $reason]);
        return $po->fresh(['supplier', 'items', 'requestedByUser']);
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
            Log::warning("Failed to write audit log in PurchaseOrderService: " . $e->getMessage());
        }
    }
}
