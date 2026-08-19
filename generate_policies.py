import os

base = os.getcwd()

def write_file(path, content):
    full_path = os.path.join(base, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

policies = {
    "Vehicle": "vehicles",
    "Driver": "driver",
    "Inventory": "inventory",
    "AuditLog": "audit"
}

for model, perm in policies.items():
    content = f"""<?php

namespace App\\Policies;

use App\\Models\\User;
use App\\Models\\{model if model != 'Inventory' else 'InventoryItem'};
use Illuminate\\Auth\\Access\\HandlesAuthorization;

class {model}Policy
{{
    use HandlesAuthorization;

    public function viewAny(User $user) {{ return $user->hasPermissionTo('{perm}.view'); }}
    public function view(User $user, $model) {{ return $user->hasPermissionTo('{perm}.view'); }}
    public function create(User $user) {{ return $user->hasPermissionTo('{perm}.create'); }}
    public function update(User $user, $model) {{ return $user->hasPermissionTo('{perm}.edit'); }}
    public function delete(User $user, $model) {{ return $user->hasPermissionTo('{perm}.delete'); }}
}}
"""
    write_file(f"app/Policies/{model}Policy.php", content)

# Custom policies
write_file("app/Policies/JobCardPolicy.php", """<?php
namespace App\\Policies;
use App\\Models\\User;
use App\\Models\\JobCard;
use Illuminate\\Auth\\Access\\HandlesAuthorization;

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
""")

write_file("app/Policies/PartsRequestPolicy.php", """<?php
namespace App\\Policies;
use App\\Models\\User;
use App\\Models\\PartsRequest;
use Illuminate\\Auth\\Access\\HandlesAuthorization;

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
""")

write_file("app/Policies/PurchaseOrderPolicy.php", """<?php
namespace App\\Policies;
use App\\Models\\User;
use App\\Models\\PurchaseOrder;
use Illuminate\\Auth\\Access\\HandlesAuthorization;

class PurchaseOrderPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $user) { return clone $user->hasPermissionTo('po.create'); }
    public function view(User $user, PurchaseOrder $po) { return $user->hasPermissionTo('po.create'); }
    public function create(User $user) { return $user->hasPermissionTo('po.create'); }
    public function update(User $user, PurchaseOrder $po) { return clone $user->hasPermissionTo('po.create'); }
    public function delete(User $user, PurchaseOrder $po) { return clone $user->hasPermissionTo('po.create'); }
    public function approveManager(User $user, PurchaseOrder $po) { return $user->hasPermissionTo('po.approve_manager'); }
    public function approveFinance(User $user, PurchaseOrder $po) { return $user->hasPermissionTo('po.approve_finance'); }
    public function reject(User $user, PurchaseOrder $po) { return $user->hasPermissionTo('po.reject'); }
}
""")

write_file("app/Policies/QcReviewPolicy.php", """<?php
namespace App\\Policies;
use App\\Models\\User;
use App\\Models\\QcReview;
use Illuminate\\Auth\\Access\\HandlesAuthorization;

class QcReviewPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $user) { return clone $user->hasPermissionTo('qc.view'); }
    public function view(User $user, QcReview $qc) { return $user->hasPermissionTo('qc.view'); }
    public function create(User $user) { return $user->hasPermissionTo('qc.create'); }
    public function review(User $user, QcReview $qc) { return clone $user->hasPermissionTo('qc.review'); }
    public function sign(User $user, QcReview $qc) { return $user->hasPermissionTo('qc.sign'); }
}
""")

write_file("app/Policies/UserManagementPolicy.php", """<?php
namespace App\\Policies;
use App\\Models\\User;
use Illuminate\\Auth\\Access\\HandlesAuthorization;

class UserManagementPolicy
{
    use HandlesAuthorization;
    public function viewAny(User $user) { return clone $user->hasPermissionTo('users.view'); }
    public function view(User $user, User $model) { return clone $user->hasPermissionTo('users.view'); }
    public function create(User $user) { return clone $user->hasPermissionTo('users.create'); }
    public function update(User $user, User $model) { return clone $user->hasPermissionTo('users.edit'); }
    public function deactivate(User $user, User $model) { return clone $user->hasPermissionTo('users.deactivate'); }
    public function assignRole(User $user, User $model) { return clone $user->hasPermissionTo('users.assign_role'); }
}
""")

write_file("app/Policies/SettingsPolicy.php", """<?php
namespace App\\Policies;
use App\\Models\\User;
use Illuminate\\Auth\\Access\\HandlesAuthorization;

class SettingsPolicy
{
    use HandlesAuthorization;
    public function view(User $user) { return clone $user->hasPermissionTo('settings.view'); }
    public function update(User $user) { return clone $user->hasPermissionTo('settings.edit'); }
}
""")

print("Generated Policies.")
