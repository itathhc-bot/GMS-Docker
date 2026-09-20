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
    public function show(Request $request, JobCard $jobCard) {
        if (!$jobCard->exists) {
            $id = $request->route('job_card') ?? $request->route('jobCard');
            $jobCard = JobCard::findOrFail($id);
        }
        $this->authorize('view', $jobCard);
        return new JobCardResource($jobCard->load('vehicle', 'assignedUser.profile', 'inspections'));
    }
    public function store(StoreJobCardRequest $request) {
        $this->authorize('create', JobCard::class);
        $jobCard = $this->service->createJobCard($request->validated(), $request->user()->id);
        return (new JobCardResource($jobCard->load('vehicle', 'assignedUser.profile', 'inspections')))->response()->setStatusCode(201);
    }
    public function update(UpdateJobCardRequest $request, JobCard $jobCard) {
        if (!$jobCard->exists) {
            $id = $request->route('job_card') ?? $request->route('jobCard');
            $jobCard = JobCard::findOrFail($id);
        }
        $this->authorize('update', $jobCard);
        $data = $request->validated();
        if (isset($data['status'])) {
            $lower = strtolower(trim($data['status']));
            $currentLower = strtolower(trim($jobCard->status ?? ''));
            if (in_array($lower, ['completed', 'closed']) && !in_array($currentLower, ['completed', 'closed'])) {
                $user = $request->user();
                if (!$user->hasRole('admin') && !$user->hasRole('qc_inspector') && !$user->hasPermissionTo('qc.review')) {
                    return response()->json([
                        'message' => 'Only users with QC review permission or administrators can mark a job card as Completed. Please submit for QC Review.',
                    ], 403);
                }
            }
            if (($lower === 'in progress' || $lower === 'in_progress') && empty($jobCard->started_at) && empty($data['started_at'])) {
                $data['started_at'] = now();
            } elseif (($lower === 'completed' || $lower === 'closed') && empty($jobCard->completed_at) && empty($data['completed_at'])) {
                $data['completed_at'] = now();
            }
        }
        $jobCard->update($data);
        return new JobCardResource($jobCard->load('vehicle', 'assignedUser.profile', 'inspections'));
    }
    public function destroy(Request $request, JobCard $jobCard) {
        if (!$jobCard->exists) {
            $id = $request->route('job_card') ?? $request->route('jobCard');
            $jobCard = JobCard::findOrFail($id);
        }
        $this->authorize('delete', $jobCard);
        $jobCard->delete();
        return response()->json(null, 204);
    }
    public function assign(AssignJobCardRequest $request, JobCard $jobCard) {
        if (!$jobCard->exists) {
            $id = $request->route('job_card') ?? $request->route('jobCard');
            $jobCard = JobCard::findOrFail($id);
        }
        $this->authorize('assign', $jobCard);
        $updated = $this->service->assign($jobCard->id, $request->validated('assigned_to'), $request->user()->id);
        return new JobCardResource($updated->load('vehicle', 'assignedUser.profile', 'inspections'));
    }
    public function updateStatus(Request $request, JobCard $jobCard) {
        if (!$jobCard->exists) {
            $id = $request->route('job_card') ?? $request->route('jobCard');
            $jobCard = JobCard::findOrFail($id);
        }
        $this->authorize('update', $jobCard);
        $status = $request->get('status');
        if ($status) {
            $lower = strtolower(trim($status));
            $currentLower = strtolower(trim($jobCard->status ?? ''));
            if (in_array($lower, ['completed', 'closed']) && !in_array($currentLower, ['completed', 'closed'])) {
                $user = $request->user();
                if (!$user->hasRole('admin') && !$user->hasRole('qc_inspector') && !$user->hasPermissionTo('qc.review')) {
                    return response()->json([
                        'message' => 'Only users with QC review permission or administrators can mark a job card as Completed. Please submit for QC Review.',
                    ], 403);
                }
            }
        }
        $updated = $this->service->updateStatus($jobCard->id, $status, $request->user()->id);
        return new JobCardResource($updated->load('vehicle', 'assignedUser.profile', 'inspections'));
    }
    public function signMechanic(SignJobCardRequest $request, JobCard $jobCard) {
        if (!$jobCard->exists) {
            $id = $request->route('job_card') ?? $request->route('jobCard');
            $jobCard = JobCard::findOrFail($id);
        }
        $this->authorize('signMechanic', $jobCard);
        $updated = $this->service->signMechanic($jobCard->id, $request->validated('signature'), $request->user()->id);
        return new JobCardResource($updated->load('vehicle', 'assignedUser.profile', 'inspections'));
    }
    public function signSupervisor(SignJobCardRequest $request, JobCard $jobCard) {
        if (!$jobCard->exists) {
            $id = $request->route('job_card') ?? $request->route('jobCard');
            $jobCard = JobCard::findOrFail($id);
        }
        $this->authorize('signSupervisor', $jobCard);
        $updated = $this->service->signSupervisor($jobCard->id, $request->validated('signature'), $request->user()->id);
        return new JobCardResource($updated->load('vehicle', 'assignedUser.profile', 'inspections'));
    }
}
