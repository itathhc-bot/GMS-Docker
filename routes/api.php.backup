<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\BayCommentController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DriverController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\InventoryController;
use App\Http\Controllers\Api\V1\JobCardController;
use App\Http\Controllers\Api\V1\JobCardInspectionController;
use App\Http\Controllers\Api\V1\MetricsController;
use App\Http\Controllers\Api\V1\PurchaseOrderController;
use App\Http\Controllers\Api\V1\PartsRequestController;
use App\Http\Controllers\Api\V1\QcReviewController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\ScanSessionController;
use App\Http\Controllers\Api\V1\SettingsController;
use App\Http\Controllers\Api\V1\SupplierController;
use App\Http\Controllers\Api\V1\SupervisorNoteController;
use App\Http\Controllers\Api\V1\UserManagementController;
use App\Http\Controllers\Api\V1\VehicleController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All routes are prefixed with /api (set in bootstrap/app.php)
| V1 prefix applied here.
|
*/

// ─── Health Check (no auth required) ─────────────────────────────────────────
Route::get('/health', [HealthController::class, 'check']);

// ─── Metrics endpoint (Bearer token protected via config) ────────────────────
Route::get('/metrics', [MetricsController::class, 'prometheus'])
    ->middleware('throttle:metrics');

// ─── API V1 ───────────────────────────────────────────────────────────────────
Route::prefix('v1')->group(function () {

    // ── Public routes (no authentication required) ────────────────────────────
    Route::prefix('auth')->group(function () {
        Route::post('/login', [AuthController::class, 'login'])
            ->middleware('throttle:login')
            ->name('api.v1.auth.login');
    });

    // ── Companion scan (mobile companion, no full auth — uses pair code) ───────
    Route::prefix('scan-sessions')->group(function () {
        Route::get('/{pairCode}', [ScanSessionController::class, 'show'])
            ->name('api.v1.scan-sessions.show');
        Route::post('/{pairCode}/attempt', [ScanSessionController::class, 'submitOcr'])
            ->middleware('throttle:scan')
            ->name('api.v1.scan-sessions.attempt');
        Route::post('/{pairCode}/confirm/{attemptId}', [ScanSessionController::class, 'confirm'])
            ->name('api.v1.scan-sessions.confirm');
    });

    // ── Protected routes (Sanctum authentication required) ────────────────────
    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

        // Auth
        Route::prefix('auth')->group(function () {
            Route::post('/logout', [AuthController::class, 'logout'])
                ->name('api.v1.auth.logout');
            Route::get('/me', [AuthController::class, 'me'])
                ->name('api.v1.auth.me');
        });

        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index'])
            ->name('api.v1.dashboard');

        // Vehicles
        Route::apiResource('vehicles', VehicleController::class)
            ->names('api.v1.vehicles');
        Route::get('/vehicles/{vehicle}/history', [VehicleController::class, 'history'])
            ->name('api.v1.vehicles.history');

        // Drivers
        Route::apiResource('drivers', DriverController::class)
            ->names('api.v1.drivers');

        // Job Cards
        Route::apiResource('job-cards', JobCardController::class)
            ->names('api.v1.job-cards');
        Route::patch('/job-cards/{jobCard}/status', [JobCardController::class, 'updateStatus'])
            ->name('api.v1.job-cards.status');
        Route::patch('/job-cards/{jobCard}/assign', [JobCardController::class, 'assign'])
            ->name('api.v1.job-cards.assign');
        Route::post('/job-cards/{jobCard}/sign/mechanic', [JobCardController::class, 'signMechanic'])
            ->name('api.v1.job-cards.sign.mechanic');
        Route::post('/job-cards/{jobCard}/sign/supervisor', [JobCardController::class, 'signSupervisor'])
            ->name('api.v1.job-cards.sign.supervisor');

        // Job Card Inspections (nested under job cards)
        Route::apiResource('job-cards.inspections', JobCardInspectionController::class)
            ->shallow()
            ->names('api.v1.job-cards.inspections');

        // Parts Requests
        Route::apiResource('parts-requests', PartsRequestController::class)
            ->names('api.v1.parts-requests');
        Route::post('/parts-requests/{partsRequest}/approve', [PartsRequestController::class, 'approve'])
            ->name('api.v1.parts-requests.approve');
        Route::post('/parts-requests/{partsRequest}/reject', [PartsRequestController::class, 'reject'])
            ->name('api.v1.parts-requests.reject');
        Route::post('/parts-requests/{partsRequest}/issue', [PartsRequestController::class, 'issue'])
            ->name('api.v1.parts-requests.issue');

        // Purchase Orders
        Route::apiResource('purchase-orders', PurchaseOrderController::class)
            ->names('api.v1.purchase-orders');
        Route::post('/purchase-orders/{purchaseOrder}/approve/manager', [PurchaseOrderController::class, 'approveManager'])
            ->name('api.v1.purchase-orders.approve.manager');
        Route::post('/purchase-orders/{purchaseOrder}/approve/finance', [PurchaseOrderController::class, 'approveFinance'])
            ->name('api.v1.purchase-orders.approve.finance');
        Route::post('/purchase-orders/{purchaseOrder}/reject', [PurchaseOrderController::class, 'reject'])
            ->name('api.v1.purchase-orders.reject');

        // Suppliers
        Route::apiResource('suppliers', SupplierController::class)
            ->names('api.v1.suppliers');

        // Inventory
        Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock'])
            ->name('api.v1.inventory.low-stock');
        Route::apiResource('inventory', InventoryController::class)
            ->names('api.v1.inventory');

        // QC Reviews
        Route::apiResource('qc-reviews', QcReviewController::class)
            ->names('api.v1.qc-reviews');
        Route::patch('/qc-reviews/{qcReview}/checklist', [QcReviewController::class, 'updateChecklist'])
            ->name('api.v1.qc-reviews.checklist');
        Route::post('/qc-reviews/{qcReview}/finalize', [QcReviewController::class, 'finalize'])
            ->name('api.v1.qc-reviews.finalize');

        // Scan Sessions (protected creation)
        Route::post('/scan-sessions', [ScanSessionController::class, 'create'])
            ->name('api.v1.scan-sessions.create');

        // Reports & Exports
        Route::prefix('reports')->name('api.v1.reports.')->group(function () {
            Route::get('/dashboard', [ReportController::class, 'dashboard'])->name('dashboard');
            Route::get('/vehicles', [ReportController::class, 'vehicles'])->name('vehicles');
            Route::get('/job-cards', [ReportController::class, 'jobCards'])->name('job-cards');
            Route::get('/parts', [ReportController::class, 'parts'])->name('parts');
        });

        // Users & Roles
        Route::prefix('users')->name('api.v1.users.')->group(function () {
            Route::get('/', [UserManagementController::class, 'index'])->name('index');
            Route::post('/', [UserManagementController::class, 'store'])->name('store');
            Route::get('/{user}', [UserManagementController::class, 'show'])->name('show');
            Route::patch('/{user}', [UserManagementController::class, 'update'])->name('update');
            Route::post('/{user}/deactivate', [UserManagementController::class, 'deactivate'])->name('deactivate');
            Route::post('/{user}/reactivate', [UserManagementController::class, 'reactivate'])->name('reactivate');
            Route::post('/{user}/roles', [UserManagementController::class, 'assignRole'])->name('roles.assign');
            Route::delete('/{user}/roles/{role}', [UserManagementController::class, 'removeRole'])->name('roles.remove');
            Route::post('/{user}/password', [UserManagementController::class, 'setPassword'])->name('password');
            Route::post('/{user}/password-reset', [UserManagementController::class, 'sendPasswordReset'])->name('password-reset');
        });

        Route::apiResource('roles', RoleController::class)
            ->names('api.v1.roles');
        Route::post('/roles/{role}/permissions', [RoleController::class, 'syncPermissions'])
            ->name('api.v1.roles.permissions.sync');

        // Settings
        Route::get('/settings', [SettingsController::class, 'index'])->name('api.v1.settings.index');
        Route::patch('/settings', [SettingsController::class, 'update'])->name('api.v1.settings.update');

        // Audit Logs
        Route::get('/audit-logs', [AuditLogController::class, 'index'])->name('api.v1.audit-logs.index');

        // Bay Comments
        Route::get('/bay-comments', [BayCommentController::class, 'index'])->name('api.v1.bay-comments.index');
        Route::post('/bay-comments', [BayCommentController::class, 'store'])->name('api.v1.bay-comments.store');
        Route::delete('/bay-comments/{bayComment}', [BayCommentController::class, 'destroy'])->name('api.v1.bay-comments.destroy');

        // Supervisor Notes
        Route::get('/supervisor-notes', [SupervisorNoteController::class, 'index'])->name('api.v1.supervisor-notes.index');
        Route::post('/supervisor-notes', [SupervisorNoteController::class, 'store'])->name('api.v1.supervisor-notes.store');
        Route::delete('/supervisor-notes/{supervisorNote}', [SupervisorNoteController::class, 'destroy'])->name('api.v1.supervisor-notes.destroy');

        // Notifications (uses Laravel's built-in notification system)
        Route::prefix('user')->name('api.v1.user.')->group(function () {
            Route::get('/notifications', function (\Illuminate\Http\Request $request) {
                return $request->user()->notifications()->paginate(20);
            })->name('notifications');
            Route::patch('/notifications/{notification}/read', function (\Illuminate\Http\Request $request, string $id) {
                $request->user()->notifications()->findOrFail($id)->markAsRead();
                return response()->noContent();
            })->name('notifications.read');
            Route::post('/notifications/read-all', function (\Illuminate\Http\Request $request) {
                $request->user()->unreadNotifications->markAsRead();
                return response()->noContent();
            })->name('notifications.read-all');
        });

    }); // end auth:sanctum middleware

}); // end v1 prefix
