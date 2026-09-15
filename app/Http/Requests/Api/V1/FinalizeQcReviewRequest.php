<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class FinalizeQcReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => 'nullable|string',
            'signature' => 'nullable|string',
            'signature_data' => 'nullable|string',
            'remarks' => 'nullable|string',
            'notes' => 'nullable|string',
            'reviewed_at' => 'nullable',
        ];
    }
}

