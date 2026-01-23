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

        // Record the page view
        try {
            View::create([
                'page_id' => $request->path(),
                'user_id' => auth()->id(),
                'ip_address' => $request->ip(),
            ]);
        } catch (\Throwable $e) {
            // Jangan gagalkan request jika tabel belum ada selama pengujian
            // atau jika terjadi masalah database lainnya; cukup lanjutkan tanpa logging.
        }

        return $response;
    }
}
