<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\ActivityCommitteeStructure;
use Illuminate\Support\Facades\Auth;

class TrackActivityAccess
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (Auth::check()) {
            $user = Auth::user();
            $route = $request->route();
            
            // Try to find activity ID from route parameters
            $activityId = $route->parameter('activity') ?? $route->parameter('id') ?? $route->parameter('activityId');
            
            // If activity is an object (Route Model Binding), get its ID
            if (is_object($activityId) && isset($activityId->id)) {
                $activityId = $activityId->id;
            }

            if ($activityId) {
                // Find committee record
                $committee = ActivityCommitteeStructure::where('user_id', $user->id)
                    ->where('activity_id', $activityId)
                    ->first();

                if ($committee) {
                    $now = now();
                    
                    // Increment access count
                    $committee->jumlah_akses = ($committee->jumlah_akses ?? 0) + 1;
                    
                    // Calculate duration
                    if ($committee->last_access_at) {
                        $diffInMinutes = $committee->last_access_at->diffInMinutes($now);
                        
                        // If last access was less than 30 minutes ago, add the difference
                        if ($diffInMinutes < 30 && $diffInMinutes > 0) {
                             $committee->lama_akses = ($committee->lama_akses ?? 0) + $diffInMinutes;
                        }
                    } else {
                        // First access, maybe init with 0 or 1? Leave as is.
                    }
                    
                    $committee->last_access_at = $now;
                    $committee->save();
                }
            }
        }

        return $response;
    }
}
