<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class VerifyLogIngestToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::guard('sanctum')->user();
        if ($user) {
            $request->setUserResolver(fn () => $user);

            return $next($request);
        }

        $configuredToken = (string) config('app.log_ingest_token');
        $providedToken = (string) $request->header('X-Log-Token');

        if ($configuredToken !== '' && $providedToken !== '' && hash_equals($configuredToken, $providedToken)) {
            return $next($request);
        }

        return response()->json([
            'success' => false,
            'message' => 'Unauthorized',
        ], 401);
    }
}

