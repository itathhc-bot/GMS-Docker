<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Services\AuthService;
use App\Http\Requests\Api\V1\LoginRequest;
use Illuminate\Http\Request;
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
