<?php

namespace App\Repositories\Eloquent;

use App\Models\Vehicle;
use App\Repositories\Contracts\VehicleRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;

class VehicleRepository extends BaseRepository implements VehicleRepositoryInterface
{
    public function __construct(Vehicle $model)
    {
        parent::__construct($model);
    }

    protected function applyFilters(Builder $query, array $filters)
    {
        $query->with('driver');

        if (!empty($filters['plate_number'])) {
            $plate = strtoupper(trim((string)$filters['plate_number']));
            $query->where('plate_number', $plate);
        }

        if (!empty($filters['status'])) {
            $status = (string)$filters['status'];
            $query->where('status', $status);
        }

        if (!empty($filters['department'])) {
            $query->where('department', (string)$filters['department']);
        }

        if (!empty($filters['search'])) {
            $search = trim((string)$filters['search']);
            $query->where(function (Builder $q) use ($search) {
                $q->where('plate_number', 'like', "%{$search}%")
                  ->orWhere('vin', 'like', "%{$search}%")
                  ->orWhere('make', 'like', "%{$search}%")
                  ->orWhere('model', 'like', "%{$search}%")
                  ->orWhere('asset_id', 'like', "%{$search}%")
                  ->orWhere('department', 'like', "%{$search}%");
            });
        }

        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDir = strtolower($filters['sort_dir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        if (in_array($sortBy, ['created_at', 'plate_number', 'make', 'model', 'year', 'mileage', 'status', 'department'])) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->latest();
        }
    }
}
