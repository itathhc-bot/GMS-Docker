<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Repositories\Interfaces\AuditLogRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function __construct(private AuditLogRepositoryInterface $repo) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', \App\Models\AuditLog::class);

        try {
            $filters = $request->only(['log_type', 'action', 'actor_user_id', 'entity_type', 'date_from', 'date_to']);
            $logs = $this->repo->paginate(15, $filters);
            return response()->json($logs);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to load audit logs: ' . $e->getMessage()], 500);
        }
    }
}
