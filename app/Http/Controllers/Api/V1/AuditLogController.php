<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Repositories\Contracts\AuditLogRepositoryInterface;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function __construct(private AuditLogRepositoryInterface $repo) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', \App\Models\AuditLog::class);

        try {
            $filters = $request->only(['log_type', 'action', 'actor_user_id', 'entity_type', 'entity_id', 'date_from', 'date_to', 'sort']);
            $limit = (int) $request->input('limit', 15);
            $logs = $this->repo->paginate($limit, $filters);
            return response()->json($logs);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to load audit logs: ' . $e->getMessage()], 500);
        }
    }

    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'log_type'    => 'nullable|string|in:admin,approval',
                'action'      => 'required|string',
                'entity_type' => 'nullable|string',
                'entity_id'   => 'nullable|string',
                'entity_ref'  => 'nullable|string',
                'stage'       => 'nullable|string',
                'reason'      => 'nullable|string',
                'details'     => 'nullable|array',
            ]);

            $user = $request->user();
            $validated['actor_user_id'] = $user?->id;
            $validated['actor_name'] = $user?->name;
            $validated['log_type'] = $validated['log_type'] ?? 'approval';

            $log = $this->repo->create($validated);
            return response()->json($log, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to store audit log: ' . $e->getMessage()], 500);
        }
    }
}
