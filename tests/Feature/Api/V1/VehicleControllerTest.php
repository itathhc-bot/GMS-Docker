<?php

namespace Tests\Feature\Api\V1;

use App\Models\Vehicle;
use App\Models\JobCard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VehicleControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_vehicles()
    {
        Vehicle::factory()->count(3)->create();
        
        $this->actingAsAdmin();
        
        $response = $this->getJson('/api/v1/vehicles');
        
        $response->assertStatus(200)
                 ->assertJsonCount(3, 'data');
    }

    public function test_mechanic_can_view_vehicle()
    {
        $vehicle = Vehicle::factory()->create();
        
        $this->actingAsMechanic();
        
        $response = $this->getJson("/api/v1/vehicles/{$vehicle->id}");
        
        $response->assertStatus(200)
                 ->assertJsonPath('data.id', $vehicle->id);
    }

    public function test_unauthenticated_cannot_access_vehicles()
    {
        $response = $this->getJson('/api/v1/vehicles');
        
        $response->assertStatus(401);
    }

    public function test_admin_can_create_vehicle_with_valid_data()
    {
        $this->actingAsAdmin();
        
        $data = [
            'plate_number' => 'ABC1234',
            'make' => 'Toyota',
            'model' => 'Camry',
            'year' => 2022,
            'vin' => '12345678901234567',
            'status' => 'active',
        ];
        
        $response = $this->postJson('/api/v1/vehicles', $data);
        
        $response->assertStatus(201)
                 ->assertJsonPath('data.plate_number', 'ABC1234');
                 
        $this->assertDatabaseHas('vehicles', ['plate_number' => 'ABC1234']);
    }

    public function test_create_vehicle_validates_required_fields()
    {
        $this->actingAsAdmin();
        
        $response = $this->postJson('/api/v1/vehicles', []);
        
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['plate_number', 'make', 'model', 'year']);
    }

    public function test_create_vehicle_validates_unique_plate_number()
    {
        Vehicle::factory()->create(['plate_number' => 'DUBAI123']);
        
        $this->actingAsAdmin();
        
        $data = [
            'plate_number' => 'DUBAI123',
            'make' => 'Toyota',
            'model' => 'Camry',
            'year' => 2022,
        ];
        
        $response = $this->postJson('/api/v1/vehicles', $data);
        
        $response->assertStatus(422)
                 ->assertJsonValidationErrors(['plate_number']);
    }

    public function test_admin_can_update_vehicle()
    {
        $vehicle = Vehicle::factory()->create(['make' => 'Toyota']);
        
        $this->actingAsAdmin();
        
        $response = $this->putJson("/api/v1/vehicles/{$vehicle->id}", [
            'make' => 'Honda',
            'plate_number' => $vehicle->plate_number,
        ]);
        
        $response->assertStatus(200)
                 ->assertJsonPath('data.make', 'Honda');
                 
        $this->assertDatabaseHas('vehicles', ['id' => $vehicle->id, 'make' => 'Honda']);
    }

    public function test_admin_can_delete_vehicle()
    {
        $vehicle = Vehicle::factory()->create();
        
        $this->actingAsAdmin();
        
        $response = $this->deleteJson("/api/v1/vehicles/{$vehicle->id}");
        
        $response->assertStatus(200);
        
        $this->assertSoftDeleted('vehicles', ['id' => $vehicle->id]);
    }

    public function test_mechanic_cannot_delete_vehicle()
    {
        $vehicle = Vehicle::factory()->create();
        
        $this->actingAsMechanic();
        
        $response = $this->deleteJson("/api/v1/vehicles/{$vehicle->id}");
        
        $response->assertStatus(403);
    }

    public function test_vehicle_history_returns_job_cards()
    {
        $vehicle = Vehicle::factory()->create();
        JobCard::factory()->count(2)->create(['vehicle_id' => $vehicle->id]);
        
        $this->actingAsAdmin();
        
        $response = $this->getJson("/api/v1/vehicles/{$vehicle->id}/history");
        
        $response->assertStatus(200)
                 ->assertJsonCount(2, 'data');
    }
}
