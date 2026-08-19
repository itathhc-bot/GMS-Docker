<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Repositories\Contracts\VehicleRepositoryInterface;
use App\Http\Requests\Api\V1\StoreVehicleRequest;
use App\Http\Requests\Api\V1\UpdateVehicleRequest;
use App\Http\Resources\Api\V1\VehicleResource;
use Illuminate\Http\Request;

class VehicleController extends Controller {
    public function __construct(private VehicleRepositoryInterface $repository) {}
    public function index(Request $request) {
        $this->authorize('viewAny', Vehicle::class);
        return VehicleResource::collection($this->repository->paginate($request->get('per_page', 15), $request->all()));
    }
    public function show(Vehicle $model) {
        $this->authorize('view', $model);
        return new VehicleResource($model);
    }
    public function store(StoreVehicleRequest $request) {
        $this->authorize('create', Vehicle::class);
        $model = $this->repository->create($request->validated());
        return (new VehicleResource($model))->response()->setStatusCode(201);
    }
    public function update(UpdateVehicleRequest $request, Vehicle $model) {
        $this->authorize('update', $model);
        $model = $this->repository->update($model->id, $request->validated());
        return new VehicleResource($model);
    }
    public function destroy(Vehicle $model) {
        $this->authorize('delete', $model);
        $this->repository->delete($model->id);
        return response()->json(null, 204);
    }
}
