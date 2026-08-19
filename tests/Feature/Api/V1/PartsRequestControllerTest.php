<?php

namespace Tests\Feature\Api\V1;

use App\Models\PartsRequest;
use App\Models\Part;
use App\Models\JobCard;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartsRequestControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_mechanic_can_create_parts_request()
    {
        $this->actingAsMechanic();
        $jobCard = JobCard::factory()->create();
        $part = Part::factory()->create(['sku' => 'OIL-001', 'stock' => 10]);
        
        $response = $this->postJson('/api/v1/parts-requests', [
            'job_card_id' => $jobCard->id,
            'items' => [
                ['part_id' => $part->id, 'quantity' => 2]
            ]
        ]);
        
        $response->assertStatus(201);
    }

    public function test_parts_request_generates_unique_request_number()
    {
        $this->actingAsMechanic();
        $jobCard = JobCard::factory()->create();
        $part = Part::factory()->create();
        
        $response = $this->postJson('/api/v1/parts-requests', [
            'job_card_id' => $jobCard->id,
            'items' => [['part_id' => $part->id, 'quantity' => 1]]
        ]);
        
        $this->assertNotNull($response->json('data.request_number'));
    }

    public function test_supervisor_can_approve_parts_request()
    {
        $this->actingAsSupervisor();
        $partsRequest = PartsRequest::factory()->create(['status' => 'pending']);
        
        $response = $this->postJson("/api/v1/parts-requests/{$partsRequest->id}/approve");
        
        $response->assertStatus(200);
        $this->assertEquals('approved', $partsRequest->fresh()->status);
    }

    public function test_supervisor_can_reject_parts_request_with_reason()
    {
        $this->actingAsSupervisor();
        $partsRequest = PartsRequest::factory()->create(['status' => 'pending']);
        
        $response = $this->postJson("/api/v1/parts-requests/{$partsRequest->id}/reject", [
            'reason' => 'Part out of stock'
        ]);
        
        $response->assertStatus(200);
        $this->assertEquals('rejected', $partsRequest->fresh()->status);
        $this->assertEquals('Part out of stock', $partsRequest->fresh()->rejection_reason);
    }

    public function test_mechanic_cannot_approve_parts_request()
    {
        $this->actingAsMechanic();
        $partsRequest = PartsRequest::factory()->create(['status' => 'pending']);
        
        $response = $this->postJson("/api/v1/parts-requests/{$partsRequest->id}/approve");
        
        $response->assertStatus(403);
    }

    public function test_store_clerk_can_issue_parts()
    {
        $this->actingAsStoreClerk();
        $partsRequest = PartsRequest::factory()->create(['status' => 'approved']);
        
        $response = $this->postJson("/api/v1/parts-requests/{$partsRequest->id}/issue");
        
        $response->assertStatus(200);
        $this->assertEquals('issued', $partsRequest->fresh()->status);
    }

    public function test_issue_decrements_inventory_if_sku_matches()
    {
        $this->actingAsStoreClerk();
        $part = Part::factory()->create(['stock' => 10]);
        $partsRequest = PartsRequest::factory()->create(['status' => 'approved']);
        $partsRequest->items()->create(['part_id' => $part->id, 'quantity' => 2]);
        
        $this->postJson("/api/v1/parts-requests/{$partsRequest->id}/issue");
        
        $this->assertEquals(8, $part->fresh()->stock);
    }
}
