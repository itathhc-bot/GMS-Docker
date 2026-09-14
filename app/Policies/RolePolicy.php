<?php

namespace App\Policies;

use App\Models\User;
use Spatie\Permission\Models\Role;

class RolePolicy
{
    public function before(User $user, string $ability): ?bool
    {
        if ($user->hasRole('admin')) {
            return true;
        }
        return null;
    }

    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('users.view');
    }

    public function view(User $user, Role $role): bool
    {
        return $user->hasPermissionTo('users.view');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('users.assign_role');
    }

    public function update(User $user, Role $role): bool
    {
        return $user->hasPermissionTo('users.assign_role');
    }

    public function delete(User $user, Role $role): bool
    {
        return $user->hasPermissionTo('users.assign_role');
    }
}
