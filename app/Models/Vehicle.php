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
        'driver_id',
        'plate_number',
        'make',
        'model',
        'year',
        'vin',
        'color',
    ];

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function jobCards()
    {
        return $this->hasMany(JobCard::class);
    }
}
