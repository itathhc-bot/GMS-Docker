<?php

namespace App\Notifications;

use App\Models\PartsRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PartsRequestApprovedNotification extends Notification implements ShouldQueue
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
                    ->subject('Parts Request Approved: ' . $this->partsRequest->request_number)
                    ->line('Your parts request has been approved.')
                    ->line('Request Number: ' . $this->partsRequest->request_number)
                    ->line('Part Name: ' . $this->partsRequest->part_name)
                    ->line('Quantity: ' . $this->partsRequest->quantity)
                    ->action('View Request', url('/approvals/parts/' . $this->partsRequest->id));
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'parts_approved',
            'parts_request_id' => $this->partsRequest->id,
            'message' => 'Your parts request ' . $this->partsRequest->request_number . ' has been approved.',
        ];
    }
}
