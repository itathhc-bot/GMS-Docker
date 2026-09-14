<?php
namespace App\Policies;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $user) { return $user->hasPermissionTo('users.view'); }
    public function view(User $user, User $model) { return $user->hasPermissionTo('users.view'); }
    public function create(User $user) { return $user->hasPermissionTo('users.create'); }
    public function update(User $user, User $model) { return $user->hasPermissionTo('users.edit'); }
    public function deactivate(User $user, User $model) { return $user->hasPermissionTo('users.deactivate'); }
    public function assignRole(User $user, User $model) { return $user->hasPermissionTo('users.assign_role'); }
}
