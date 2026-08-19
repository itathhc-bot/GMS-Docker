import os
import re

base = os.getcwd()

def write_file(path, content):
    full_path = os.path.join(base, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w") as f:
        f.write(content)

controllers = {
    "AuthController": """<?php
namespace App\\Http\\Controllers\\Api\\V1;
use App\\Http\\Controllers\\Controller;
use App\\Services\\AuthService;
use App\\Http\\Requests\\Api\\V1\\LoginRequest;
use Illuminate\\Http\\Request;
class AuthController extends Controller {
    public function __construct(private AuthService $authService) {}
    public function login(LoginRequest $request) {
        $result = $this->authService->login($request->validated());
        return response()->json($result);
    }
    public function logout(Request $request) {
        $this->authService->logout($request->user());
        return response()->json(null, 204);
    }
    public function me(Request $request) {
        return response()->json($this->authService->me($request->user()));
    }
}
""",
    "DashboardController": """<?php
namespace App\\Http\\Controllers\\Api\\V1;
use App\\Http\\Controllers\\Controller;
use App\\Services\\ReportService;
use Illuminate\\Http\\Request;
class DashboardController extends Controller {
    public function __construct(private ReportService $reportService) {}
    public function index() {
        return response()->json($this->reportService->dashboardStats());
    }
}
""",
    "JobCardController": """<?php
namespace App\\Http\\Controllers\\Api\\V1;
use App\\Http\\Controllers\\Controller;
use App\\Models\\JobCard;
use App\\Services\\JobCardService;
use App\\Repositories\\Contracts\\JobCardRepositoryInterface;
use App\\Http\\Requests\\Api\\V1\\StoreJobCardRequest;
use App\\Http\\Requests\\Api\\V1\\UpdateJobCardRequest;
use App\\Http\\Requests\\Api\\V1\\AssignJobCardRequest;
use App\\Http\\Requests\\Api\\V1\\SignJobCardRequest;
use App\\Http\\Resources\\Api\\V1\\JobCardResource;
use Illuminate\\Http\\Request;

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
""",
    "HealthController": """<?php
namespace App\\Http\\Controllers\\Api\\V1;
use App\\Http\\Controllers\\Controller;
use Illuminate\\Support\\Facades\\DB;
use Illuminate\\Support\\Facades\\Redis;
use Illuminate\\Support\\Facades\\Storage;

class HealthController extends Controller {
    public function check() {
        return response()->json([
            'db' => DB::connection()->getPdo() ? 'ok' : 'error',
            'redis' => Redis::connection() ? 'ok' : 'error',
            'storage' => Storage::disk('local')->exists('.') ? 'ok' : 'error',
        ]);
    }
}
""",
    "MetricsController": """<?php
namespace App\\Http\\Controllers\\Api\\V1;
use App\\Http\\Controllers\\Controller;
use App\\Services\\MetricsService;

class MetricsController extends Controller {
    public function __construct(private MetricsService $metricsService) {}
    public function prometheus() {
        return response($this->metricsService->getPrometheusMetrics())
            ->header('Content-Type', 'text/plain; version=0.0.4');
    }
}
""",
    "SettingsController": """<?php
namespace App\\Http\\Controllers\\Api\\V1;
use App\\Http\\Controllers\\Controller;
use App\\Models\\AppSetting;
use App\\Http\\Requests\\Api\\V1\\UpdateSettingsRequest;

class SettingsController extends Controller {
    public function index() {
        $this->authorize('view', AppSetting::class);
        return response()->json(AppSetting::all());
    }
    public function update(UpdateSettingsRequest $request) {
        $this->authorize('update', AppSetting::class);
        foreach ($request->validated('settings') as $key => $value) {
            AppSetting::set($key, $value);
        }
        return response()->json(AppSetting::all());
    }
}
""",
}

crud_entities = [
    ("Vehicle", "vehicles"), ("Driver", "drivers"), ("PartsRequest", "parts-requests"),
    ("PurchaseOrder", "purchase-orders"), ("Supplier", "suppliers"), ("InventoryItem", "inventory")
]

for entity, prefix in crud_entities:
    name = entity if entity != 'InventoryItem' else 'Inventory'
    content = f"""<?php
namespace App\\Http\\Controllers\\Api\\V1;
use App\\Http\\Controllers\\Controller;
use App\\Models\\{entity};
use App\\Repositories\\Contracts\\{entity}RepositoryInterface;
use App\\Http\\Requests\\Api\\V1\\Store{entity}Request;
use App\\Http\\Requests\\Api\\V1\\Update{entity}Request;
use App\\Http\\Resources\\Api\\V1\\{entity}Resource;
use Illuminate\\Http\\Request;

class {name}Controller extends Controller {{
    public function __construct(private {entity}RepositoryInterface $repository) {{}}
    public function index(Request $request) {{
        $this->authorize('viewAny', {entity}::class);
        return {entity}Resource::collection($this->repository->paginate($request->get('per_page', 15), $request->all()));
    }}
    public function show({entity} $model) {{
        $this->authorize('view', $model);
        return new {entity}Resource($model);
    }}
    public function store(Store{entity}Request $request) {{
        $this->authorize('create', {entity}::class);
        $model = $this->repository->create($request->validated());
        return (new {entity}Resource($model))->response()->setStatusCode(201);
    }}
    public function update(Update{entity}Request $request, {entity} $model) {{
        $this->authorize('update', $model);
        $model = $this->repository->update($model->id, $request->validated());
        return new {entity}Resource($model);
    }}
    public function destroy({entity} $model) {{
        $this->authorize('delete', $model);
        $this->repository->delete($model->id);
        return response()->json(null, 204);
    }}
}}
"""
    controllers[f"{name}Controller"] = content

for name, code in controllers.items():
    write_file(f"app/Http/Controllers/Api/V1/{name}.php", code)

print("Generated Base Controllers.")
