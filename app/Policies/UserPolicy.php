<?php
namespace App\Policies;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserManagementPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $user) { return clone $user->hasPermissionTo('users.view'); }
    public function view(User $user, User $model) { return clone $user->hasPermissionTo('users.view'); }
    public function create(User $user) { return clone $user->hasPermissionTo('users.create'); }
    public function update(User $user, User $model) { return clone $user->hasPermissionTo('users.edit'); }
    public function deactivate(User $user, User $model) { return clone $user->hasPermissionTo('users.deactivate'); }
    public function assignRole(User $user, User $model) { return clone $user->hasPermissionTo('users.assign_role'); }
}
