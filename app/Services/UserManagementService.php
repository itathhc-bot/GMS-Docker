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

        if (!empty($filters['role'])) {
            $query->role($filters['role']);
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
                'name'      => $data['full_name'],
                'email'     => $data['email'],
                'password'  => Hash::make($data['password']),
                'is_active' => $data['is_active'] ?? true,
            ]);

            // Create profile with provided fields
            $user->profile()->create([
                'full_name'   => $data['full_name'],
                'employee_id' => $data['employee_id'] ?? null,
                'department'  => $data['department'] ?? null,
            ]);

            // Assign primary role
            $rolesToAssign = [];
            if (!empty($data['role'])) {
                $rolesToAssign[] = $data['role'];
            }
            // Assign extra system roles
            if (!empty($data['extra_system_roles']) && is_array($data['extra_system_roles'])) {
                foreach ($data['extra_system_roles'] as $r) {
                    $rolesToAssign[] = $r;
                }
            }
            // Assign custom roles by ID
            if (!empty($data['custom_role_ids']) && is_array($data['custom_role_ids'])) {
                foreach ($data['custom_role_ids'] as $roleId) {
                    $rolesToAssign[] = $roleId;
                }
            }
            if (!empty($rolesToAssign)) {
                $user->syncRoles($rolesToAssign);
            }

            $this->logAudit($actorId, 'user_created', 'User', $user->id, ['email' => $user->email, 'role' => $data['role'] ?? null], $user->id, $user->name);

            return $user->load('profile', 'roles');
        });
    }

    public function updateUser(string $id, array $data, string $actorId)
    {
        return DB::transaction(function () use ($id, $data, $actorId) {
            $user = $this->getUser($id);

            $userUpdates = [];
            if (isset($data['full_name'])) {
                $userUpdates['name'] = $data['full_name'];
            }
            if (isset($data['email'])) {
                $userUpdates['email'] = $data['email'];
            }
            if (!empty($userUpdates)) {
                $user->update($userUpdates);
            }

            // Update profile
            $profileData = array_filter([
                'full_name'   => $data['full_name'] ?? null,
                'employee_id' => $data['employee_id'] ?? null,
                'department'  => $data['department'] ?? null,
            ], fn($v) => $v !== null);

            if (!empty($profileData)) {
                $user->profile()->updateOrCreate(['user_id' => $user->id], $profileData);
            }

            // Sync roles
            $rolesToAssign = [];
            if (!empty($data['role'])) {
                $rolesToAssign[] = $data['role'];
            }
            if (!empty($data['extra_system_roles']) && is_array($data['extra_system_roles'])) {
                foreach ($data['extra_system_roles'] as $r) {
                    $rolesToAssign[] = $r;
                }
            }
            if (!empty($data['custom_role_ids']) && is_array($data['custom_role_ids'])) {
                foreach ($data['custom_role_ids'] as $roleId) {
                    $rolesToAssign[] = $roleId;
                }
            }
            if (!empty($rolesToAssign)) {
                $user->syncRoles($rolesToAssign);
            }

            $this->logAudit($actorId, 'role_assigned', 'User', $user->id, ['updated_fields' => array_keys($data)], $user->id, $user->name);

            return $user->load('profile', 'roles');
        });
    }

    public function deactivateUser(string $id, string $actorId)
    {
        if ($id === $actorId) {
            throw new \InvalidArgumentException('You cannot deactivate your own account.');
        }
        $user = $this->getUser($id);
        $user->update(['is_active' => false]);
        $user->tokens()->delete();
        $this->logAudit($actorId, 'user_deactivated', 'User', $user->id, [], $user->id, $user->name);
        return $user;
    }

    public function reactivateUser(string $id, string $actorId)
    {
        $user = $this->getUser($id);
        $user->update(['is_active' => true]);
        $this->logAudit($actorId, 'user_reactivated', 'User', $user->id, [], $user->id, $user->name);
        return $user;
    }

    public function assignRole(string $userId, string $role, string $actorId)
    {
        $user = $this->getUser($userId);
        $user->assignRole($role);
        $this->logAudit($actorId, 'role_assigned', 'User', $user->id, ['role' => $role], $user->id, $user->name);
        return $user;
    }

    public function removeRole(string $userId, string $role, string $actorId)
    {
        $user = $this->getUser($userId);
        $user->removeRole($role);
        $this->logAudit($actorId, 'role_removed', 'User', $user->id, ['role' => $role], $user->id, $user->name);
        return $user;
    }

    public function setPassword(string $userId, string $password, string $actorId)
    {
        $user = $this->getUser($userId);
        $user->update(['password' => Hash::make($password)]);
        $user->tokens()->delete();
        $this->logAudit($actorId, 'password_set', 'User', $user->id, [], $user->id, $user->name);
        return $user;
    }

    public function sendPasswordReset(string $userId, string $actorId)
    {
        $user = User::find($userId);
        $this->logAudit($actorId, 'password_reset_sent', 'User', $userId, [], $userId, $user?->name);
    }

    protected function logAudit(
        string $actorId,
        string $action,
        string $type,
        string $entityId,
        array $details = [],
        ?string $targetUserId = null,
        ?string $targetName = null
    ) {
        $actor = User::find($actorId);
        AuditLog::create([
            'log_type'       => 'admin',
            'actor_user_id'  => $actorId,
            'actor_name'     => $actor?->name,
            'target_user_id' => $targetUserId,
            'target_name'    => $targetName,
            'action'         => $action,
            'entity_type'    => $type,
            'entity_id'      => $entityId,
            'details'        => $details,
        ]);
    }
}
