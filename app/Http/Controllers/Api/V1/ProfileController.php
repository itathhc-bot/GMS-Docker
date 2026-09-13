<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $profile = $user->profile;
        if (!$profile) {
            return response()->json(['message' => 'Profile not found'], 404);
        }

        $validated = $request->validate([
            'preferred_language' => 'nullable|string|max:10',
            'parts_export_columns' => 'nullable|array',
            'parts_history_location_filter' => 'nullable|string|max:50',
            'preview_cache_enabled' => 'nullable|boolean',
            'preview_cache_ttl_seconds' => 'nullable|integer',
        ]);

        $profile->update($validated);

        return response()->json($profile);
    }
}
