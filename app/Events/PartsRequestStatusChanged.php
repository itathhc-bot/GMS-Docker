<?php

namespace App\Events;

use App\Models\PartsRequest;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PartsRequestStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public PartsRequest $partsRequest) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('parts-requests'),
        ];
    }
}
