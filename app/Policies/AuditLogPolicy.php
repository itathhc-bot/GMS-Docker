<?php

namespace App\Policies;

use App\Models\User;
use App\Models\AuditLog;
use Illuminate\Auth\Access\HandlesAuthorization;

class AuditLogPolicy
{
    use HandlesAuthorization;

    public function before($user, string $ability): bool|null
    {
        if ($user->hasRole('admin')) return true;
        return null;
    }


    public function viewAny(User $user) { return $user->hasPermissionTo('audit.view'); }
    public function view(User $user, $model) { return $user->hasPermissionTo('audit.view'); }
    public function create(User $user) { return $user->hasPermissionTo('audit.create'); }
    public function update(User $user, $model) { return $user->hasPermissionTo('audit.edit'); }
    public function delete(User $user, $model) { return $user->hasPermissionTo('audit.delete'); }
}
