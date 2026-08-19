<?php

namespace App\Events;

use App\Models\ScanAttempt;
use App\Models\ScanSession;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ScanSessionUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ScanSession $session,
        public ScanAttempt $attempt
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('scan.' . $this->session->pair_code),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ScanSessionUpdated';
    }
}
