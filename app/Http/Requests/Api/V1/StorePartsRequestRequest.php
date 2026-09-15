<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StorePartsRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Add policy checks here if needed
    }

    protected function prepareForValidation()
    {
        if ($this->has('description') && !$this->has('reason')) {
            $this->merge(['reason' => $this->input('description')]);
        }
        if ($this->has('urgency')) {
            $this->merge(['urgency' => ucfirst(strtolower((string)$this->input('urgency')))]);
        }
        if ($this->has('status')) {
            $this->merge(['status' => ucfirst(strtolower((string)$this->input('status')))]);
        }
    }

    public function rules(): array
    {
        return [
            'job_card_id'     => 'nullable|uuid',
            'part_name'       => 'required|string|max:255',
            'part_number'     => 'nullable|string|max:255',
            'quantity'        => 'nullable|integer|min:1',
            'urgency'         => 'nullable|string|in:Normal,Urgent,Emergency',
            'status'          => 'nullable|string|in:Pending,Approved,Rejected,Issued',
            'reason'          => 'nullable|string',
            'description'     => 'nullable|string',
            'bay_number'      => 'nullable|string|max:50',
            'request_number'  => 'nullable|string|max:50',
            'requested_by'    => 'nullable|uuid',
        ];
    }
}
