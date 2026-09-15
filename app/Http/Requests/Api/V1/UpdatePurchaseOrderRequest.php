<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => 'sometimes|uuid|exists:suppliers,id',
            'status' => 'sometimes|string',
            'notes' => 'nullable|string',
            'manager_notes' => 'nullable|string',
            'finance_notes' => 'nullable|string',
            'rejected_reason' => 'nullable|string',
            'currency' => 'nullable|string|max:10',
            'subtotal' => 'nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0',
            'total' => 'nullable|numeric|min:0',
            'items' => 'nullable|array',
        ];
    }
}

