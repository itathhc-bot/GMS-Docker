<?php

namespace Tests\Feature\Api\V1;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseOrderControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_purchase_order_with_items()
    {
        $this->actingAsStoreClerk();
        
        $data = [
            'supplier_id' => 1,
            'expected_delivery_date' => now()->addDays(7)->format('Y-m-d'),
            'items' => [
                ['description' => 'Brake Pads', 'quantity' => 10, 'unit_price' => 50],
                ['description' => 'Oil Filter', 'quantity' => 20, 'unit_price' => 15],
            ]
        ];
        
        $response = $this->postJson('/api/v1/purchase-orders', $data);
        
        $response->assertStatus(201);
    }

    public function test_po_generates_unique_po_number()
    {
        $this->actingAsStoreClerk();
        
        $response = $this->postJson('/api/v1/purchase-orders', [
            'supplier_id' => 1,
            'items' => [
                ['description' => 'Tire', 'quantity' => 4, 'unit_price' => 150]
            ]
        ]);
        
        $response->assertStatus(201);
        $this->assertNotNull($response->json('data.po_number'));
    }

    public function test_manager_can_approve_po()
    {
        $manager = User::factory()->create();
        $manager->assignRole('Admin'); // Using Admin as manager for simplicity
        $this->actingAs($manager, 'sanctum');
        
        $po = PurchaseOrder::factory()->create(['status' => 'draft']);
        
        $response = $this->postJson("/api/v1/purchase-orders/{$po->id}/manager-approve");
        
        $response->assertStatus(200);
        $this->assertEquals('manager_approved', $po->fresh()->status);
    }

    public function test_finance_can_approve_po_after_manager()
    {
        $finance = User::factory()->create();
        $finance->assignRole('Admin'); // Finance role
        $this->actingAs($finance, 'sanctum');
        
        $po = PurchaseOrder::factory()->create(['status' => 'manager_approved']);
        
        $response = $this->postJson("/api/v1/purchase-orders/{$po->id}/finance-approve");
        
        $response->assertStatus(200);
        $this->assertEquals('approved', $po->fresh()->status);
    }

    public function test_cannot_finance_approve_before_manager_approval()
    {
        $finance = User::factory()->create();
        $finance->assignRole('Admin');
        $this->actingAs($finance, 'sanctum');
        
        $po = PurchaseOrder::factory()->create(['status' => 'draft']);
        
        $response = $this->postJson("/api/v1/purchase-orders/{$po->id}/finance-approve");
        
        $response->assertStatus(400); // Bad Request or 422 depending on implementation
    }

    public function test_po_can_be_rejected_with_reason()
    {
        $manager = User::factory()->create();
        $manager->assignRole('Admin');
        $this->actingAs($manager, 'sanctum');
        
        $po = PurchaseOrder::factory()->create(['status' => 'draft']);
        
        $response = $this->postJson("/api/v1/purchase-orders/{$po->id}/reject", [
            'reason' => 'Budget exceeded'
        ]);
        
        $response->assertStatus(200);
        $this->assertEquals('rejected', $po->fresh()->status);
        $this->assertEquals('Budget exceeded', $po->fresh()->rejection_reason);
    }
}
