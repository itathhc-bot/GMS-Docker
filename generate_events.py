import os

base = os.getcwd()

def write_file(path, content):
    full_path = os.path.join(base, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

events = {
    "JobCardStatusChanged": """<?php
namespace App\\Events;
use Illuminate\\Broadcasting\\InteractsWithSockets;
use Illuminate\\Broadcasting\\PrivateChannel;
use Illuminate\\Contracts\\Broadcasting\\ShouldBroadcast;
use Illuminate\\Foundation\\Events\\Dispatchable;
use Illuminate\\Queue\\SerializesModels;
class JobCardStatusChanged implements ShouldBroadcast {
    use Dispatchable, InteractsWithSockets, SerializesModels;
    public $jobCard;
    public function __construct($jobCard) { $this->jobCard = $jobCard; }
    public function broadcastOn() { return new PrivateChannel('job-cards'); }
}
""",
}
for name, code in events.items():
    write_file(f"app/Events/{name}.php", code)

jobs = {
    "ProcessOcrScan": """<?php
namespace App\\Jobs;
use Illuminate\\Bus\\Queueable;
use Illuminate\\Contracts\\Queue\\ShouldQueue;
use Illuminate\\Foundation\\Bus\\Dispatchable;
use Illuminate\\Queue\\InteractsWithQueue;
use Illuminate\\Queue\\SerializesModels;
use App\\Services\\OcrService;
class ProcessOcrScan implements ShouldQueue {
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    public function handle(OcrService $service) {
        // Logic handled here
    }
}
""",
}
for name, code in jobs.items():
    write_file(f"app/Jobs/{name}.php", code)

app_service_provider = """<?php
namespace App\\Providers;

use Illuminate\\Support\\ServiceProvider;
use Illuminate\\Support\\Facades\\Gate;
use Illuminate\\Support\\Facades\\URL;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $repos = ['Vehicle', 'Driver', 'JobCard', 'PartsRequest', 'PurchaseOrder', 'Supplier', 'InventoryItem', 'QcReview', 'ScanSession', 'AuditLog'];
        foreach ($repos as $repo) {
            $this->app->bind(
                "App\\\\Repositories\\\\Contracts\\\\{$repo}RepositoryInterface",
                "App\\\\Repositories\\\\Eloquent\\\\{$repo}Repository"
            );
        }
    }

    public function boot(): void
    {
        if($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
"""
write_file("app/Providers/AppServiceProvider.php", app_service_provider)

print("Generated Events, Jobs and AppServiceProvider.")
