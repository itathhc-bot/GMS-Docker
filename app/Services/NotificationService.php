<?php

namespace App\Services;

use App\Models\JobCard;
use App\Models\PartsRequest;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Notifications\JobCardAssignedNotification;
use App\Notifications\PartsRequestApprovedNotification;
use App\Notifications\PartsRequestRejectedNotification;
use App\Notifications\PurchaseOrderApprovedNotification;

class NotificationService
{
    public function notifyPartsApproved(PartsRequest $request): void
    {
        if ($request->requestedBy) {
            $request->requestedBy->notify(new PartsRequestApprovedNotification($request));
        }
    }

    public function notifyPartsRejected(PartsRequest $request): void
    {
        if ($request->requestedBy) {
            $request->requestedBy->notify(new PartsRequestRejectedNotification($request));
        }
    }

    public function notifyJobAssigned(JobCard $jobCard): void
    {
        if ($jobCard->assignedMechanic) {
            $jobCard->assignedMechanic->notify(new JobCardAssignedNotification($jobCard));
        }
    }

    public function notifyPOApprovedManager(PurchaseOrder $po): void
    {
        $managers = User::role('manager')->get();
        foreach ($managers as $manager) {
            $manager->notify(new PurchaseOrderApprovedNotification($po, 'manager'));
        }
    }

    public function notifyPOApprovedFinance(PurchaseOrder $po): void
    {
        $financeUsers = User::role('finance')->get();
        foreach ($financeUsers as $user) {
            $user->notify(new PurchaseOrderApprovedNotification($po, 'finance'));
        }
    }
}
