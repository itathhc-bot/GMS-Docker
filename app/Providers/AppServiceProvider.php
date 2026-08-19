<?php
namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $repos = ['Vehicle', 'Driver', 'JobCard', 'PartsRequest', 'PurchaseOrder', 'Supplier', 'InventoryItem', 'QcReview', 'ScanSession', 'AuditLog'];
        foreach ($repos as $repo) {
            $this->app->bind(
                "App\\Repositories\\Contracts\\{$repo}RepositoryInterface",
                "App\\Repositories\\Eloquent\\{$repo}Repository"
            );
        }
    }

    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });
        RateLimiter::for('scan', function (Request $request) {
            return Limit::perMinute(30)->by($request->ip());
        });
        RateLimiter::for('metrics', function (Request $request) {
            return Limit::perMinute(60)->by($request->ip());
        });
        
        Gate::guessPolicyNamesUsing(function (string $modelClass) {
            return 'App\\Policies\\' . class_basename($modelClass) . 'Policy';
        });

        if($this->app->environment('production')) {
            URL::forceScheme('https');
        }
    }
}
