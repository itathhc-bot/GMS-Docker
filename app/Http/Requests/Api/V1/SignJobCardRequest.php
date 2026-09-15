<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class SignJobCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('signature_data') && !$this->has('signature')) {
            $this->merge(['signature' => $this->input('signature_data')]);
        }
    }

    public function rules(): array
    {
        return ['signature' => 'required|string'];
    }
}
