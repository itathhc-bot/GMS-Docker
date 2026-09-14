<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'log_type',
        'actor_user_id',
        'actor_name',
        'target_user_id',
        'target_name',
        'action',
        'entity_type',
        'entity_id',
        'entity_ref',
        'stage',
        'reason',
        'details',
        'actor_id', // for mutator compatibility
    ];

    protected $casts = [
        'details' => 'array',
    ];

    public function setActorIdAttribute($value): void
    {
        $this->attributes['actor_user_id'] = $value;
    }

    public function getActorIdAttribute(): ?string
    {
        return $this->attributes['actor_user_id'] ?? null;
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    public function target()
    {
        return $this->belongsTo(User::class, 'target_user_id');
    }
}
