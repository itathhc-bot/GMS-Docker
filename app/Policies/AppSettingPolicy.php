<?php
namespace App\Policies;
use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class AppSettingPolicy
{
    use HandlesAuthorization;
    public function view(User $user) { return $user->hasPermissionTo('settings.view'); }
    public function update(User $user) { return $user->hasPermissionTo('settings.edit'); }
}
