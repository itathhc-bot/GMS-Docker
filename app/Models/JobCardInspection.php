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
        'point_name',
        'status',
        'notes',
    ];

    public function jobCard()
    {
        return $this->belongsTo(JobCard::class);
    }
}
