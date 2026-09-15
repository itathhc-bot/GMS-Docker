<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vehicle extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'plate_number',
        'vin',
        'make',
        'model',
        'year',
        'department',
        'asset_id',
        'mileage',
        'status',
        'driver_id',
    ];

    protected $casts = [
        'year' => 'integer',
        'mileage' => 'integer',
    ];

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function jobCards()
    {
        return $this->hasMany(JobCard::class);
    }

    public function setStatusAttribute($value)
    {
        $map = [
            'active' => 'Available',
            'available' => 'Available',
            'in_service' => 'In Service',
            'in service' => 'In Service',
            'in_repair' => 'In Service',
            'in repair' => 'In Service',
            'awaiting_parts' => 'Awaiting Parts',
            'awaiting parts' => 'Awaiting Parts',
            'out_of_service' => 'Decommissioned',
            'out of service' => 'Decommissioned',
            'decommissioned' => 'Decommissioned',
        ];

        $lower = strtolower(trim((string)$value));
        $this->attributes['status'] = $map[$lower] ?? ($value ?: 'Available');
    }

    public function setVinAttribute($value)
    {
        $val = trim((string)$value);
        $this->attributes['vin'] = $val !== '' ? $val : null;
    }

    public function setDriverIdAttribute($value)
    {
        $val = trim((string)$value);
        $this->attributes['driver_id'] = $val !== '' ? $val : null;
    }

    public function setAssetIdAttribute($value)
    {
        $val = trim((string)$value);
        $this->attributes['asset_id'] = $val !== '' ? $val : null;
    }

    public function setPlateNumberAttribute($value)
    {
        $this->attributes['plate_number'] = strtoupper(trim((string)$value));
    }
}

