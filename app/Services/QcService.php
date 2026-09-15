<?php

namespace App\Services;

use App\Models\QcReview;
use App\Models\QcChecklistItem;
use Illuminate\Support\Str;

class QcService
{
    public function createReview($jobCardId, $inspectorId)
    {
        return QcReview::firstOrCreate(
            ['job_card_id' => $jobCardId],
            ['inspector_id' => $inspectorId, 'status' => 'Pending']
        );
    }

    public function updateChecklist($reviewId, array $items)
    {
        $review = $reviewId instanceof QcReview ? $reviewId : QcReview::findOrFail($reviewId);
        $review->checklistItems()->delete();

        $formatted = [];
        foreach ($items as $item) {
            $name = $item['item_name'] ?? $item['name'] ?? null;
            if (!$name) continue;

            $result = $item['result'] ?? null;
            if ($result) {
                $result = match (strtolower((string)$result)) {
                    'pass' => 'Pass',
                    'fail' => 'Fail',
                    'n/a', 'na' => 'N/A',
                    default => $result,
                };
            }

            $formatted[] = [
                'id' => (string) Str::uuid(),
                'qc_review_id' => $review->id,
                'item_name' => $name,
                'category' => $item['category'] ?? 'General',
                'result' => $result,
                'notes' => $item['notes'] ?? null,
                'photo_url' => $item['photo_url'] ?? $item['photoUrl'] ?? null,
                'checked_at' => $item['checked_at'] ?? ($result ? now() : null),
            ];
        }

        if (!empty($formatted)) {
            $review->checklistItems()->createMany($formatted);
        }

        return $review->load('checklistItems');
    }

    public function finalizeReview($reviewOrId, $statusOrData = null, $signature = null, $actorId = null)
    {
        $review = $reviewOrId instanceof QcReview ? $reviewOrId : QcReview::findOrFail($reviewOrId);

        if (is_array($statusOrData)) {
            $data = $statusOrData;
            $status = $data['status'] ?? $review->status;
            $sig = $data['signature_data'] ?? $data['signature'] ?? $review->signature_data;
            $remarks = $data['remarks'] ?? $data['notes'] ?? $review->remarks;
            $reviewedAt = $data['reviewed_at'] ?? ($sig ? now() : $review->reviewed_at);
        } else {
            $status = $statusOrData ?? $review->status;
            $sig = $signature ?? $review->signature_data;
            $remarks = $review->remarks;
            $reviewedAt = $sig ? now() : $review->reviewed_at;
        }

        // Normalize status
        if ($status) {
            $status = match (strtolower((string)$status)) {
                'pass', 'passed' => 'Passed',
                'fail', 'failed' => 'Failed',
                'rework' => 'Rework',
                'in review', 'in_review' => 'In Review',
                'pending' => 'Pending',
                default => ucfirst($status),
            };
        }

        $updateData = [
            'status' => $status,
            'signature_data' => $sig,
            'remarks' => $remarks,
            'reviewed_at' => $reviewedAt,
        ];

        if ($actorId) {
            $updateData['inspector_id'] = $actorId;
        }

        $review->update($updateData);

        // Sync JobCard status
        if (in_array($status, ['Passed', 'Failed', 'Rework']) && $review->jobCard) {
            $jobStatus = match ($status) {
                'Passed' => 'Completed',
                'Failed', 'Rework' => 'In Progress',
                default => $review->jobCard->status,
            };
            $review->jobCard->update(['status' => $jobStatus]);
        }

        return $review->fresh(['checklistItems', 'inspector', 'jobCard']);
    }
}

