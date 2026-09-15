<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreQcReviewRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'job_card_id' => 'required|uuid',
            'status' => 'sometimes|string',
            'remarks' => 'nullable|string',
            'notes' => 'nullable|string',
        ];
    }
}

