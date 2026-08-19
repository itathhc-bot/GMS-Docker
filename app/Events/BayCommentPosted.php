<?php

namespace App\Events;

use App\Models\BayComment;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class BayCommentPosted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public BayComment $comment,
        public string $bayNumber
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('bay.' . $this->bayNumber),
        ];
    }

    public function broadcastAs(): string
    {
        return 'BayCommentPosted';
    }
}
