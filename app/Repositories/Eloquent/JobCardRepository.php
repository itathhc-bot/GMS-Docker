<?php

namespace App\Repositories\Eloquent;

use App\Models\JobCard;
use App\Repositories\Contracts\JobCardRepositoryInterface;

class JobCardRepository extends BaseRepository implements JobCardRepositoryInterface
{
    public function __construct(JobCard $model)
    {
        parent::__construct($model);
    }
}
