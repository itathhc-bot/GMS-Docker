<?php

namespace App\Listeners;

use App\Events\PartsRequestStatusChanged;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendPartsStatusNotification implements ShouldQueue
{
    public function __construct(private NotificationService $notificationService) {}

    public function handle(PartsRequestStatusChanged $event): void
    {
        $status = strtolower((string) $event->partsRequest->status);
        if ($status === 'approved') {
            $this->notificationService->notifyPartsApproved($event->partsRequest);
        } elseif ($status === 'rejected') {
            $this->notificationService->notifyPartsRejected($event->partsRequest);
        }
    }
}
