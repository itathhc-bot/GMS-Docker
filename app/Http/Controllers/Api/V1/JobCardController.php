<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\JobCard;
use App\Services\JobCardService;
use App\Repositories\Contracts\JobCardRepositoryInterface;
use App\Http\Requests\Api\V1\StoreJobCardRequest;
use App\Http\Requests\Api\V1\UpdateJobCardRequest;
use App\Http\Requests\Api\V1\AssignJobCardRequest;
use App\Http\Requests\Api\V1\SignJobCardRequest;
use App\Http\Resources\Api\V1\JobCardResource;
use Illuminate\Http\Request;

class JobCardController extends Controller {
    public function __construct(
        private JobCardRepositoryInterface $repository,
        private JobCardService $service
    ) {}
    public function index(Request $request) {
        $this->authorize('viewAny', JobCard::class);
        return JobCardResource::collection($this->repository->paginate($request->get('per_page', 15), $request->all()));
    }
    public function show(JobCard $jobCard) {
        $this->authorize('view', $jobCard);
        return new JobCardResource($jobCard->load('vehicle', 'assignedUser', 'inspections'));
    }
    public function store(StoreJobCardRequest $request) {
        $this->authorize('create', JobCard::class);
        $jobCard = $this->service->createJobCard($request->validated(), $request->user()->id);
        return (new JobCardResource($jobCard))->response()->setStatusCode(201);
    }
    public function update(UpdateJobCardRequest $request, JobCard $jobCard) {
        $this->authorize('update', $jobCard);
        $updated = $this->repository->update($jobCard->id, $request->validated());
        return new JobCardResource($updated);
    }
    public function destroy(JobCard $jobCard) {
        $this->authorize('delete', $jobCard);
        $this->repository->delete($jobCard->id);
        return response()->json(null, 204);
    }
    public function assign(AssignJobCardRequest $request, JobCard $jobCard) {
        $this->authorize('assign', $jobCard);
        $updated = $this->service->assign($jobCard->id, $request->validated('assigned_to'), $request->user()->id);
        return new JobCardResource($updated);
    }
    public function updateStatus(Request $request, JobCard $jobCard) {
        $this->authorize('update', $jobCard);
        $updated = $this->service->updateStatus($jobCard->id, $request->get('status'), $request->user()->id);
        return new JobCardResource($updated);
    }
    public function signMechanic(SignJobCardRequest $request, JobCard $jobCard) {
        $this->authorize('signMechanic', $jobCard);
        $updated = $this->service->signMechanic($jobCard->id, $request->validated('signature'), $request->user()->id);
        return new JobCardResource($updated);
    }
    public function signSupervisor(SignJobCardRequest $request, JobCard $jobCard) {
        $this->authorize('signSupervisor', $jobCard);
        $updated = $this->service->signSupervisor($jobCard->id, $request->validated('signature'), $request->user()->id);
        return new JobCardResource($updated);
    }
}
