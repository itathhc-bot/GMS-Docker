<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupervisorNote extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'author_id',
        'note',
        'priority',
    ];

    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }
}
