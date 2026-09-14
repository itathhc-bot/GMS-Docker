<?php
namespace App\Policies;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): bool|null
    {
        if ($user->hasRole('admin')) return true;
        return null;
    }

    public function viewAny(User $user) { return $user->hasPermissionTo('users.view'); }
    public function view(User $user, User $model) { return $user->hasPermissionTo('users.view'); }
    public function create(User $user) { return $user->hasPermissionTo('users.create'); }
    public function update(User $user, User $model) { return $user->hasPermissionTo('users.edit'); }
    public function deactivate(User $user, User $model) { return $user->hasPermissionTo('users.deactivate'); }
    public function assignRole(User $user, User $model) { return $user->hasPermissionTo('users.assign_role'); }
    public function restore(User $user, User $model) { return $user->hasRole('admin'); }
}
