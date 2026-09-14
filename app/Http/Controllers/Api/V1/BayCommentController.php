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

        $query = BayComment::with('author', 'jobCard');

        if ($request->has('bay')) {
            $query->where('bay_number', $request->bay);
        }

        if ($request->has('job_card_id')) {
            $query->where('job_card_id', $request->job_card_id);
        }

        $comments = $query->orderBy('created_at', 'desc')->get();
        return response()->json($comments);
    }

    public function store(StoreBayCommentRequest $request): JsonResponse
    {
        $this->authorize('job_cards.create');

        try {
            $data = $request->validated();
            $data['author_user_id'] = $request->user()->id;
            $data['author_name'] = $request->user()->name;
            
            $comment = BayComment::create($data);
            $comment->load('author');

            broadcast(new BayCommentPosted($comment, $comment->bay_number))->toOthers();

            return response()->json($comment, 201);
        } catch (\Exception $e) {
            \Log::error('BayComment creation failed: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to post comment: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(BayComment $bayComment): JsonResponse
    {
        $this->authorize('job_cards.create');

        try {
            $bayComment->delete();
            return response()->json(null, 204);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to delete comment: ' . $e->getMessage()], 500);
        }
    }
}
