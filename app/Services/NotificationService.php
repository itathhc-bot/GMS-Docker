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
        $mechanic = $jobCard->assignedMechanic ?? $jobCard->assignedUser;
        if ($mechanic) {
            $mechanic->notify(new JobCardAssignedNotification($jobCard));
        }
    }

    public function notifyPOApprovedManager(PurchaseOrder $po): void
    {
        $users = User::permission('po.approve_finance')->get();
        if ($users->isEmpty()) {
            $users = User::role('admin')->get();
        }
        foreach ($users as $user) {
            $user->notify(new PurchaseOrderApprovedNotification($po, 'manager'));
        }
    }

    public function notifyPOApprovedFinance(PurchaseOrder $po): void
    {
        if ($po->requestedByUser) {
            $po->requestedByUser->notify(new PurchaseOrderApprovedNotification($po, 'finance'));
        }
        $admins = User::role('admin')->get();
        foreach ($admins as $admin) {
            if (!$po->requested_by || $admin->id !== $po->requested_by) {
                $admin->notify(new PurchaseOrderApprovedNotification($po, 'finance'));
            }
        }
    }
}
