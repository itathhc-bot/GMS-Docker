<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Profile extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id',
        'full_name',
        'employee_id',
        'department',
        'avatar_url',
        'preferred_language',
        'parts_export_columns',
        'parts_history_location_filter',
        'preview_cache_enabled',
        'preview_cache_ttl_seconds',
        'is_deactivated',
    ];

    protected $casts = [
        'parts_export_columns'  => 'array',
        'preview_cache_enabled' => 'boolean',
        'is_deactivated'        => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
