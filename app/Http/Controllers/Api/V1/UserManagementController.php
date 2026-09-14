<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\SetPasswordRequest;
use App\Http\Requests\Api\V1\StoreUserRequest;
use App\Http\Requests\Api\V1\UpdateUserRequest;
use App\Models\User;
use App\Services\UserManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserManagementController extends Controller
{
    public function __construct(private UserManagementService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', User::class);

        try {
            $filters = $request->only(['role', 'search', 'is_deactivated']);
            $users = $this->service->listUsers($filters);
            return response()->json($users);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to retrieve users: ' . $e->getMessage()], 500);
        }
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('view', $user);

        $user->load(['profile', 'roles']);
        return response()->json($user);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $this->authorize('create', User::class);

        try {
            $user = $this->service->createUser($request->validated(), $request->user()->id);
            return response()->json($user, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create user: ' . $e->getMessage()], 500);
        }
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        try {
            $user = $this->service->updateUser($user->id, $request->validated(), $request->user()->id);
            return response()->json($user);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update user: ' . $e->getMessage()], 500);
        }
    }

    public function deactivate(Request $request, User $user): JsonResponse
    {
        $this->authorize('delete', $user);

        try {
            $this->service->deactivateUser($user->id, $request->user()->id);
            return response()->json(['message' => 'User deactivated successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to deactivate user: ' . $e->getMessage()], 500);
        }
    }

    public function reactivate(Request $request, User $user): JsonResponse
    {
        $this->authorize('restore', $user);

        try {
            $this->service->reactivateUser($user->id, $request->user()->id);
            return response()->json(['message' => 'User reactivated successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to reactivate user: ' . $e->getMessage()], 500);
        }
    }

    public function assignRole(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);
        $request->validate(['role' => 'required|string|exists:roles,name']);

        try {
            $this->service->assignRole($user->id, $request->role, $request->user()->id);
            return response()->json(['message' => 'Role assigned successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to assign role: ' . $e->getMessage()], 500);
        }
    }

    public function removeRole(Request $request, User $user, string $role): JsonResponse
    {
        $this->authorize('update', $user);

        try {
            $this->service->removeRole($user->id, $role, $request->user()->id);
            return response()->json(['message' => 'Role removed successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to remove role: ' . $e->getMessage()], 500);
        }
    }

    public function setPassword(SetPasswordRequest $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        try {
            $this->service->setPassword($user->id, $request->password, $request->user()->id);
            return response()->json(['message' => 'Password updated successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to set password: ' . $e->getMessage()], 500);
        }
    }

    public function sendPasswordReset(Request $request, User $user): JsonResponse
    {
        $this->authorize('update', $user);

        try {
            $this->service->sendPasswordReset($user->id, $request->user()->id);
            return response()->json(['message' => 'Password reset link sent']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to send password reset: ' . $e->getMessage()], 500);
        }
    }
}
