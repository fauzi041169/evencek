<?php

namespace App\Http\Middleware;

use App\Models\View;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RecordPageView
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Catat page view setelah response dikirim (kurangi latency yang dirasakan user)
        $path = $request->path();
        $userId = auth()->id();
        $ip = $request->ip();
        app()->terminating(function () use ($path, $userId, $ip) {
            try {
                View::create([
                    'page_id' => $path,
                    'user_id' => $userId,
                    'ip_address' => $ip,
                ]);
            } catch (\Throwable $e) {
                // Jangan gagalkan request jika tabel belum ada atau error DB
            }
        });

        return $response;
    }
}
