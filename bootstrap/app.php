<?php

declare(strict_types=1);

use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
        apiPrefix: 'api',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // ── Global middleware (all requests) ─────────────────────────────────
        $middleware->append(SecurityHeaders::class);

        // ── API middleware group ───────────────────────────────────────────────
        $middleware->api(append: [
            ForceJsonResponse::class,
            \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
        ]);

        // ── Rate limiting ──────────────────────────────────────────────────────
        $middleware->throttleWithRedis('api', 'throttle:api');
        $middleware->throttleWithRedis('login', 'throttle:login');
        $middleware->throttleWithRedis('scan', 'throttle:scan');
        $middleware->throttleWithRedis('metrics', 'throttle:metrics');

        // ── Middleware aliases ─────────────────────────────────────────────────
        $middleware->alias([
            'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
        ]);

        // ── Trusted proxies (for reverse proxy / load balancer) ───────────────
        $middleware->trustProxies(headers: Request::HEADER_X_FORWARDED_FOR |
            Request::HEADER_X_FORWARDED_HOST |
            Request::HEADER_X_FORWARDED_PORT |
            Request::HEADER_X_FORWARDED_PROTO |
            Request::HEADER_X_FORWARDED_AWS_ELB
        );
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // ── Validation errors → 422 ───────────────────────────────────────────
        $exceptions->render(function (ValidationException $e, Request $request): \Illuminate\Http\JsonResponse {
            return response()->json([
                'message' => 'Validation failed.',
                'errors'  => $e->errors(),
            ], 422);
        });

        // ── Not found → 404 ──────────────────────────────────────────────────
        $exceptions->render(function (NotFoundHttpException $e, Request $request): \Illuminate\Http\JsonResponse {
            return response()->json([
                'message' => 'Resource not found.',
            ], 404);
        });

        // ── Forbidden → 403 ──────────────────────────────────────────────────
        $exceptions->render(function (AccessDeniedHttpException $e, Request $request): \Illuminate\Http\JsonResponse {
            return response()->json([
                'message' => 'Access denied.',
            ], 403);
        });

        // ── Unauthenticated → 401 ────────────────────────────────────────────
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, Request $request): \Illuminate\Http\JsonResponse {
            if ($request->expectsJson() || $request->is('api/*')) {
                return response()->json([
                    'message' => 'Unauthenticated.',
                ], 401);
            }
        });

        // ── Model not found → 404 ────────────────────────────────────────────
        $exceptions->render(function (\Illuminate\Database\Eloquent\ModelNotFoundException $e, Request $request): \Illuminate\Http\JsonResponse {
            return response()->json([
                'message' => 'Resource not found.',
            ], 404);
        });
    })
    ->create();
