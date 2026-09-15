<?php
namespace App\Policies;
use App\Models\User;
use App\Models\QcReview;
use Illuminate\Auth\Access\HandlesAuthorization;

class QcReviewPolicy
{
    use HandlesAuthorization;

    public function before($user, string $ability): bool|null
    {
        if ($user->hasRole('admin')) return true;
        return null;
    }

    public function viewAny(User $user) { return $user->hasPermissionTo('qc.view') || $user->hasRole(['admin', 'supervisor', 'qc_inspector']); }
    public function view(User $user, QcReview $qc) { return $user->hasPermissionTo('qc.view') || $user->hasRole(['admin', 'supervisor', 'qc_inspector']); }
    public function create(User $user) { return $user->hasPermissionTo('qc.create') || $user->hasRole(['admin', 'supervisor', 'qc_inspector']); }
    public function update(User $user, QcReview $qc) { return $user->hasPermissionTo('qc.review') || $user->hasPermissionTo('qc.create') || $user->hasRole(['admin', 'supervisor', 'qc_inspector']); }
    public function review(User $user, QcReview $qc) { return $user->hasPermissionTo('qc.review') || $user->hasRole(['admin', 'supervisor', 'qc_inspector']); }
    public function sign(User $user, QcReview $qc) { return $user->hasPermissionTo('qc.sign') || $user->hasRole(['admin', 'supervisor', 'qc_inspector']); }
    public function finalize(User $user, QcReview $qc) { return $user->hasPermissionTo('qc.sign') || $user->hasPermissionTo('qc.review') || $user->hasRole(['admin', 'supervisor', 'qc_inspector']); }
}

