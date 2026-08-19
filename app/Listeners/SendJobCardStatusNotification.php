<?php

namespace App\Listeners;

use App\Events\JobCardStatusChanged;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;

class SendJobCardStatusNotification implements ShouldQueue
{
    public function __construct(private NotificationService $notificationService) {}

    public function handle(JobCardStatusChanged $event): void
    {
        if ($event->jobCard->status === 'In Progress') {
            $this->notificationService->notifyJobAssigned($event->jobCard);
        }
    }
}
