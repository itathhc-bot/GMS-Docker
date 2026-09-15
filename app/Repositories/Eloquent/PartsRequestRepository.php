<?php

namespace App\Repositories\Eloquent;

use App\Models\PartsRequest;
use App\Repositories\Contracts\PartsRequestRepositoryInterface;
use Illuminate\Database\Eloquent\Builder;

class PartsRequestRepository extends BaseRepository implements PartsRequestRepositoryInterface
{
    public function __construct(PartsRequest $model)
    {
        parent::__construct($model);
    }

    protected function applyFilters(Builder $query, array $filters)
    {
        $query->with(['jobCard.vehicle', 'requestedBy.profile', 'approvedBy', 'issuedBy']);

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['job_card_id'])) {
            $query->where('job_card_id', $filters['job_card_id']);
        }

        if (!empty($filters['urgency'])) {
            $query->where('urgency', $filters['urgency']);
        }

        if (!empty($filters['requested_by'])) {
            $query->where('requested_by', $filters['requested_by']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('request_number', 'like', "%{$search}%")
                  ->orWhere('part_name', 'like', "%{$search}%")
                  ->orWhere('part_number', 'like', "%{$search}%");
            });
        }

        $query->latest();
    }
}

