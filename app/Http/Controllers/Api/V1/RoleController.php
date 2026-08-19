<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    private array $systemRoles = ['admin', 'supervisor', 'mechanic', 'store_clerk', 'qc_inspector'];

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', Role::class);
        $roles = Role::with('permissions')->get();
        return response()->json($roles);
    }

    public function show(int $id): JsonResponse
    {
        $role = Role::with('permissions')->findOrFail($id);
        $this->authorize('view', $role);
        return response()->json($role);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', Role::class);
        $request->validate([
            'name' => 'required|string|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        try {
            $role = Role::create(['name' => $request->name]);
            if ($request->has('permissions')) {
                $role->syncPermissions($request->permissions);
            }
            return response()->json($role->load('permissions'), 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create role: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $role = Role::findOrFail($id);
        $this->authorize('update', $role);

        $request->validate([
            'name' => 'required|string|unique:roles,name,' . $id,
        ]);

        if (in_array($role->name, $this->systemRoles)) {
            return response()->json(['message' => 'Cannot rename a system role'], 403);
        }

        try {
            $role->update(['name' => $request->name]);
            return response()->json($role);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update role: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        $role = Role::findOrFail($id);
        $this->authorize('delete', $role);

        if (in_array($role->name, $this->systemRoles)) {
            return response()->json(['message' => 'Cannot delete a system role'], 403);
        }

        try {
            $role->delete();
            return response()->json(['message' => 'Role deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete role: ' . $e->getMessage()], 500);
        }
    }

    public function syncPermissions(Request $request, int $id): JsonResponse
    {
        $role = Role::findOrFail($id);
        $this->authorize('update', $role);

        $request->validate([
            'permissions' => 'required|array',
            'permissions.*' => 'exists:permissions,name',
        ]);

        try {
            $role->syncPermissions($request->permissions);
            return response()->json(['message' => 'Permissions synced successfully', 'role' => $role->load('permissions')]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to sync permissions: ' . $e->getMessage()], 500);
        }
    }
}
