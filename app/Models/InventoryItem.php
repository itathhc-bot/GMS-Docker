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
        'sku',
        'part_name',
        'category',
        'location',
        'stock_quantity',
        'min_threshold',
        'unit_price',
        'status',
        // aliases
        'part_number',
        'name',
        'quantity',
        'minimum_quantity',
    ];

    protected $casts = [
        'stock_quantity' => 'integer',
        'min_threshold'  => 'integer',
        'unit_price'     => 'decimal:2',
    ];

    public function setStatusAttribute($value): void
    {
        $map = [
            'ok'           => 'In Stock',
            'in stock'     => 'In Stock',
            'in_stock'     => 'In Stock',
            'low'          => 'Low Stock',
            'low stock'    => 'Low Stock',
            'low_stock'    => 'Low Stock',
            'critical'     => 'Out of Stock',
            'out of stock' => 'Out of Stock',
            'out_of_stock' => 'Out of Stock',
        ];
        $this->attributes['status'] = $map[strtolower(trim((string)$value))] ?? 'In Stock';
    }

    public function setPartNumberAttribute($value): void
    {
        $this->attributes['sku'] = $value;
    }

    public function getPartNumberAttribute(): ?string
    {
        return $this->attributes['sku'] ?? null;
    }

    public function setNameAttribute($value): void
    {
        $this->attributes['part_name'] = $value;
    }

    public function getNameAttribute(): ?string
    {
        return $this->attributes['part_name'] ?? null;
    }

    public function setQuantityAttribute($value): void
    {
        $this->attributes['stock_quantity'] = (int)$value;
    }

    public function getQuantityAttribute(): int
    {
        return (int)($this->attributes['stock_quantity'] ?? 0);
    }

    public function setMinimumQuantityAttribute($value): void
    {
        $this->attributes['min_threshold'] = (int)$value;
    }

    public function getMinimumQuantityAttribute(): int
    {
        return (int)($this->attributes['min_threshold'] ?? 5);
    }

    public function scopeLowStock(Builder $query)
    {
        return $query->whereColumn('stock_quantity', '<=', 'min_threshold');
    }
}
