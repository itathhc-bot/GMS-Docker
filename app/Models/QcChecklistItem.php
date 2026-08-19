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
        'is_passed',
        'notes',
    ];

    protected $casts = [
        'is_passed' => 'boolean',
    ];

    public function qcReview()
    {
        return $this->belongsTo(QcReview::class);
    }
}
