<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PartsRequest;
use App\Repositories\Contracts\PartsRequestRepositoryInterface;
use App\Http\Requests\Api\V1\StorePartsRequestRequest;
use App\Http\Requests\Api\V1\UpdatePartsRequestRequest;
use App\Http\Resources\Api\V1\PartsRequestResource;
use App\Services\PartsApprovalService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PartsRequestController extends Controller
{
    public function __construct(
        private PartsRequestRepositoryInterface $repository,
        private PartsApprovalService $approvalService
    ) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', PartsRequest::class);
        return PartsRequestResource::collection(
            $this->repository->paginate($request->get('per_page', 15), $request->all())
        );
    }

    public function show(PartsRequest $partsRequest)
    {
        $this->authorize('view', $partsRequest);
        return new PartsRequestResource($partsRequest->load(['jobCard.vehicle', 'requestedBy.profile', 'approvedBy', 'issuedBy']));
    }

    public function store(StorePartsRequestRequest $request)
    {
        $this->authorize('create', PartsRequest::class);
        $data = $request->validated();
        if (empty($data['request_number'])) {
            $prefix = config('garage.request_number_prefix', 'PR');
            $data['request_number'] = $prefix . '-' . now()->format('Ymd') . '-' . strtoupper(\Illuminate\Support\Str::random(4));
        }
        if (empty($data['requested_by'])) {
            $data['requested_by'] = $request->user()->id;
        }
        $model = $this->repository->create($data);
        try {
            app(\App\Services\NotificationService::class)->notifyPartsRequested($model);
        } catch (\Throwable $e) {
            Log::warning('Failed sending parts requested notification: ' . $e->getMessage());
        }
        return (new PartsRequestResource($model->load(['jobCard.vehicle', 'requestedBy.profile'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdatePartsRequestRequest $request, PartsRequest $partsRequest)
    {
        $this->authorize('update', $partsRequest);
        $model = $this->repository->update($partsRequest->id, $request->validated());
        return new PartsRequestResource($model->load(['jobCard.vehicle', 'requestedBy.profile']));
    }

    public function destroy(PartsRequest $partsRequest)
    {
        $this->authorize('delete', $partsRequest);
        $this->repository->delete($partsRequest->id);
        return response()->json(null, 204);
    }

    public function approve(Request $request, PartsRequest $partsRequest): JsonResponse
    {
        $this->authorize('approve', $partsRequest);

        try {
            $remarks = $request->input('remarks', $request->input('supervisor_remarks'));
            $actorId = $request->user()->id;
            $approved = $this->approvalService->approve($partsRequest->id, $actorId, $remarks);

            return response()->json(
                new PartsRequestResource($approved->load(['jobCard.vehicle', 'requestedBy.profile', 'approvedBy']))
            );
        } catch (\Exception $e) {
            Log::error('Failed to approve parts request: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to approve request: ' . $e->getMessage()], 500);
        }
    }

    public function reject(Request $request, PartsRequest $partsRequest): JsonResponse
    {
        $this->authorize('reject', $partsRequest);

        try {
            $reason = $request->input('reason', $request->input('rejection_note', 'Rejected by supervisor'));
            $actorId = $request->user()->id;
            $rejected = $this->approvalService->reject($partsRequest->id, $reason, $actorId);

            return response()->json(
                new PartsRequestResource($rejected->load(['jobCard.vehicle', 'requestedBy.profile']))
            );
        } catch (\Exception $e) {
            Log::error('Failed to reject parts request: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to reject request: ' . $e->getMessage()], 500);
        }
    }

    public function issue(Request $request, PartsRequest $partsRequest): JsonResponse
    {
        $this->authorize('issue', $partsRequest);

        try {
            $data = $request->all();
            $actorId = $request->user()->id;
            $issued = $this->approvalService->issue($partsRequest->id, $data, $actorId);

            return response()->json(
                new PartsRequestResource($issued->load(['jobCard.vehicle', 'requestedBy.profile', 'issuedBy']))
            );
        } catch (\Exception $e) {
            Log::error('Failed to issue parts request: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to issue request: ' . $e->getMessage()], 500);
        }
    }
}

