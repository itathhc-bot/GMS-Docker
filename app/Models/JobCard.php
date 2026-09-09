<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobCard extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'job_number',
        'vehicle_id',
        'assigned_to',
        'status',
        'description',
        'sla_deadline',
        'mechanic_signature',
        'supervisor_signature',
        'completed_at',
    ];

    protected $casts = [
        'sla_deadline' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function inspections()
    {
        return $this->hasMany(JobCardInspection::class);
    }

    public function partsRequests()
    {
        return $this->hasMany(PartsRequest::class);
    }

    public function qcReview()
    {
        return $this->hasOne(QcReview::class);
    }

    public function bayComments()
    {
        return $this->hasMany(BayComment::class);
    }

    public function scopeActive(Builder $query)
    {
        return $query->whereNotIn('status', ['completed', 'cancelled']);
    }

    public function scopeOverdueSla(Builder $query)
    {
        return $query->where('status', '!=', 'completed')
                     ->whereNotNull('started_at')
                     ->whereRaw('DATE_ADD(started_at, INTERVAL sla_hours HOUR) < NOW()');
    }
}
