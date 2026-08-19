<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class QcReview extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'job_card_id',
        'inspector_id',
        'status',
        'inspector_signature',
        'notes',
    ];

    public function jobCard()
    {
        return $this->belongsTo(JobCard::class);
    }

    public function inspector()
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    public function checklistItems()
    {
        return $this->hasMany(QcChecklistItem::class);
    }
}
