<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Driver;
use Illuminate\Auth\Access\HandlesAuthorization;

class DriverPolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): bool|null
    {
        if ($user->hasRole('admin')) return true;
        return null;
    }

    public function viewAny(User $user): bool  { return $user->hasAnyPermission(['drivers.view']); }
    public function view(User $user, $model): bool { return $user->hasAnyPermission(['drivers.view']); }
    public function create(User $user): bool   { return $user->hasAnyPermission(['drivers.create']); }
    public function update(User $user, $model): bool { return $user->hasAnyPermission(['drivers.edit']); }
    public function delete(User $user, $model): bool { return $user->hasAnyPermission(['drivers.delete']); }
}
