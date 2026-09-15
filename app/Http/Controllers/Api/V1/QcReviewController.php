<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\FinalizeQcReviewRequest;
use App\Http\Requests\Api\V1\StoreQcReviewRequest;
use App\Models\QcReview;
use App\Repositories\Contracts\QcReviewRepositoryInterface;
use App\Services\QcService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class QcReviewController extends Controller
{
    public function __construct(
        private QcService $qcService,
        private QcReviewRepositoryInterface $repo
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', QcReview::class);

        $query = QcReview::with(['checklistItems', 'inspector.profile', 'jobCard.vehicle']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('job_card_id')) {
            $query->where('job_card_id', $request->job_card_id);
        }

        $query->latest();

        if ($request->has('page') || $request->has('per_page')) {
            $perPage = (int) $request->input('per_page', 15);
            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
    }

    public function show(QcReview $qcReview): JsonResponse
    {
        $this->authorize('view', $qcReview);
        
        $qcReview->load(['checklistItems', 'inspector.profile', 'jobCard.vehicle']);

        return response()->json($qcReview);
    }

    public function store(StoreQcReviewRequest $request): JsonResponse
    {
        $this->authorize('create', QcReview::class);

        try {
            $data = $request->validated();
            $inspectorId = $request->user()?->id;
            
            $qcReview = $this->qcService->createReview($data['job_card_id'], $inspectorId);

            if (!empty($data['status'])) {
                $qcReview->update(['status' => $data['status']]);
            }
            if (!empty($data['remarks']) || !empty($data['notes'])) {
                $qcReview->update(['remarks' => $data['remarks'] ?? $data['notes']]);
            }

            return response()->json($qcReview->fresh(['checklistItems', 'inspector', 'jobCard']), 201);
        } catch (\Exception $e) {
            Log::error('Failed to create QC review: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to create QC review: ' . $e->getMessage()], 500);
        }
    }

    public function updateChecklist(Request $request, QcReview $qcReview): JsonResponse
    {
        $this->authorize('update', $qcReview);

        $items = $request->input('items', $request->input('checklist_items', []));

        if (!is_array($items)) {
            return response()->json(['message' => 'Checklist items must be an array'], 422);
        }

        try {
            $review = $this->qcService->updateChecklist($qcReview, $items);
            return response()->json([
                'message' => 'Checklist updated successfully',
                'items' => $review->checklistItems,
            ]);
        } catch (\Exception $e) {
            Log::error('Failed to update checklist: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to update checklist: ' . $e->getMessage()], 500);
        }
    }

    public function finalize(FinalizeQcReviewRequest $request, QcReview $qcReview): JsonResponse
    {
        $this->authorize('finalize', $qcReview);

        try {
            $data = $request->validated();
            $actorId = $request->user()?->id;
            $result = $this->qcService->finalizeReview($qcReview, $data, null, $actorId);
            
            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Failed to finalize QC review: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to finalize QC review: ' . $e->getMessage()], 500);
        }
    }
}

