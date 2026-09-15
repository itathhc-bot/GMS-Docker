<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QcChecklistItem extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'qc_review_id',
        'item_name',
        'category',
        'result',
        'notes',
        'photo_url',
        'checked_at',
        // Legacy alias:
        'is_passed',
    ];

    protected $casts = [
        'checked_at' => 'datetime',
    ];

    public function qcReview()
    {
        return $this->belongsTo(QcReview::class);
    }

    // Mutator for legacy is_passed
    public function setIsPassedAttribute($value)
    {
        if ($value === true || $value === 1 || $value === '1') {
            $this->attributes['result'] = 'Pass';
        } elseif ($value === false || $value === 0 || $value === '0') {
            $this->attributes['result'] = 'Fail';
        }
    }

    public function getIsPassedAttribute(): ?bool
    {
        if ($this->result === 'Pass') return true;
        if ($this->result === 'Fail') return false;
        return null;
    }
}

