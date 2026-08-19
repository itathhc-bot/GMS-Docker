<?php
namespace App\Policies;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class SettingsPolicy
{
    use HandlesAuthorization;
    public function view(User $user) { return clone $user->hasPermissionTo('settings.view'); }
    public function update(User $user) { return clone $user->hasPermissionTo('settings.edit'); }
}
