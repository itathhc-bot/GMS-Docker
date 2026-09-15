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
            $val = $this->input('assigned_mechanic_id');
            $this->merge(['assigned_to' => (!empty($val) ? $val : null)]);
        }
        if ($this->has('assigned_to') && empty($this->input('assigned_to'))) {
            $this->merge(['assigned_to' => null]);
        }
        if ($this->has('bay_number') && empty($this->input('bay_number'))) {
            $this->merge(['bay_number' => null]);
        }
    }

    public function rules(): array
    {
        return [
            'vehicle_id'           => 'required|uuid',
            'description'          => 'required|string',
            'reported_issue'       => 'nullable|string',
            'assigned_to'          => 'nullable|uuid',
            'assigned_mechanic_id' => 'nullable|uuid',
            'priority'             => 'nullable|string',
            'bay_number'           => 'nullable|string',
            'sla_hours'            => 'nullable|numeric',
            'status'               => 'nullable|string',
            'job_number'           => 'nullable|string',
            'started_at'           => 'nullable|date',
            'completed_at'         => 'nullable|date',
        ];
    }
}
