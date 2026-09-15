<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class UpdateJobCardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Add policy checks here if needed
    }

    protected function prepareForValidation(): void
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
        if ($this->has('vehicle_id') && empty($this->input('vehicle_id'))) {
            $this->merge(['vehicle_id' => null]);
        }
    }

    public function rules(): array
    {
        return [
            'vehicle_id'           => 'sometimes|nullable|uuid|exists:vehicles,id',
            'assigned_to'          => 'sometimes|nullable|uuid|exists:users,id',
            'assigned_mechanic_id' => 'sometimes|nullable|uuid|exists:users,id',
            'status'               => 'sometimes|nullable|string',
            'priority'             => 'sometimes|nullable|string',
            'bay_number'           => 'sometimes|nullable|string',
            'sla_hours'            => 'sometimes|nullable|numeric',
            'description'          => 'sometimes|nullable|string',
            'reported_issue'       => 'sometimes|nullable|string',
            'started_at'           => 'sometimes|nullable|date',
            'completed_at'         => 'sometimes|nullable|date',
            'mechanic_signature'   => 'sometimes|nullable|string',
            'supervisor_signature' => 'sometimes|nullable|string',
            'job_number'           => 'sometimes|nullable|string',
        ];
    }
}
