<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\BayCommentPosted;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\V1\StoreBayCommentRequest;
use App\Models\BayComment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BayCommentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('job_cards.view');
        
        $request->validate(['bay_number' => 'nullable|string']);

        $query = BayComment::with('author');
        if ($request->has('bay_number')) {
            $query->where('bay_number', $request->bay_number);
        }

        return response()->json($query->latest()->paginate(15));
    }

    public function store(StoreBayCommentRequest $request): JsonResponse
    {
        $this->authorize('job_cards.create');

        try {
            $data = $request->validated();
            $data['author_id'] = $request->user()->id;
            
            $comment = BayComment::create($data);
            $comment->load('author');

            broadcast(new BayCommentPosted($comment, $comment->bay_number))->toOthers();

            return response()->json($comment, 201);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to post comment: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(BayComment $bayComment): JsonResponse
    {
        $this->authorize('delete', $bayComment);

        try {
            $bayComment->delete();
            return response()->json(['message' => 'Comment deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete comment: ' . $e->getMessage()], 500);
        }
    }
}
