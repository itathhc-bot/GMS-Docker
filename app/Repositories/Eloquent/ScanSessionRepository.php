<?php

namespace App\Repositories\Eloquent;

use App\Models\ScanSession;
use App\Repositories\Contracts\ScanSessionRepositoryInterface;

class ScanSessionRepository extends BaseRepository implements ScanSessionRepositoryInterface
{
    public function __construct(ScanSession $model)
    {
        parent::__construct($model);
    }
}
