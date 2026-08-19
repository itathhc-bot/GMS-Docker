<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'part_number',
        'name',
        'description',
        'quantity',
        'minimum_quantity',
        'location',
        'unit_price',
    ];

    public function scopeLowStock(Builder $query)
    {
        return $query->whereColumn('quantity', '<=', 'minimum_quantity');
    }
}
