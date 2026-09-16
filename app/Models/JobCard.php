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
        'priority',
        'bay_number',
        'sla_hours',
        'description',
        'sla_deadline',
        'started_at',
        'completed_at',
        'mechanic_signature',
        'mechanic_signed_at',
        'mechanic_signed_by',
        'mechanic_signed_name',
        'supervisor_signature',
        'supervisor_signed_at',
        'supervisor_signed_by',
        'supervisor_signed_name',
        'reported_issue',
        'assigned_mechanic_id',
    ];

    protected $casts = [
        'sla_deadline' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'mechanic_signed_at' => 'datetime',
        'supervisor_signed_at' => 'datetime',
        'sla_hours' => 'decimal:2',
    ];

    public function setStatusAttribute($value): void
    {
        $map = [
            'open' => 'Open',
            'in_progress' => 'In Progress',
            'in progress' => 'In Progress',
            'in-progress' => 'In Progress',
            'pending_parts' => 'Pending Parts',
            'pending parts' => 'Pending Parts',
            'pending-parts' => 'Pending Parts',
            'waiting_parts' => 'Pending Parts',
            'waiting parts' => 'Pending Parts',
            'qc_review' => 'QC Review',
            'qc review' => 'QC Review',
            'qc-review' => 'QC Review',
            'completed' => 'Completed',
            'delayed' => 'Delayed',
            'closed' => 'Completed',
        ];
        $lower = strtolower(trim((string)$value));
        $this->attributes['status'] = $map[$lower] ?? ($value ?: 'Open');
    }

    public function setPriorityAttribute($value): void
    {
        $val = strtoupper(trim((string)$value));
        $map = [
            'CRITICAL' => 'EMERGENCY',
            'URGENT' => 'HIGH',
        ];
        $val = $map[$val] ?? $val;
        $allowed = ['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'];
        $this->attributes['priority'] = in_array($val, $allowed) ? $val : 'MEDIUM';
    }

    public function setAssignedToAttribute($value): void
    {
        $val = trim((string)$value);
        $this->attributes['assigned_to'] = $val !== '' ? $val : null;
    }

    public function setVehicleIdAttribute($value): void
    {
        $val = trim((string)$value);
        $this->attributes['vehicle_id'] = $val !== '' ? $val : null;
    }

    public function setBayNumberAttribute($value): void
    {
        $val = trim((string)$value);
        $this->attributes['bay_number'] = $val !== '' ? $val : null;
    }

    public function setReportedIssueAttribute($value): void
    {
        $this->attributes['description'] = $value;
    }

    public function getReportedIssueAttribute(): ?string
    {
        return $this->attributes['description'] ?? null;
    }

    public function setAssignedMechanicIdAttribute($value): void
    {
        $val = trim((string)$value);
        $this->attributes['assigned_to'] = $val !== '' ? $val : null;
    }

    public function getAssignedMechanicIdAttribute(): ?string
    {
        return $this->attributes['assigned_to'] ?? null;
    }

    public function vehicle()
    {
        return $this->belongsTo(Vehicle::class);
    }

    public function vehicles()
    {
        return $this->belongsTo(Vehicle::class, 'vehicle_id');
    }

    public function assignedUser()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function assignedMechanic()
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
