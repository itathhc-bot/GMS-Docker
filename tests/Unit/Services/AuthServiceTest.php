<?php

namespace Tests\Unit\Services;

use App\Models\User;
use App\Services\AuthService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AuthServiceTest extends TestCase
{
    use RefreshDatabase;

    protected AuthService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(AuthService::class);
    }

    public function test_login_returns_user_and_token()
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('password123')
        ]);

        $result = $this->service->login('test@example.com', 'password123', 'test-device');

        $this->assertArrayHasKey('user', $result);
        $this->assertArrayHasKey('token', $result);
        $this->assertEquals($user->id, $result['user']->id);
    }

    public function test_login_throws_exception_with_invalid_credentials()
    {
        $this->expectException(ValidationException::class);

        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('password123')
        ]);

        $this->service->login('test@example.com', 'wrongpassword', 'test-device');
    }

    public function test_logout_deletes_current_token()
    {
        $user = User::factory()->create();
        $token = $user->createToken('test-device');
        
        $this->actingAs($user, 'sanctum');
        
        // Ensure the token exists on the user model before logout
        $this->assertCount(1, $user->tokens);
        
        $this->service->logout($user);
        
        $this->assertCount(0, $user->fresh()->tokens);
    }
}
