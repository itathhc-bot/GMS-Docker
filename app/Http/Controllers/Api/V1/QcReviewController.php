<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\FinalizeQcReviewRequest;
use App\Http\Requests\Api\V1\StoreQcReviewRequest;
use App\Models\QcReview;
use App\Repositories\Interfaces\QcReviewRepositoryInterface;
use App\Services\QcService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QcReviewController extends Controller
{
    public function __construct(
        private QcService $qcService,
        private QcReviewRepositoryInterface $repo
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', QcReview::class);

        $filters = $request->only(['status', 'job_card_id']);
        $reviews = $this->repo->paginate(15, $filters);

        return response()->json($reviews);
    }

    public function show(QcReview $qcReview): JsonResponse
    {
        $this->authorize('view', $qcReview);
        
        $qcReview->load(['checklistItems', 'inspector', 'jobCard']);

        return response()->json($qcReview);
    }

    public function store(StoreQcReviewRequest $request): JsonResponse
    {
        $this->authorize('create', QcReview::class);

        try {
            $data = $request->validated();
            $data['inspector_id'] = $request->user()->id;
            
            $qcReview = $this->repo->create($data);

            return response()->json($qcReview, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create QC review: ' . $e->getMessage()], 500);
        }
    }

    public function updateChecklist(Request $request, QcReview $qcReview): JsonResponse
    {
        $this->authorize('update', $qcReview);

        $request->validate([
            'checklist_items' => 'required|array',
            'checklist_items.*.id' => 'required|exists:checklist_items,id',
            'checklist_items.*.is_passed' => 'required|boolean',
            'checklist_items.*.notes' => 'nullable|string',
        ]);

        try {
            foreach ($request->checklist_items as $item) {
                // Update checklist item logic using repo or direct update
                $qcReview->checklistItems()->where('id', $item['id'])->update([
                    'is_passed' => $item['is_passed'],
                    'notes' => $item['notes'] ?? null,
                ]);
            }
            return response()->json(['message' => 'Checklist updated successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update checklist: ' . $e->getMessage()], 500);
        }
    }

    public function finalize(FinalizeQcReviewRequest $request, QcReview $qcReview): JsonResponse
    {
        $this->authorize('finalize', $qcReview);

        try {
            $data = $request->validated();
            $result = $this->qcService->finalizeReview($qcReview, $data);
            
            return response()->json($result);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to finalize QC review: ' . $e->getMessage()], 500);
        }
    }
}
