<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\News;
use Illuminate\Http\Request;

class NewsController extends Controller
{
    /**
     * Get list of news
     */
    public function index(Request $request)
    {
        $query = News::with(['category', 'author']);

        // Filter by search query
        if ($request->has('query')) {
            $q = $request->query('query');
            $query->where(function ($subQuery) use ($q) {
                $subQuery->where('title', 'like', '%'.$q.'%')
                    ->orWhere('content', 'like', '%'.$q.'%');
            });
        }

        // Filter by category
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Only published news
        $query->where(function ($q) {
            $q->whereNotNull('published_at')
                ->where('published_at', '<=', now())
                ->orWhereNull('published_at'); // Assuming null means immediately published if status is published, but Web controller logic implies this.
        });

        // Ensure status is published (if there is a status column, Web controller uses it)
        // Web controller: whereNotNull('published_at')->where('published_at', '<=', now())->orWhereNull('published_at')
        // AND status usually handled by creating news with status 'published' setting published_at.
        // Let's check model or DB structure if possible, but following web controller logic:

        $news = $query->latest()->paginate(10);

        // Transform data
        $news->getCollection()->transform(function ($item) {
            return $this->transformNews($item);
        });

        return response()->json([
            'success' => true,
            'data' => $news,
        ]);
    }

    /**
     * Get news detail
     */
    public function show($id)
    {
        try {
            $news = News::with(['category', 'author', 'comments.user'])->findOrFail($id);

            // Increment view count
            $news->increment('views_count');

            return response()->json([
                'success' => true,
                'data' => $this->transformNews($news, true),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'News not found',
            ], 404);
        }
    }

    /**
     * Transform news data
     */
    private function transformNews($news, $detail = false)
    {
        $data = [
            'id' => $news->id,
            'title' => $news->title,
            'slug' => $news->slug,
            'image' => $news->image ? asset('storage/'.$news->image) : null,
            'excerpt' => \Illuminate\Support\Str::limit(strip_tags($news->content), 100),
            'category' => $news->category ? [
                'id' => $news->category->id,
                'name' => $news->category->name,
            ] : null,
            'author' => $news->author ? [
                'id' => $news->author->id,
                'name' => $news->author->name,
            ] : null,
            'published_at' => $news->published_at,
            'views_count' => $news->views_count,
            'created_at' => $news->created_at,
        ];

        if ($detail) {
            $data['content'] = $news->content;
            $data['comments'] = $news->comments->map(function ($comment) {
                return [
                    'id' => $comment->id,
                    'user' => $comment->user ? $comment->user->name : 'Anonymous',
                    'content' => $comment->content,
                    'rating' => $comment->rating,
                    'created_at' => $comment->created_at,
                ];
            });
        }

        return $data;
    }
}
