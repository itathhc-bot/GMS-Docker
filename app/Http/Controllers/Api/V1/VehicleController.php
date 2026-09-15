<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\Vehicle;
use App\Repositories\Contracts\VehicleRepositoryInterface;
use App\Http\Requests\Api\V1\StoreVehicleRequest;
use App\Http\Requests\Api\V1\UpdateVehicleRequest;
use App\Http\Resources\Api\V1\VehicleResource;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class VehicleController extends Controller {
    public function __construct(private VehicleRepositoryInterface $repository) {}

    public function index(Request $request) {
        $this->authorize('viewAny', Vehicle::class);
        $perPage = (int) $request->get('per_page', 500);
        return VehicleResource::collection($this->repository->paginate($perPage, $request->all()));
    }

    public function show(Request $request, Vehicle $vehicle) {
        if (!$vehicle->exists) {
            $id = $request->route('vehicle');
            $vehicle = Vehicle::findOrFail($id);
        }
        $this->authorize('view', $vehicle);
        return new VehicleResource($vehicle->load('driver'));
    }

    public function store(StoreVehicleRequest $request) {
        $this->authorize('create', Vehicle::class);
        $vehicle = Vehicle::create($request->validated());
        return (new VehicleResource($vehicle->load('driver')))->response()->setStatusCode(201);
    }

    public function update(UpdateVehicleRequest $request, Vehicle $vehicle) {
        if (!$vehicle->exists) {
            $id = $request->route('vehicle');
            $vehicle = Vehicle::findOrFail($id);
        }
        $this->authorize('update', $vehicle);
        $vehicle->update($request->validated());
        return new VehicleResource($vehicle->load('driver'));
    }

    public function destroy(Request $request, Vehicle $vehicle) {
        if (!$vehicle->exists) {
            $id = $request->route('vehicle');
            $vehicle = Vehicle::findOrFail($id);
        }
        $this->authorize('delete', $vehicle);
        $vehicle->delete();
        return response()->json(null, 204);
    }

    public function history(Request $request, Vehicle $vehicle): JsonResponse {
        if (!$vehicle->exists) {
            $id = $request->route('vehicle');
            $vehicle = Vehicle::findOrFail($id);
        }
        $this->authorize('view', $vehicle);
        $history = $vehicle->jobCards()
            ->with(['assignedUser.profile', 'inspections'])
            ->latest()
            ->get();
        return response()->json($history);
    }
}
