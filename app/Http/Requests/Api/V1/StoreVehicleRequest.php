<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreVehicleRequest extends FormRequest
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
        return [
            'plate_number' => 'required|string|max:50|unique:vehicles,plate_number',
            'vin'          => 'nullable|string|max:100|unique:vehicles,vin',
            'make'         => 'nullable|string|max:100',
            'model'        => 'nullable|string|max:100',
            'year'         => 'nullable|integer|min:1900|max:2100',
            'department'   => 'nullable|string|max:100',
            'asset_id'     => 'nullable|string|max:100',
            'mileage'      => 'nullable|integer|min:0',
            'status'       => 'nullable|string',
            'driver_id'    => 'nullable|uuid|exists:drivers,id',
        ];
    }
}
