<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\InventoryItem;

class InventoryItemFactory extends Factory
{
    protected $model = InventoryItem::class;

    public function definition(): array
    {
        return [
            'sku' => $this->faker->unique()->bothify('SKU-######'),
            'part_name' => $this->faker->words(3, true),
            'category' => $this->faker->randomElement(['Engine', 'Brakes', 'Transmission', 'Electrical', 'General']),
            'location' => $this->faker->bothify('Aisle-##-Shelf-##'),
            'stock_quantity' => $this->faker->numberBetween(0, 100),
            'min_threshold' => $this->faker->numberBetween(5, 20),
            'unit_price' => $this->faker->randomFloat(2, 5, 500),
            'status' => $this->faker->randomElement(['In Stock', 'Low Stock', 'Out of Stock']),
        ];
    }
}
