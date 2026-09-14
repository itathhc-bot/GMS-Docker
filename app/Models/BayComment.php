<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BayComment extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'job_card_id',
        'author_user_id',
        'author_name',
        'bay_number',
        'comment',
    ];

    public function author()
    {
        return $this->belongsTo(User::class, 'author_user_id');
    }

    public function jobCard()
    {
        return $this->belongsTo(JobCard::class);
    }
}
