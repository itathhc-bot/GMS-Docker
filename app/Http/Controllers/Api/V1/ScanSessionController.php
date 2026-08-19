<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\ScanSessionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScanSessionController extends Controller
{
    public function __construct(private ScanSessionService $service) {}

    public function create(Request $request): JsonResponse
    {
        try {
            $session = $this->service->createSession($request->user()->id);
            return response()->json([
                'pairCode' => $session->pair_code,
                'sessionId' => $session->id,
                'expiresAt' => $session->expires_at,
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create scan session: ' . $e->getMessage()], 500);
        }
    }

    public function show(string $pairCode): JsonResponse
    {
        try {
            $session = $this->service->getByPairCode($pairCode);
            if (!$session) {
                return response()->json(['message' => 'Session not found or expired'], 404);
            }
            return response()->json($session);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error retrieving session: ' . $e->getMessage()], 500);
        }
    }

    public function submitOcr(Request $request, string $pairCode): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|max:10240', // Max 10MB
        ]);

        try {
            $session = $this->service->getByPairCode($pairCode);
            if (!$session) {
                return response()->json(['message' => 'Session not found'], 404);
            }

            // Ideally upload image, get path, process OCR...
            // $path = $request->file('image')->store('scans');
            // dispatch(new \App\Jobs\ProcessOcrScan($session, $path));
            
            // For now, mock recording the attempt
            $attempt = $this->service->recordAttempt($session, [
                'raw_text' => 'Sample OCR text',
                'plate_number' => 'ABC-123',
            ], $request->user()?->id);

            return response()->json(['message' => 'Scan submitted for processing', 'attempt_id' => $attempt->id ?? null]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error processing scan: ' . $e->getMessage()], 500);
        }
    }

    public function confirm(Request $request, string $pairCode, string $attemptId): JsonResponse
    {
        try {
            $session = $this->service->getByPairCode($pairCode);
            if (!$session) {
                return response()->json(['message' => 'Session not found'], 404);
            }

            $attempt = $this->service->confirmAttempt($session, $attemptId);

            return response()->json(['message' => 'Attempt confirmed successfully', 'attempt' => $attempt]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error confirming attempt: ' . $e->getMessage()], 500);
        }
    }
}
