<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Driver;
use Illuminate\Auth\Access\HandlesAuthorization;

class DriverPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user) { return $user->hasPermissionTo('driver.view'); }
    public function view(User $user, $model) { return $user->hasPermissionTo('driver.view'); }
    public function create(User $user) { return $user->hasPermissionTo('driver.create'); }
    public function update(User $user, $model) { return $user->hasPermissionTo('driver.edit'); }
    public function delete(User $user, $model) { return $user->hasPermissionTo('driver.delete'); }
}
