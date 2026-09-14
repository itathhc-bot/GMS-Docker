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

    public function viewAny(User $user) { return $user->hasPermissionTo('qc.view'); }
    public function view(User $user, QcReview $qc) { return $user->hasPermissionTo('qc.view'); }
    public function create(User $user) { return $user->hasPermissionTo('qc.create'); }
    public function review(User $user, QcReview $qc) { return $user->hasPermissionTo('qc.review'); }
    public function sign(User $user, QcReview $qc) { return $user->hasPermissionTo('qc.sign'); }
}
