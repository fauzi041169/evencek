<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\ActivityCommitteeStructure;
use App\Models\ActivityUser;
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
                $now = now();

                // 1. Track Committee Access
                $committee = ActivityCommitteeStructure::where('user_id', $user->id)
                    ->where('activity_id', $activityId)
                    ->first();

                if ($committee) {
                    $committee->jumlah_akses = ($committee->jumlah_akses ?? 0) + 1;
                    
                    if ($committee->last_access_at) {
                        $diffInMinutes = $committee->last_access_at->diffInMinutes($now);
                        if ($diffInMinutes < 30 && $diffInMinutes > 0) {
                             $committee->lama_akses = ($committee->lama_akses ?? 0) + $diffInMinutes;
                        }
                    }
                    
                    $committee->last_access_at = $now;
                    $committee->save();
                }

                // 2. Track Participant Access
                $participant = ActivityUser::where('user_id', $user->id)
                    ->where('activity_id', $activityId)
                    ->first();

                if ($participant) {
                    $participant->jumlah_akses = ($participant->jumlah_akses ?? 0) + 1;
                    
                    if ($participant->last_access_at) {
                        $diffInMinutes = $participant->last_access_at->diffInMinutes($now);
                        if ($diffInMinutes < 30 && $diffInMinutes > 0) {
                             $participant->lama_akses = ($participant->lama_akses ?? 0) + $diffInMinutes;
                        }
                    }
                    
                    $participant->last_access_at = $now;
                    $participant->save();
                }
            }
        }

        return $response;
    }
}
