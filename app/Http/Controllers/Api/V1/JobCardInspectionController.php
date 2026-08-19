<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\JobCard;
use App\Models\JobCardInspection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JobCardInspectionController extends Controller
{
    public function index(JobCard $jobCard): JsonResponse
    {
        $this->authorize('view', $jobCard);
        
        $inspections = $jobCard->inspections()->latest()->get();
        return response()->json($inspections);
    }

    public function store(Request $request, JobCard $jobCard): JsonResponse
    {
        $this->authorize('update', $jobCard);

        $data = $request->validate([
            'category' => 'required|string|max:255',
            'item_name' => 'required|string|max:255',
            'status' => 'required|string|in:pass,fail,warning,na',
            'notes' => 'nullable|string',
            'images' => 'nullable|array',
        ]);

        try {
            $inspection = $jobCard->inspections()->create($data);
            return response()->json($inspection, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create inspection item: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, JobCard $jobCard, JobCardInspection $inspection): JsonResponse
    {
        $this->authorize('update', $jobCard);

        if ($inspection->job_card_id !== $jobCard->id) {
            return response()->json(['message' => 'Inspection does not belong to this job card'], 403);
        }

        $data = $request->validate([
            'category' => 'sometimes|required|string|max:255',
            'item_name' => 'sometimes|required|string|max:255',
            'status' => 'sometimes|required|string|in:pass,fail,warning,na',
            'notes' => 'nullable|string',
            'images' => 'nullable|array',
        ]);

        try {
            $inspection->update($data);
            return response()->json($inspection);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to update inspection item: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(JobCard $jobCard, JobCardInspection $inspection): JsonResponse
    {
        $this->authorize('update', $jobCard);

        if ($inspection->job_card_id !== $jobCard->id) {
            return response()->json(['message' => 'Inspection does not belong to this job card'], 403);
        }

        try {
            $inspection->delete();
            return response()->json(['message' => 'Inspection item deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete inspection item: ' . $e->getMessage()], 500);
        }
    }
}
