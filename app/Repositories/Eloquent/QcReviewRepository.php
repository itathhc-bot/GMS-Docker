<?php

namespace App\Repositories\Eloquent;

use App\Models\QcReview;
use App\Repositories\Contracts\QcReviewRepositoryInterface;

class QcReviewRepository extends BaseRepository implements QcReviewRepositoryInterface
{
    public function __construct(QcReview $model)
    {
        parent::__construct($model);
    }
}
