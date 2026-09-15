<?php

namespace App\Repositories\Eloquent;

use App\Models\InventoryItem;
use App\Repositories\Contracts\InventoryItemRepositoryInterface;

class InventoryItemRepository extends BaseRepository implements InventoryItemRepositoryInterface
{
    public function __construct(InventoryItem $model)
    {
        parent::__construct($model);
    }

    protected function applyFilters(\Illuminate\Database\Eloquent\Builder $query, array $filters)
    {
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('sku', 'like', "%{$search}%")
                  ->orWhere('part_name', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%")
                  ->orWhere('location', 'like', "%{$search}%");
            });
        }
        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $query->where('category', $filters['category']);
        }
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $query->where('status', $filters['status']);
        }
        $query->latest();
    }
}
