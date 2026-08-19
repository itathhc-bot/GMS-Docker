<?php

namespace Tests\Feature\Api\V1;

use App\Models\JobCard;
use App\Models\Vehicle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JobCardControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_job_cards_with_filters()
    {
        JobCard::factory()->count(3)->create(['status' => 'open']);
        JobCard::factory()->count(2)->create(['status' => 'completed']);
        
        $this->actingAsAdmin();
        
        $response = $this->getJson('/api/v1/job-cards?status=open');
        
        $response->assertStatus(200)
                 ->assertJsonCount(3, 'data');
    }

    public function test_can_create_job_card()
    {
        $this->actingAsSupervisor();
        $vehicle = Vehicle::factory()->create();
        
        $data = [
            'vehicle_id' => $vehicle->id,
            'description' => 'Oil change',
            'status' => 'open'
        ];
        
        $response = $this->postJson('/api/v1/job-cards', $data);
        
        $response->assertStatus(201)
                 ->assertJsonPath('data.description', 'Oil change');
    }

    public function test_job_card_generates_unique_job_number()
    {
        $this->actingAsSupervisor();
        $vehicle = Vehicle::factory()->create();
        
        $response = $this->postJson('/api/v1/job-cards', [
            'vehicle_id' => $vehicle->id,
            'description' => 'Test',
        ]);
        
        $response->assertStatus(201);
        $this->assertNotNull($response->json('data.job_number'));
    }

    public function test_supervisor_can_assign_job_card()
    {
        $this->actingAsSupervisor();
        $jobCard = JobCard::factory()->create();
        $mechanic = User::factory()->create();
        $mechanic->assignRole('Mechanic');
        
        $response = $this->postJson("/api/v1/job-cards/{$jobCard->id}/assign", [
            'mechanic_id' => $mechanic->id
        ]);
        
        $response->assertStatus(200);
        $this->assertEquals($mechanic->id, $jobCard->fresh()->mechanic_id);
    }

    public function test_mechanic_cannot_assign_job_card()
    {
        $this->actingAsMechanic();
        $jobCard = JobCard::factory()->create();
        $mechanic = User::factory()->create();
        
        $response = $this->postJson("/api/v1/job-cards/{$jobCard->id}/assign", [
            'mechanic_id' => $mechanic->id
        ]);
        
        $response->assertStatus(403);
    }

    public function test_can_update_job_card_status()
    {
        $this->actingAsSupervisor();
        $jobCard = JobCard::factory()->create(['status' => 'open']);
        
        $response = $this->patchJson("/api/v1/job-cards/{$jobCard->id}/status", [
            'status' => 'in_progress'
        ]);
        
        $response->assertStatus(200);
        $this->assertEquals('in_progress', $jobCard->fresh()->status);
    }

    public function test_mechanic_can_sign_job_card()
    {
        $this->actingAsMechanic();
        $jobCard = JobCard::factory()->create();
        
        $response = $this->postJson("/api/v1/job-cards/{$jobCard->id}/sign", [
            'signature' => 'data:image/png;base64,...',
            'role' => 'mechanic'
        ]);
        
        $response->assertStatus(200);
    }

    public function test_supervisor_can_sign_job_card()
    {
        $this->actingAsSupervisor();
        $jobCard = JobCard::factory()->create();
        
        $response = $this->postJson("/api/v1/job-cards/{$jobCard->id}/sign", [
            'signature' => 'data:image/png;base64,...',
            'role' => 'supervisor'
        ]);
        
        $response->assertStatus(200);
    }

    public function test_signed_job_card_stores_signature_data()
    {
        $this->actingAsSupervisor();
        $jobCard = JobCard::factory()->create();
        
        $response = $this->postJson("/api/v1/job-cards/{$jobCard->id}/sign", [
            'signature' => 'data:image/png;base64,12345',
            'role' => 'supervisor'
        ]);
        
        $response->assertStatus(200);
        $this->assertDatabaseHas('signatures', [
            'signable_id' => $jobCard->id,
            'signable_type' => JobCard::class,
            'role' => 'supervisor'
        ]);
    }
}
