<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Driver;
use App\Repositories\Contracts\DriverRepositoryInterface;
use App\Http\Requests\Api\V1\StoreDriverRequest;
use App\Http\Requests\Api\V1\UpdateDriverRequest;
use App\Http\Resources\Api\V1\DriverResource;
use Illuminate\Http\Request;

class DriverController extends Controller {
    public function __construct(private DriverRepositoryInterface $repository) {}
    public function index(Request $request) {
        $this->authorize('viewAny', Driver::class);
        return DriverResource::collection($this->repository->paginate($request->get('per_page', 15), $request->all()));
    }
    public function show(Driver $model) {
        $this->authorize('view', $model);
        return new DriverResource($model);
    }
    public function store(StoreDriverRequest $request) {
        $this->authorize('create', Driver::class);
        $model = $this->repository->create($request->validated());
        return (new DriverResource($model))->response()->setStatusCode(201);
    }
    public function update(UpdateDriverRequest $request, Driver $model) {
        $this->authorize('update', $model);
        $model = $this->repository->update($model->id, $request->validated());
        return new DriverResource($model);
    }
    public function destroy(Driver $model) {
        $this->authorize('delete', $model);
        $this->repository->delete($model->id);
        return response()->json(null, 204);
    }
}
