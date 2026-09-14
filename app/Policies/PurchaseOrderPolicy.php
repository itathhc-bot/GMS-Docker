<?php
namespace App\Policies;
use App\Models\User;
use App\Models\PurchaseOrder;
use Illuminate\Auth\Access\HandlesAuthorization;

class PurchaseOrderPolicy
{
    use HandlesAuthorization;

    public function before($user, string $ability): bool|null
    {
        if ($user->hasRole('admin')) return true;
        return null;
    }

    public function viewAny(User $user) { return $user->hasPermissionTo('po.view'); }
    public function view(User $user, PurchaseOrder $po) { return $user->hasPermissionTo('po.view'); }
    public function create(User $user) { return $user->hasPermissionTo('po.create'); }
    public function update(User $user, PurchaseOrder $po) { return $user->hasPermissionTo('po.create'); }
    public function delete(User $user, PurchaseOrder $po) { return $user->hasPermissionTo('po.create'); }
    public function approveManager(User $user, PurchaseOrder $po) { return $user->hasPermissionTo('po.approve_manager'); }
    public function approveFinance(User $user, PurchaseOrder $po) { return $user->hasPermissionTo('po.approve_finance'); }
    public function reject(User $user, PurchaseOrder $po) { return $user->hasPermissionTo('po.reject'); }
}
