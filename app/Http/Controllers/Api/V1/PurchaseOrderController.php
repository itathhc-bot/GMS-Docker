<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Repositories\Contracts\PurchaseOrderRepositoryInterface;
use App\Http\Requests\Api\V1\StorePurchaseOrderRequest;
use App\Http\Requests\Api\V1\UpdatePurchaseOrderRequest;
use App\Http\Resources\Api\V1\PurchaseOrderResource;
use App\Services\PurchaseOrderService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PurchaseOrderController extends Controller
{
    public function __construct(
        private PurchaseOrderRepositoryInterface $repository,
        private PurchaseOrderService $service
    ) {}

    public function index(Request $request)
    {
        $this->authorize('viewAny', PurchaseOrder::class);
        return PurchaseOrderResource::collection(
            $this->repository->paginate($request->get('per_page', 15), $request->all())
        );
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        $this->authorize('view', $purchaseOrder);
        return new PurchaseOrderResource($purchaseOrder->load(['supplier', 'items', 'requestedByUser.profile']));
    }

    public function store(StorePurchaseOrderRequest $request)
    {
        $this->authorize('create', PurchaseOrder::class);

        try {
            $actorId = $request->user()->id;
            $po = $this->service->create($request->validated(), $actorId);
            return (new PurchaseOrderResource($po))->response()->setStatusCode(201);
        } catch (\Exception $e) {
            Log::error('Failed to create purchase order: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to create purchase order: ' . $e->getMessage()], 500);
        }
    }

    public function update(UpdatePurchaseOrderRequest $request, PurchaseOrder $purchaseOrder)
    {
        $this->authorize('update', $purchaseOrder);
        $model = $this->repository->update($purchaseOrder->id, $request->validated());
        return new PurchaseOrderResource($model->load(['supplier', 'items', 'requestedByUser.profile']));
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        $this->authorize('delete', $purchaseOrder);
        $this->repository->delete($purchaseOrder->id);
        return response()->json(null, 204);
    }

    public function approveManager(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->authorize('approveManager', $purchaseOrder);

        try {
            $notes = $request->input('notes', $request->input('manager_notes'));
            $actorId = $request->user()->id;
            $po = $this->service->approveManager($purchaseOrder->id, $notes, $actorId);
            return response()->json(new PurchaseOrderResource($po));
        } catch (\Exception $e) {
            Log::error('Failed to approve PO by manager: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to approve PO: ' . $e->getMessage()], 500);
        }
    }

    public function approveFinance(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->authorize('approveFinance', $purchaseOrder);

        try {
            $notes = $request->input('notes', $request->input('finance_notes'));
            $actorId = $request->user()->id;
            $po = $this->service->approveFinance($purchaseOrder->id, $notes, $actorId);
            return response()->json(new PurchaseOrderResource($po));
        } catch (\Exception $e) {
            Log::error('Failed to approve PO by finance: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to approve PO: ' . $e->getMessage()], 500);
        }
    }

    public function reject(Request $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $this->authorize('reject', $purchaseOrder);

        try {
            $reason = $request->input('reason', $request->input('rejected_reason', 'Rejected'));
            $actorId = $request->user()->id;
            $po = $this->service->reject($purchaseOrder->id, $reason, $actorId);
            return response()->json(new PurchaseOrderResource($po));
        } catch (\Exception $e) {
            Log::error('Failed to reject PO: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['message' => 'Failed to reject PO: ' . $e->getMessage()], 500);
        }
    }
}

