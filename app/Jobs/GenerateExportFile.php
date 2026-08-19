<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\ExportService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class GenerateExportFile implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $type,
        public array $filters,
        public string $userId
    ) {
        $this->onQueue('exports');
    }

    public function handle(ExportService $service): void
    {
        $path = '';

        if ($this->type === 'parts_requests') {
            $path = $service->exportPartsRequestsToCsv($this->filters);
        } elseif ($this->type === 'job_cards') {
            $path = $service->exportJobCardsToCsv($this->filters);
        }

        if ($path) {
            $user = User::find($this->userId);
            if ($user) {
                // Dispatch notification to user
                // $user->notify(new ExportCompletedNotification($path));
            }
        }
    }
}
