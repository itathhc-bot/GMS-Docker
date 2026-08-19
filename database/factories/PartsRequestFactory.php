<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\PartsRequest;

class PartsRequestFactory extends Factory
{
    protected $model = PartsRequest::class;

    public function definition(): array
    {
        return [
            'request_number' => $this->faker->unique()->numerify('PR-#####'),
            'part_name' => $this->faker->words(3, true),
            'part_number' => $this->faker->bothify('PN-#####-??'),
            'quantity' => $this->faker->numberBetween(1, 10),
            'urgency' => $this->faker->randomElement(['Normal', 'Urgent', 'Emergency']),
            'status' => $this->faker->randomElement(['Pending', 'Approved', 'Rejected', 'Issued']),
            'reason' => $this->faker->sentence(),
        ];
    }
}
