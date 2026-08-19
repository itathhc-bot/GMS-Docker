<?php
namespace App\Policies;
use App\Models\User;
use App\Models\PartsRequest;
use Illuminate\Auth\Access\HandlesAuthorization;

class PartsRequestPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $user) { return $user->hasPermissionTo('parts.request'); }
    public function view(User $user, PartsRequest $request) { return $user->hasPermissionTo('parts.request'); }
    public function create(User $user) { return $user->hasPermissionTo('parts.request'); }
    public function update(User $user, PartsRequest $request) { return $user->hasPermissionTo('parts.request'); }
    public function delete(User $user, PartsRequest $request) { return $user->hasPermissionTo('parts.request'); }
    public function approve(User $user, PartsRequest $request) { return $user->hasPermissionTo('parts.approve'); }
    public function reject(User $user, PartsRequest $request) { return $user->hasPermissionTo('parts.reject'); }
    public function issue(User $user, PartsRequest $request) { return $user->hasPermissionTo('parts.issue'); }
}
