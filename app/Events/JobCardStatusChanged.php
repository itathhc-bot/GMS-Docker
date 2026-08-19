<?php
namespace App\Events;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
class JobCardStatusChanged implements ShouldBroadcast {
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public $jobCard;
    public function __construct($jobCard) { $this->jobCard = $jobCard; }
    public function broadcastOn() { return new PrivateChannel('job-cards'); }
}
