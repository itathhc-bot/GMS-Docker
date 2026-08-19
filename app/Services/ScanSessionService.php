<?php

namespace App\Services;

use App\Events\ScanSessionUpdated;
use App\Models\ScanAttempt;
use App\Models\ScanSession;
use Illuminate\Support\Str;

class ScanSessionService
{
    public function createSession(string $userId): ScanSession
    {
        return ScanSession::create([
            'created_by' => $userId,
            'pair_code' => $this->generatePairCode(config('garage.scan.pair_code_length', 6)),
            'expires_at' => now()->addMinutes(config('garage.scan.expiry_minutes', 30)),
            'status' => 'pending',
        ]);
    }

    public function getByPairCode(string $pairCode): ?ScanSession
    {
        return ScanSession::where('pair_code', $pairCode)
            ->where('expires_at', '>', now())
            ->whereIn('status', ['pending', 'active'])
            ->first();
    }

    public function markActive(ScanSession $session): void
    {
        $session->update(['status' => 'active']);
    }

    public function recordAttempt(ScanSession $session, array $data, ?string $userId): ScanAttempt
    {
        $attempt = $session->attempts()->create([
            'scanned_by' => $userId,
            'raw_text' => $data['raw_text'] ?? null,
            'plate_number' => $data['plate_number'] ?? null,
            'vin' => $data['vin'] ?? null,
            'confidence_score' => $data['confidence_score'] ?? 0,
            'is_confirmed' => false,
        ]);

        broadcast(new ScanSessionUpdated($session, $attempt))->toOthers();

        return $attempt;
    }

    public function confirmAttempt(ScanSession $session, string $attemptId): ScanAttempt
    {
        $attempt = $session->attempts()->findOrFail($attemptId);
        
        $attempt->update(['is_confirmed' => true]);
        $session->update(['status' => 'completed']);

        broadcast(new ScanSessionUpdated($session, $attempt))->toOthers();

        return $attempt;
    }

    public function expireOldSessions(): int
    {
        return ScanSession::where('expires_at', '<', now())
            ->whereIn('status', ['pending', 'active'])
            ->update(['status' => 'expired']);
    }

    public function generatePairCode(int $length): string
    {
        do {
            $code = strtoupper(Str::random($length));
        } while (ScanSession::where('pair_code', $code)->exists());
        
        return $code;
    }
}
