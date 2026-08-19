<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScanAttempt extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'scan_session_id',
        'image_path',
        'ocr_raw_text',
        'plate_number',
        'confidence',
        'status',
    ];

    public function scanSession()
    {
        return $this->belongsTo(ScanSession::class);
    }
}
