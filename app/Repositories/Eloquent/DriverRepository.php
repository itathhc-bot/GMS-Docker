<?php

namespace App\Repositories\Eloquent;

use App\Models\Driver;
use App\Repositories\Contracts\DriverRepositoryInterface;

class DriverRepository extends BaseRepository implements DriverRepositoryInterface
{
    public function __construct(Driver $model)
    {
        parent::__construct($model);
    }

    protected function applyFilters(\Illuminate\Database\Eloquent\Builder $query, array $filters): void
    {
        if (isset($filters['is_active'])) {
            $query->where('is_active', filter_var($filters['is_active'], FILTER_VALIDATE_BOOLEAN));
        }

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('full_name', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('license_number', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('department', 'like', '%' . $filters['search'] . '%');
            });
        }

        $sortBy = $filters['sort_by'] ?? 'full_name';
        $allowedSorts = ['full_name', 'license_number', 'department', 'created_at'];
        if (in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $filters['sort_dir'] ?? 'asc');
        }
    }
}
