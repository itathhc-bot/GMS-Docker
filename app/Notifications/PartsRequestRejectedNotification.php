<?php

namespace App\Notifications;

use App\Models\PartsRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PartsRequestRejectedNotification extends Notification implements ShouldQueue
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
                    ->subject('Parts Request Rejected')
                    ->line('Your parts request has been rejected.')
                    ->line('Request Number: ' . $this->partsRequest->request_number)
                    ->line('Part Name: ' . $this->partsRequest->part_name)
                    ->line('Reason: ' . ($this->partsRequest->rejection_reason ?? 'Not specified'))
                    ->action('View Request', url('/parts-requests/' . $this->partsRequest->id));
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'parts_rejected',
            'parts_request_id' => $this->partsRequest->id,
            'message' => 'Your parts request ' . $this->partsRequest->request_number . ' has been rejected.',
        ];
    }
}
