<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreVehicleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Add policy checks here if needed
    }

    public function rules(): array
    {
        return ['plate_number' => 'required|string|unique:vehicles,plate_number', 'make' => 'required|string', 'model' => 'required|string'];
    }
}
