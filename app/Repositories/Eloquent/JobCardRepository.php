<?php

namespace App\Repositories\Eloquent;

use App\Models\JobCard;
use App\Repositories\Contracts\JobCardRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;

class JobCardRepository extends BaseRepository implements JobCardRepositoryInterface
{
    public function __construct(JobCard $model)
    {
        parent::__construct($model);
    }

    protected function applyFilters(Builder $query, array $filters)
    {
        $query->with(['vehicle', 'assignedUser.profile', 'inspections']);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['status_not_in'])) {
            $statuses = is_array($filters['status_not_in'])
                ? $filters['status_not_in']
                : explode(',', $filters['status_not_in']);
            $query->whereNotIn('status', $statuses);
        }

        if (!empty($filters['priority'])) {
            $query->where('priority', $filters['priority']);
        }

        if (!empty($filters['vehicle_id'])) {
            $query->where('vehicle_id', $filters['vehicle_id']);
        }

        if (!empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('job_number', 'like', "%{$search}%")
                  ->orWhereHas('vehicle', function ($vq) use ($search) {
                      $vq->where('plate_number', 'like', "%{$search}%")
                         ->orWhere('make', 'like', "%{$search}%")
                         ->orWhere('model', 'like', "%{$search}%");
                  });
            });
        }

        $query->latest();
    }
}

