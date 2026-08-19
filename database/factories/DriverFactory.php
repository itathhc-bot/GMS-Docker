<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Driver;

class DriverFactory extends Factory
{
    protected $model = Driver::class;

    public function definition(): array
    {
        return [
            'full_name' => $this->faker->name(),
            'email' => $this->faker->unique()->safeEmail(),
            'phone' => $this->faker->phoneNumber(),
            'license_number' => $this->faker->unique()->bothify('LIC-########'),
            'license_expiry' => $this->faker->dateTimeBetween('now', '+5 years')->format('Y-m-d'),
            'department' => $this->faker->randomElement(['Operations', 'Logistics', 'Management']),
            'is_active' => $this->faker->boolean(90),
            'notes' => $this->faker->sentence(),
        ];
    }
}
