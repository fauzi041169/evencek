<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientLog;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ClientLogController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'level' => ['nullable', 'string', 'max:16'],
            'source' => ['nullable', 'string', 'max:32'],
            'tag' => ['nullable', 'string', 'max:64'],
            'q' => ['nullable', 'string', 'max:200'],
            'user_id' => ['nullable', 'string', 'max:64'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $query = ClientLog::query();

        if (! empty($data['level'])) {
            $query->where('level', strtolower($data['level']));
        }

        if (! empty($data['source'])) {
            $query->where('source', $data['source']);
        }

        if (! empty($data['tag'])) {
            $query->whereJsonContains('tags', $data['tag']);
        }

        if (! empty($data['q'])) {
            $query->where('message', 'like', '%'.$data['q'].'%');
        }

        if (! empty($data['user_id'])) {
            $query->where('user_id', $data['user_id']);
        }

        if (! empty($data['from'])) {
            $query->where('created_at', '>=', Carbon::parse($data['from']));
        }

        if (! empty($data['to'])) {
            $query->where('created_at', '<=', Carbon::parse($data['to']));
        }

        $perPage = (int) ($data['per_page'] ?? 50);

        return response()->json([
            'success' => true,
            'data' => $query->orderByDesc('id')->paginate($perPage),
        ]);
    }

    public function stream(Request $request)
    {
        $data = $request->validate([
            'last_id' => ['nullable', 'integer', 'min:0'],
            'level' => ['nullable', 'string', 'max:16'],
            'source' => ['nullable', 'string', 'max:32'],
            'tag' => ['nullable', 'string', 'max:64'],
            'poll_ms' => ['nullable', 'integer', 'min:200', 'max:5000'],
            'max_seconds' => ['nullable', 'integer', 'min:5', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:200'],
        ]);

        $lastId = (int) ($data['last_id'] ?? 0);
        $pollMs = (int) ($data['poll_ms'] ?? 1000);
        $maxSeconds = (int) ($data['max_seconds'] ?? 30);
        $limit = (int) ($data['limit'] ?? 100);
        $level = ! empty($data['level']) ? strtolower($data['level']) : null;
        $source = $data['source'] ?? null;
        $tag = $data['tag'] ?? null;

        return response()->stream(function () use (&$lastId, $pollMs, $maxSeconds, $limit, $level, $source, $tag) {
            @ini_set('output_buffering', 'off');
            @ini_set('zlib.output_compression', '0');
            while (ob_get_level() > 0) {
                ob_end_flush();
            }

            $start = microtime(true);

            while (microtime(true) - $start < $maxSeconds) {
                $query = ClientLog::query()->where('id', '>', $lastId);

                if ($level) {
                    $query->where('level', $level);
                }
                if ($source) {
                    $query->where('source', $source);
                }
                if ($tag) {
                    $query->whereJsonContains('tags', $tag);
                }

                $logs = $query->orderBy('id')->limit($limit)->get();

                foreach ($logs as $log) {
                    $payload = [
                        'id' => $log->id,
                        'level' => $log->level,
                        'message' => $log->message,
                        'context' => $log->context,
                        'tags' => $log->tags,
                        'source' => $log->source,
                        'url' => $log->url,
                        'user_agent' => $log->user_agent,
                        'ip' => $log->ip,
                        'user_id' => $log->user_id,
                        'occurred_at' => optional($log->occurred_at)->toIso8601String(),
                        'created_at' => optional($log->created_at)->toIso8601String(),
                    ];

                    echo "id: {$log->id}\n";
                    echo "event: log\n";
                    echo 'data: '.json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n\n";

                    $lastId = max($lastId, (int) $log->id);
                }

                echo "event: ping\n";
                echo 'data: {"ok":true}'."\n\n";

                if (function_exists('fastcgi_finish_request')) {
                    @fastcgi_finish_request();
                } else {
                    @flush();
                }

                usleep($pollMs * 1000);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'level' => ['nullable', 'string', 'max:16'],
            'message' => ['required', 'string', 'max:10000'],
            'context' => ['nullable', 'array'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:64'],
            'source' => ['nullable', 'string', 'max:32'],
            'url' => ['nullable', 'string', 'max:2048'],
            'user_agent' => ['nullable', 'string', 'max:2000'],
            'occurred_at' => ['nullable', 'date'],
        ]);

        $log = ClientLog::create([
            'level' => strtolower((string) ($data['level'] ?? 'info')),
            'message' => $data['message'],
            'context' => $data['context'] ?? null,
            'tags' => $data['tags'] ?? null,
            'source' => $data['source'] ?? 'web',
            'url' => $data['url'] ?? $request->fullUrl(),
            'user_agent' => $data['user_agent'] ?? $request->userAgent(),
            'ip' => $request->ip(),
            'user_id' => $request->user()?->id,
            'occurred_at' => $data['occurred_at'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'id' => $log->id,
        ], 201);
    }
}
