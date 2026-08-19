<?php

namespace App\Notifications;

use App\Models\JobCard;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class JobCardAssignedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public JobCard $jobCard) {}

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
                    ->subject('Job Card Assigned')
                    ->line('A new job card has been assigned to you.')
                    ->line('Job Number: ' . $this->jobCard->job_number)
                    ->line('Vehicle: ' . $this->jobCard->vehicle_id)
                    ->action('View Job Card', url('/job-cards/' . $this->jobCard->id));
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'job_card_assigned',
            'job_card_id' => $this->jobCard->id,
            'message' => 'You have been assigned to job card ' . $this->jobCard->job_number,
        ];
    }
}
