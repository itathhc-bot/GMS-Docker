<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateDriverRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Add policy checks here if needed
    }

    public function rules(): array
    {
        return [
            'full_name'       => 'sometimes|string|max:255',
            'license_number'  => 'sometimes|nullable|string|max:255',
            'license_expiry'  => 'sometimes|nullable|date',
            'phone'           => 'sometimes|nullable|string|max:50',
            'email'           => 'sometimes|nullable|email|max:255',
            'department'      => 'sometimes|nullable|string|max:255',
            'notes'           => 'sometimes|nullable|string',
            'is_active'       => 'sometimes|boolean',
        ];
    }
}
