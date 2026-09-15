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
        'remarks',
        'signature_data',
        'reviewed_at',
        // Legacy/alternate aliases:
        'inspector_signature',
        'notes',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
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

    // Accessors/Mutators for backwards compatibility
    public function setInspectorSignatureAttribute($value)
    {
        $this->attributes['signature_data'] = $value;
    }

    public function getInspectorSignatureAttribute()
    {
        return $this->attributes['signature_data'] ?? null;
    }

    public function setNotesAttribute($value)
    {
        $this->attributes['remarks'] = $value;
    }

    public function getNotesAttribute()
    {
        return $this->attributes['remarks'] ?? null;
    }
}

