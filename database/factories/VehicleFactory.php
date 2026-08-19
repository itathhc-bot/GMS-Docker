<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Vehicle;

class VehicleFactory extends Factory
{
    protected $model = Vehicle::class;

    public function definition(): array
    {
        return [
            'plate_number' => $this->faker->unique()->bothify('??-###-??'),
            'vin' => $this->faker->unique()->bothify('*****************'),
            'make' => $this->faker->randomElement(['Toyota', 'Ford', 'Nissan', 'Honda', 'Mitsubishi']),
            'model' => $this->faker->word(),
            'year' => $this->faker->numberBetween(2010, 2024),
            'department' => $this->faker->randomElement(['Operations', 'Logistics', 'Management']),
            'asset_id' => $this->faker->unique()->numerify('AST-####'),
            'mileage' => $this->faker->numberBetween(0, 200000),
            'status' => $this->faker->randomElement(['Available', 'In Service', 'Awaiting Parts', 'Decommissioned']),
        ];
    }
}
