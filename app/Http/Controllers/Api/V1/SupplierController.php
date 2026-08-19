<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Supplier;
use App\Repositories\Contracts\SupplierRepositoryInterface;
use App\Http\Requests\Api\V1\StoreSupplierRequest;
use App\Http\Requests\Api\V1\UpdateSupplierRequest;
use App\Http\Resources\Api\V1\SupplierResource;
use Illuminate\Http\Request;

class SupplierController extends Controller {
    public function __construct(private SupplierRepositoryInterface $repository) {}
    public function index(Request $request) {
        $this->authorize('viewAny', Supplier::class);
        return SupplierResource::collection($this->repository->paginate($request->get('per_page', 15), $request->all()));
    }
    public function show(Supplier $model) {
        $this->authorize('view', $model);
        return new SupplierResource($model);
    }
    public function store(StoreSupplierRequest $request) {
        $this->authorize('create', Supplier::class);
        $model = $this->repository->create($request->validated());
        return (new SupplierResource($model))->response()->setStatusCode(201);
    }
    public function update(UpdateSupplierRequest $request, Supplier $model) {
        $this->authorize('update', $model);
        $model = $this->repository->update($model->id, $request->validated());
        return new SupplierResource($model);
    }
    public function destroy(Supplier $model) {
        $this->authorize('delete', $model);
        $this->repository->delete($model->id);
        return response()->json(null, 204);
    }
}
