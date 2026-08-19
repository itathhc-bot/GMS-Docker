<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Jobs\CleanupExpiredScanSessions;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

Schedule::job(new CleanupExpiredScanSessions)->everyFiveMinutes();
Schedule::call(function () {
    app(\App\Services\ExportService::class)->cleanupOldExports();
})->weekly();
