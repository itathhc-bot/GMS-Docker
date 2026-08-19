<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Repositories\Contracts\PurchaseOrderRepositoryInterface;
use App\Http\Requests\Api\V1\StorePurchaseOrderRequest;
use App\Http\Requests\Api\V1\UpdatePurchaseOrderRequest;
use App\Http\Resources\Api\V1\PurchaseOrderResource;
use Illuminate\Http\Request;

class PurchaseOrderController extends Controller {
    public function __construct(private PurchaseOrderRepositoryInterface $repository) {}
    public function index(Request $request) {
        $this->authorize('viewAny', PurchaseOrder::class);
        return PurchaseOrderResource::collection($this->repository->paginate($request->get('per_page', 15), $request->all()));
    }
    public function show(PurchaseOrder $model) {
        $this->authorize('view', $model);
        return new PurchaseOrderResource($model);
    }
    public function store(StorePurchaseOrderRequest $request) {
        $this->authorize('create', PurchaseOrder::class);
        $model = $this->repository->create($request->validated());
        return (new PurchaseOrderResource($model))->response()->setStatusCode(201);
    }
    public function update(UpdatePurchaseOrderRequest $request, PurchaseOrder $model) {
        $this->authorize('update', $model);
        $model = $this->repository->update($model->id, $request->validated());
        return new PurchaseOrderResource($model);
    }
    public function destroy(PurchaseOrder $model) {
        $this->authorize('delete', $model);
        $this->repository->delete($model->id);
        return response()->json(null, 204);
    }
}
