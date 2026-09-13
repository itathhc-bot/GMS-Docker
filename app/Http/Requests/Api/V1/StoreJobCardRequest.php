<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreJobCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation()
    {
        if ($this->has('reported_issue')) {
            $this->merge(['description' => $this->input('reported_issue')]);
        }
        if ($this->has('assigned_mechanic_id')) {
            $this->merge(['assigned_to' => $this->input('assigned_mechanic_id')]);
        }
    }

    public function rules(): array
    {
        return [
            'vehicle_id' => 'required|uuid',
            'description' => 'required|string',
            'assigned_to' => 'nullable|uuid',
            'priority' => 'nullable|string',
            'bay_number' => 'nullable|string',
            'sla_hours' => 'nullable|numeric',
            'status' => 'nullable|string',
            'job_number' => 'nullable|string',
        ];
    }
}
