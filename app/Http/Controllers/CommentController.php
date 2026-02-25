<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\ActivityChat;
use App\Models\Comment;
use App\Models\News;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    public function storeForNews(Request $request, News $news)
    {
        $validated = $request->validate([
            'body' => 'required|string|max:5000',
            'rating' => 'nullable|integer|min:1|max:5',
            'parent_id' => 'nullable|exists:comments,id',
        ]);

        $cleanBody = \Purifier::clean($validated['body']);
        $comment = new Comment([
            'user_id' => $request->user()->id,
            'body' => $cleanBody,
            'rating' => $validated['parent_id'] ?? null ? null : ($validated['rating'] ?? null),
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        $news->comments()->save($comment);

        return back()->with('success', 'Komentar berhasil dikirim.');
    }

    public function storeForActivity(Request $request, Activity $activity)
    {
        $validated = $request->validate([
            'body' => 'required|string|max:5000',
            'rating' => 'nullable|integer|min:1|max:5',
            'parent_id' => 'nullable|exists:comments,id',
        ]);

        $cleanBody = \Purifier::clean($validated['body']);
        $comment = new Comment([
            'user_id' => $request->user()->id,
            'body' => $cleanBody,
            'rating' => $validated['parent_id'] ?? null ? null : ($validated['rating'] ?? null),
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        $activity->comments()->save($comment);

        // Create chat message if user is not the owner
        // This allows the committee to see the comment as a direct message
        if ($request->user()->id != $activity->user_id) {
            ActivityChat::create([
                'activity_id' => $activity->id,
                'user_id' => $request->user()->id,
                'sender_id' => $request->user()->id,
                'message' => $cleanBody,
                'is_read' => false,
            ]);
        }

        if ($request->header('X-Inertia')) {
            return back()->with('success', 'Komentar berhasil dikirim.');
        }

        if ($request->ajax() || $request->wantsJson()) {
            $comment->load('user');

            return response()->json([
                'success' => true,
                'comment' => [
                    'id' => $comment->id,
                    'user_name' => optional($comment->user)->name,
                    'created_human' => optional($comment->created_at)->diffForHumans(),
                    'body' => $comment->body,
                    'parent_id' => $comment->parent_id,
                    'rating' => $comment->rating,
                ],
            ]);
        }

        return back()->with('success', 'Komentar berhasil dikirim.');
    }

    /**
     * Store or update rating for an activity instantly (no comment required)
     */
    public function rateActivity(Request $request, Activity $activity)
    {
        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
        ]);

        $userId = $request->user()->id;

        // Find existing rating comment by this user (top-level, has rating)
        $existing = Comment::where('commentable_type', Activity::class)
            ->where('commentable_id', $activity->id)
            ->where('user_id', $userId)
            ->whereNull('parent_id')
            ->whereNotNull('rating')
            ->first();

        if ($existing) {
            $existing->rating = $validated['rating'];
            $existing->save();
        } else {
            $comment = new Comment([
                'user_id' => $userId,
                'body' => '', // allow empty body for rating-only
                'rating' => $validated['rating'],
                'parent_id' => null,
            ]);
            $activity->comments()->save($comment);
        }

        $count = $activity->allComments()->whereNull('parent_id')->whereNotNull('rating')->count();

        return response()->json([
            'success' => true,
            'average' => $activity->averageRating(),
            'count' => $count,
        ]);
    }

    /**
     * Store or update rating for a news instantly (no comment required)
     */
    public function rateNews(Request $request, News $news)
    {
        $validated = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
        ]);

        $userId = $request->user()->id;

        // Find existing rating comment by this user (top-level, has rating)
        $existing = Comment::where('commentable_type', News::class)
            ->where('commentable_id', $news->id)
            ->where('user_id', $userId)
            ->whereNull('parent_id')
            ->whereNotNull('rating')
            ->first();

        if ($existing) {
            $existing->rating = $validated['rating'];
            $existing->save();
        } else {
            $comment = new Comment([
                'user_id' => $userId,
                'body' => '', // allow empty body for rating-only
                'rating' => $validated['rating'],
                'parent_id' => null,
            ]);
            $news->comments()->save($comment);
        }

        return response()->json([
            'success' => true,
            'average' => $news->averageRating(),
        ]);
    }
}
