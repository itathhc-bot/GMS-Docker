<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    private function formatUser(User $user)
    {
        $user->loadMissing('profile');
        $roles = $user->getRoleNames()->toArray();
        $permissions = $user->getAllPermissions()->pluck('name')->toArray();

        $userData = $user->toArray();
        $userData['roles'] = $roles;
        $userData['permissions'] = $permissions;

        return $userData;
    }

    public function login(array $credentials)
    {
        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['This account has been deactivated.'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'user' => $this->formatUser($user),
            'token' => $token,
        ];
    }

    public function logout(User $user)
    {
        $user->currentAccessToken()->delete();
    }

    public function me(User $user)
    {
        return $this->formatUser($user);
    }
}
