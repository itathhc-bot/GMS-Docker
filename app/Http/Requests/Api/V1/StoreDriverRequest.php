<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreDriverRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Add policy checks here if needed
    }

    public function rules(): array
    {
        return [
            'full_name'       => 'required|string|max:255',
            'license_number'  => 'nullable|string|max:255',
            'license_expiry'  => 'nullable|date',
            'phone'           => 'nullable|string|max:50',
            'email'           => 'nullable|email|max:255',
            'department'      => 'nullable|string|max:255',
            'notes'           => 'nullable|string',
            'is_active'       => 'nullable|boolean',
        ];
    }
}
