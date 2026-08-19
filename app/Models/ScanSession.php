<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScanSession extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'pair_code',
        'created_by',
        'expires_at',
        'status',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function attempts()
    {
        return $this->hasMany(ScanAttempt::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeActive(Builder $query)
    {
        return $query->where('status', 'active')
                     ->where('expires_at', '>', now());
    }

    public function scopeExpired(Builder $query)
    {
        return $query->where('expires_at', '<=', now())
                     ->orWhere('status', 'expired');
    }
}
