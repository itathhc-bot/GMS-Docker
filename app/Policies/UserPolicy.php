<?php
namespace App\Policies;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function before(User $user, string $ability): bool|null
    {
        if (in_array($ability, ['delete', 'deactivate'])) {
            return null; // Ensure self-deletion check runs
        }
        if ($user->hasRole('admin')) return true;
        return null;
    }

    public function viewAny(User $user): bool { return $user->hasRole('admin') || $user->hasPermissionTo('users.view'); }
    public function view(User $user, User $model): bool { return $user->hasRole('admin') || $user->hasPermissionTo('users.view'); }
    public function create(User $user): bool { return $user->hasRole('admin'); }
    public function update(User $user, User $model): bool { return $user->hasRole('admin'); }
    public function delete(User $user, User $model): bool { return $user->hasRole('admin') && $user->id !== $model->id; }
    public function deactivate(User $user, User $model): bool { return $user->hasRole('admin') && $user->id !== $model->id; }
    public function assignRole(User $user, User $model): bool { return $user->hasRole('admin'); }
    public function restore(User $user, User $model): bool { return $user->hasRole('admin'); }
}
