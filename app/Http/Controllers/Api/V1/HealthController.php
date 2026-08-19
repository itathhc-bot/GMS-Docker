<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;

class HealthController extends Controller {
    public function check() {
        return response()->json([
            'db' => DB::connection()->getPdo() ? 'ok' : 'error',
            'redis' => Redis::connection() ? 'ok' : 'error',
            'storage' => Storage::disk('local')->exists('.') ? 'ok' : 'error',
        ]);
    }
}
