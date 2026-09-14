<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Vehicle;
use Illuminate\Auth\Access\HandlesAuthorization;

class VehiclePolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): bool|null
    {
        if ($user->hasRole('admin')) return true;
        return null;
    }

    public function viewAny(User $user) { return $user->hasPermissionTo('vehicles.view'); }
    public function view(User $user, $model) { return $user->hasPermissionTo('vehicles.view'); }
    public function create(User $user) { return $user->hasPermissionTo('vehicles.create'); }
    public function update(User $user, $model) { return $user->hasPermissionTo('vehicles.edit'); }
    public function delete(User $user, $model) { return $user->hasPermissionTo('vehicles.delete'); }
}
