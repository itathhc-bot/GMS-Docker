<?php

namespace App\Policies;

use App\Models\User;
use App\Models\InventoryItem;
use Illuminate\Auth\Access\HandlesAuthorization;

class InventoryItemPolicy
{
    use HandlesAuthorization;

    public function before($user, string $ability): bool|null
    {
        if ($user->hasRole('admin')) return true;
        return null;
    }


    public function viewAny(User $user) { return $user->hasPermissionTo('inventory.view'); }
    public function view(User $user, $model) { return $user->hasPermissionTo('inventory.view'); }
    public function create(User $user) { return $user->hasPermissionTo('inventory.create'); }
    public function update(User $user, $model) { return $user->hasPermissionTo('inventory.edit'); }
    public function delete(User $user, $model) { return $user->hasPermissionTo('inventory.delete'); }
}
