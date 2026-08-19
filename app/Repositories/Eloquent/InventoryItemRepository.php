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
}
