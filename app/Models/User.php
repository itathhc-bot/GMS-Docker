<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles, HasUuids, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'password',
        'is_active',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
    ];

    public function profile()
    {
        return $this->hasOne(Profile::class);
    }

    public function jobCards()
    {
        return $this->hasMany(JobCard::class, 'assigned_to');
    }

    public function partsRequests()
    {
        return $this->hasMany(PartsRequest::class, 'requested_by');
    }

    public function qcReviews()
    {
        return $this->hasMany(QcReview::class, 'inspector_id');
    }

    public function scanSessions()
    {
        return $this->hasMany(ScanSession::class, 'created_by');
    }

    public function isActive()
    {
        return !$this->profile?->is_deactivated;
    }
}
