<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\PartsRequest;
use App\Repositories\Contracts\PartsRequestRepositoryInterface;
use App\Http\Requests\Api\V1\StorePartsRequestRequest;
use App\Http\Requests\Api\V1\UpdatePartsRequestRequest;
use App\Http\Resources\Api\V1\PartsRequestResource;
use Illuminate\Http\Request;

class PartsRequestController extends Controller {
    public function __construct(private PartsRequestRepositoryInterface $repository) {}
    public function index(Request $request) {
        $this->authorize('viewAny', PartsRequest::class);
        return PartsRequestResource::collection($this->repository->paginate($request->get('per_page', 15), $request->all()));
    }
    public function show(PartsRequest $model) {
        $this->authorize('view', $model);
        return new PartsRequestResource($model);
    }
    public function store(StorePartsRequestRequest $request) {
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
        return (new PartsRequestResource($model))->response()->setStatusCode(201);
    }
    public function update(UpdatePartsRequestRequest $request, PartsRequest $model) {
        $this->authorize('update', $model);
        $model = $this->repository->update($model->id, $request->validated());
        return new PartsRequestResource($model);
    }
    public function destroy(PartsRequest $model) {
        $this->authorize('delete', $model);
        $this->repository->delete($model->id);
        return response()->json(null, 204);
    }
}
