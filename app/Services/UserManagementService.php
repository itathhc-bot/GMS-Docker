<?php

namespace App\Services;

use App\Models\User;
use App\Models\Profile;
use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserManagementService
{
    public function listUsers(array $filters = [])
    {
        $query = User::with('profile', 'roles');

        if (isset($filters['search'])) {
            $query->where('name', 'like', '%' . $filters['search'] . '%')
                  ->orWhere('email', 'like', '%' . $filters['search'] . '%');
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        return $query->paginate($filters['per_page'] ?? 15);
    }

    public function getUser(string $id)
    {
        return User::with('profile', 'roles')->findOrFail($id);
    }

    public function createUser(array $data, string $actorId)
    {
        return DB::transaction(function () use ($data, $actorId) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'is_active' => $data['is_active'] ?? true,
            ]);

            $user->profile()->create($data['profile'] ?? []);

            if (isset($data['roles'])) {
                $user->assignRole($data['roles']);
            }

            $this->logAudit($actorId, 'create', 'User', $user->id, ['created_user' => $user->email]);

            return $user->load('profile', 'roles');
        });
    }

    public function updateUser(string $id, array $data, string $actorId)
    {
        return DB::transaction(function () use ($id, $data, $actorId) {
            $user = $this->getUser($id);
            
            $user->update([
                'name' => $data['name'] ?? $user->name,
                'email' => $data['email'] ?? $user->email,
            ]);

            if (isset($data['profile'])) {
                $user->profile()->updateOrCreate(
                    ['user_id' => $user->id],
                    $data['profile']
                );
            }

            if (isset($data['roles'])) {
                $user->syncRoles($data['roles']);
            }

            $this->logAudit($actorId, 'update', 'User', $user->id, ['updated_fields' => array_keys($data)]);

            return $user->load('profile', 'roles');
        });
    }

    public function deactivateUser(string $id, string $actorId)
    {
        $user = $this->getUser($id);
        $user->update(['is_active' => false]);
        $user->tokens()->delete();
        $this->logAudit($actorId, 'deactivate', 'User', $user->id, []);
        return $user;
    }

    public function reactivateUser(string $id, string $actorId)
    {
        $user = $this->getUser($id);
        $user->update(['is_active' => true]);
        $this->logAudit($actorId, 'reactivate', 'User', $user->id, []);
        return $user;
    }

    public function assignRole(string $userId, string $role, string $actorId)
    {
        $user = $this->getUser($userId);
        $user->assignRole($role);
        $this->logAudit($actorId, 'assign_role', 'User', $user->id, ['role' => $role]);
        return $user;
    }

    public function removeRole(string $userId, string $role, string $actorId)
    {
        $user = $this->getUser($userId);
        $user->removeRole($role);
        $this->logAudit($actorId, 'remove_role', 'User', $user->id, ['role' => $role]);
        return $user;
    }

    public function setPassword(string $userId, string $password, string $actorId)
    {
        $user = $this->getUser($userId);
        $user->update(['password' => Hash::make($password)]);
        $user->tokens()->delete();
        $this->logAudit($actorId, 'set_password', 'User', $user->id, []);
        return $user;
    }

    public function sendPasswordReset(string $userId, string $actorId)
    {
        // Implementation for sending password reset link
        $this->logAudit($actorId, 'send_password_reset', 'User', $userId, []);
    }

    protected function logAudit(string $actorId, string $action, string $type, string $entityId, array $details)
    {
        AuditLog::create([
            'actor_id' => $actorId,
            'action' => $action,
            'entity_type' => $type,
            'entity_id' => $entityId,
            'details' => $details,
        ]);
    }
}
