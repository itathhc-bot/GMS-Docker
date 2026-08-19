<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class VehicleSeeder extends Seeder
{
    public function run(): void
    {
        $vehicles = [
            ['plate_number' => 'GP-882-MK', 'make' => 'Toyota', 'model' => 'Land Cruiser', 'status' => 'Available', 'department' => 'Operations'],
            ['plate_number' => 'MP-04-GB-1200', 'make' => 'Ford', 'model' => 'Ranger', 'status' => 'In Service', 'department' => 'Logistics'],
            ['plate_number' => 'GP-123-AB', 'make' => 'Nissan', 'model' => 'Patrol', 'status' => 'Available', 'department' => 'Management'],
            ['plate_number' => 'GP-456-CD', 'make' => 'Toyota', 'model' => 'Hilux', 'status' => 'Awaiting Parts', 'department' => 'Operations'],
            ['plate_number' => 'GP-789-EF', 'make' => 'Ford', 'model' => 'Everest', 'status' => 'Available', 'department' => 'Logistics'],
            ['plate_number' => 'GP-321-GH', 'make' => 'Nissan', 'model' => 'Navara', 'status' => 'In Service', 'department' => 'Operations'],
            ['plate_number' => 'GP-654-IJ', 'make' => 'Toyota', 'model' => 'Fortuner', 'status' => 'Available', 'department' => 'Management'],
            ['plate_number' => 'GP-987-KL', 'make' => 'Mitsubishi', 'model' => 'Triton', 'status' => 'Decommissioned', 'department' => 'Logistics'],
        ];

        foreach ($vehicles as $vehicle) {
            DB::table('vehicles')->insert(array_merge($vehicle, [
                'id' => Str::uuid()->toString(),
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }
}
