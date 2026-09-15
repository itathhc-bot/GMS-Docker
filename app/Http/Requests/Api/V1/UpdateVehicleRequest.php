<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('plate_number')) {
            $this->merge(['plate_number' => strtoupper(trim((string)$this->input('plate_number')))]);
        }
        foreach (['vin', 'driver_id', 'asset_id', 'make', 'model', 'department'] as $field) {
            if ($this->has($field)) {
                $val = trim((string)$this->input($field));
                $this->merge([$field => $val !== '' ? $val : null]);
            }
        }
        if ($this->has('year') && empty($this->input('year'))) {
            $this->merge(['year' => null]);
        }
        if ($this->has('mileage') && empty($this->input('mileage'))) {
            $this->merge(['mileage' => 0]);
        }
    }

    public function rules(): array
    {
        $vehicle = $this->route('vehicle');
        $vehicleId = is_object($vehicle) ? $vehicle->id : $vehicle;

        return [
            'plate_number' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('vehicles', 'plate_number')->ignore($vehicleId)],
            'vin'          => ['sometimes', 'nullable', 'string', 'max:100', Rule::unique('vehicles', 'vin')->ignore($vehicleId)],
            'make'         => 'sometimes|nullable|string|max:100',
            'model'        => 'sometimes|nullable|string|max:100',
            'year'         => 'sometimes|nullable|integer|min:1900|max:2100',
            'department'   => 'sometimes|nullable|string|max:100',
            'asset_id'     => 'sometimes|nullable|string|max:100',
            'mileage'      => 'sometimes|nullable|integer|min:0',
            'status'       => 'sometimes|nullable|string',
            'driver_id'    => 'sometimes|nullable|uuid|exists:drivers,id',
        ];
    }
}
