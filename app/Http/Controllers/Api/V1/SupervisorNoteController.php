<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreSupervisorNoteRequest;
use App\Models\SupervisorNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupervisorNoteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SupervisorNote::class);
        
        $notes = SupervisorNote::with(['supervisor', 'jobCard'])->latest()->paginate(15);
        return response()->json($notes);
    }

    public function store(StoreSupervisorNoteRequest $request): JsonResponse
    {
        $this->authorize('create', SupervisorNote::class);

        try {
            $data = $request->validated();
            $data['supervisor_id'] = $request->user()->id;
            
            $note = SupervisorNote::create($data);
            return response()->json($note, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to create note: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(SupervisorNote $supervisorNote): JsonResponse
    {
        $this->authorize('delete', $supervisorNote);

        try {
            $supervisorNote->delete();
            return response()->json(['message' => 'Note deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete note: ' . $e->getMessage()], 500);
        }
    }
}
