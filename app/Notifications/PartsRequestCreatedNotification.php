<?php

namespace App\Notifications;

use App\Models\PartsRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PartsRequestCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public PartsRequest $partsRequest) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('New Parts Request Awaiting Approval: ' . $this->partsRequest->request_number)
            ->line('A new parts request has been submitted and is awaiting Supervisor Approval.')
            ->line('Request Number: ' . $this->partsRequest->request_number)
            ->line('Part Name: ' . $this->partsRequest->part_name)
            ->line('Quantity: ' . $this->partsRequest->quantity)
            ->line('Urgency: ' . ($this->partsRequest->urgency ?? 'Normal'))
            ->action('Review & Approve', url('/approvals/parts/' . $this->partsRequest->id));
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'parts_created',
            'parts_request_id' => $this->partsRequest->id,
            'message' => 'New parts request ' . $this->partsRequest->request_number . ' awaiting approval.',
        ];
    }
}
