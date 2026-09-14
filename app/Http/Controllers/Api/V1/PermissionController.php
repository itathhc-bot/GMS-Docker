<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if (!$request->user()->hasRole('admin') && !$request->user()->can('users.view')) {
            abort(403, 'Unauthorized');
        }
        $permissions = Permission::all();
        return response()->json($permissions);
    }
}
