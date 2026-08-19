<?php
namespace App\Services;
use App\Models\QcReview;
class QcService {
    public function createReview($jobCardId, $inspectorId) {
        return QcReview::create(['job_card_id' => $jobCardId, 'inspector_id' => $inspectorId, 'status' => 'pending']);
    }
    public function updateChecklist($reviewId, array $items) {
        $review = QcReview::findOrFail($reviewId);
        $review->checklistItems()->delete();
        $review->checklistItems()->createMany($items);
        return $review;
    }
    public function finalizeReview($reviewId, $status, $signature, $actorId) {
        $review = QcReview::findOrFail($reviewId);
        $review->update(['status' => $status, 'inspector_signature' => $signature]);
        return $review;
    }
}
