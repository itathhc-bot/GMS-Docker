<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $supplier = $this->supplier;
        $items = $this->items;
        $user = $this->requestedByUser;

        return array_merge(parent::toArray($request), [
            'supplier' => $supplier,
            'suppliers' => $supplier ? [
                'id' => $supplier->id,
                'name' => $supplier->name,
                'email' => $supplier->email,
                'phone' => $supplier->phone,
                'address' => $supplier->address,
            ] : null,
            'items' => $items,
            'requested_by_user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'full_name' => $user->profile?->full_name ?? $user->name,
            ] : null,
            'requested_by_name' => $this->requested_by_name ?? $user?->profile?->full_name ?? $user?->name,
        ]);
    }
}

