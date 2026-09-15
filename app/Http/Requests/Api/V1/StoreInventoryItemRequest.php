<?php

namespace App\Http\Requests\Api\V1;

use Illuminate\Foundation\Http\FormRequest;

class StoreInventoryItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Add policy checks here if needed
    }

    protected function prepareForValidation()
    {
        if ($this->has('part_number') && !$this->has('sku')) {
            $this->merge(['sku' => $this->input('part_number')]);
        }
        if ($this->has('name') && !$this->has('part_name')) {
            $this->merge(['part_name' => $this->input('name')]);
        }
        if ($this->has('quantity') && !$this->has('stock_quantity')) {
            $this->merge(['stock_quantity' => $this->input('quantity')]);
        }
        if ($this->has('minimum_quantity') && !$this->has('min_threshold')) {
            $this->merge(['min_threshold' => $this->input('minimum_quantity')]);
        }
    }

    public function rules(): array
    {
        return [
            'sku'            => 'required|string|max:100|unique:inventory_items,sku',
            'part_name'      => 'required|string|max:255',
            'category'       => 'nullable|string|max:100',
            'location'       => 'nullable|string|max:100',
            'stock_quantity' => 'nullable|integer|min:0',
            'min_threshold'  => 'nullable|integer|min:0',
            'unit_price'     => 'nullable|numeric|min:0',
            'status'         => 'nullable|string|max:50',
        ];
    }
}
