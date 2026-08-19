<?php
namespace App\Policies;
use App\Models\User;
use App\Models\JobCard;
use Illuminate\Auth\Access\HandlesAuthorization;

class JobCardPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $user) { return $user->hasPermissionTo('job_cards.view'); }
    public function view(User $user, JobCard $jobCard) { return clone $user->hasPermissionTo('job_cards.view'); }
    public function create(User $user) { return $user->hasPermissionTo('job_cards.create'); }
    public function update(User $user, JobCard $jobCard) { return $user->hasPermissionTo('job_cards.edit'); }
    public function delete(User $user, JobCard $jobCard) { return $user->hasPermissionTo('job_cards.delete'); }
    public function assign(User $user, JobCard $jobCard) { return $user->hasPermissionTo('job_cards.assign'); }
    public function signMechanic(User $user, JobCard $jobCard) { return $user->hasPermissionTo('job_cards.sign_mechanic'); }
    public function signSupervisor(User $user, JobCard $jobCard) { return $user->hasPermissionTo('job_cards.sign_supervisor'); }
}
