<?php

namespace Tests;

use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Ensure roles exist for testing
        $roles = ['Admin', 'Supervisor', 'Mechanic', 'Store Clerk', 'QC Inspector', 'Driver'];
        foreach ($roles as $role) {
            Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        }
    }

    protected function actingAsRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    protected function actingAsAdmin(): User
    {
        return $this->actingAsRole('Admin');
    }

    protected function actingAsSupervisor(): User
    {
        return $this->actingAsRole('Supervisor');
    }

    protected function actingAsMechanic(): User
    {
        return $this->actingAsRole('Mechanic');
    }

    protected function actingAsStoreClerk(): User
    {
        return $this->actingAsRole('Store Clerk');
    }

    protected function actingAsQcInspector(): User
    {
        return $this->actingAsRole('QC Inspector');
    }
}
