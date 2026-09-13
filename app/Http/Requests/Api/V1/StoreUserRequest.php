<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Add policy checks here if needed
    }

    public function rules(): array
    {
        return [
            'email' => 'required|email|unique:users',
            'password' => 'required|min:6',
            'full_name' => 'required|string|max:255',
            'employee_id' => 'nullable|string|max:255',
            'department' => 'nullable|string|max:255',
            'role' => 'required|string',
            'extra_system_roles' => 'nullable|array',
            'custom_role_ids' => 'nullable|array',
        ];
    }
}
