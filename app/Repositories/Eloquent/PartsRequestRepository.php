<?php

namespace App\Repositories\Eloquent;

use App\Models\PartsRequest;
use App\Repositories\Contracts\PartsRequestRepositoryInterface;

class PartsRequestRepository extends BaseRepository implements PartsRequestRepositoryInterface
{
    public function __construct(PartsRequest $model)
    {
        parent::__construct($model);
    }
}
