<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Add policy checks here if needed
    }

    public function rules(): array
    {
        return [
            'full_name'          => 'sometimes|string|max:255',
            'email'              => 'sometimes|email|max:255',
            'employee_id'        => 'sometimes|nullable|string|max:255',
            'department'         => 'sometimes|nullable|string|max:255',
            'role'               => 'sometimes|string',
            'extra_system_roles' => 'sometimes|array',
            'custom_role_ids'    => 'sometimes|array',
        ];
    }
}
