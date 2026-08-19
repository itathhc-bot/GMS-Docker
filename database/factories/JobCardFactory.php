<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\JobCard;

class JobCardFactory extends Factory
{
    protected $model = JobCard::class;

    public function definition(): array
    {
        return [
            'job_number' => $this->faker->unique()->numerify('JOB-#####'),
            'status' => $this->faker->randomElement(['Open', 'In Progress', 'Pending Parts', 'QC Review', 'Completed', 'Delayed']),
            'priority' => $this->faker->randomElement(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
            'description' => $this->faker->paragraph(),
            'bay_number' => $this->faker->bothify('BAY-##'),
            'sla_hours' => $this->faker->randomFloat(2, 1, 24),
            'started_at' => $this->faker->optional()->dateTime(),
            'completed_at' => clone $this->faker->optional()->dateTime(),
        ];
    }
}
