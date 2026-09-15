<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class JobCardInspection extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'job_card_id',
        'item_key',
        'item_label',
        'category',
        'result',
        'notes',
        'point_name',
        'item_name',
        'status',
    ];

    public function setPointNameAttribute($value): void
    {
        $this->setItemKeyAttribute($value);
    }

    public function getPointNameAttribute(): ?string
    {
        return $this->attributes['item_key'] ?? null;
    }

    public function setItemNameAttribute($value): void
    {
        $this->setItemKeyAttribute($value);
    }

    public function getItemNameAttribute(): ?string
    {
        return $this->attributes['item_key'] ?? null;
    }

    public function setItemKeyAttribute($value): void
    {
        $this->attributes['item_key'] = $value;
        if (empty($this->attributes['item_label'])) {
            $this->attributes['item_label'] = ucwords(str_replace(['_', '-'], ' ', (string)$value));
        }
    }

    public function setStatusAttribute($value): void
    {
        $map = [
            'pass' => 'Pass',
            'fail' => 'Fail',
            'na' => 'N/A',
            'n/a' => 'N/A',
            'warning' => 'Fail',
        ];
        $this->attributes['result'] = $map[strtolower((string)$value)] ?? 'N/A';
    }

    public function getStatusAttribute(): string
    {
        return strtolower($this->attributes['result'] ?? 'N/A');
    }

    public function jobCard()
    {
        return $this->belongsTo(JobCard::class);
    }
}
