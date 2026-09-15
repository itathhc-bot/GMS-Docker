<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseOrder extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'po_number',
        'parts_request_id',
        'supplier_id',
        'requested_by',
        'requested_by_name',
        'status',
        'currency',
        'subtotal',
        'tax',
        'total',
        'notes',
        'manager_approved_by',
        'manager_approved_at',
        'manager_notes',
        'finance_approved_by',
        'finance_approved_at',
        'finance_notes',
        'rejected_reason',
        // Legacy alias:
        'total_amount',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'tax' => 'decimal:2',
        'total' => 'decimal:2',
        'manager_approved_at' => 'datetime',
        'finance_approved_at' => 'datetime',
    ];

    public function items()
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function partsRequest()
    {
        return $this->belongsTo(PartsRequest::class);
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    // Alias for frontend plural
    public function suppliers()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function requestedByUser()
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function setTotalAmountAttribute($value)
    {
        $this->attributes['total'] = $value;
    }

    public function getTotalAmountAttribute()
    {
        return $this->attributes['total'] ?? 0;
    }
}

