<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class AssignJobCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('user_id') && !$this->has('assigned_to')) {
            $this->merge(['assigned_to' => $this->input('user_id')]);
        }
    }

    public function rules(): array
    {
        return ['assigned_to' => 'required|uuid|exists:users,id'];
    }
}
