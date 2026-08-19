<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\InventoryItem;
use App\Repositories\Contracts\InventoryItemRepositoryInterface;
use App\Http\Requests\Api\V1\StoreInventoryItemRequest;
use App\Http\Requests\Api\V1\UpdateInventoryItemRequest;
use App\Http\Resources\Api\V1\InventoryItemResource;
use Illuminate\Http\Request;

class InventoryController extends Controller {
    public function __construct(private InventoryItemRepositoryInterface $repository) {}
    public function index(Request $request) {
        $this->authorize('viewAny', InventoryItem::class);
        return InventoryItemResource::collection($this->repository->paginate($request->get('per_page', 15), $request->all()));
    }
    public function show(InventoryItem $model) {
        $this->authorize('view', $model);
        return new InventoryItemResource($model);
    }
    public function store(StoreInventoryItemRequest $request) {
        $this->authorize('create', InventoryItem::class);
        $model = $this->repository->create($request->validated());
        return (new InventoryItemResource($model))->response()->setStatusCode(201);
    }
    public function update(UpdateInventoryItemRequest $request, InventoryItem $model) {
        $this->authorize('update', $model);
        $model = $this->repository->update($model->id, $request->validated());
        return new InventoryItemResource($model);
    }
    public function destroy(InventoryItem $model) {
        $this->authorize('delete', $model);
        $this->repository->delete($model->id);
        return response()->json(null, 204);
    }
}
