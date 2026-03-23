<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController as ApiDashboardController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\NewsController as ApiNewsController;
use App\Http\Controllers\Api\ProfileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::get('/health', [HealthController::class, 'check']);

Route::prefix('auth')->middleware('throttle:5,1')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware(['auth:sanctum'])->group(function () {
    Route::get('/auth/user', [AuthController::class, 'user']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::post('/auth/refresh', [AuthController::class, 'refresh']);

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);

    Route::get('/activities', [ActivityController::class, 'index']);
    Route::get('/activities/my', [ActivityController::class, 'myActivities']);
    Route::get('/activities/{id}', [ActivityController::class, 'show']);
    Route::get('/activities/{id}/status', [ActivityController::class, 'status']);
    Route::post('/activities/{id}/register', [ActivityController::class, 'register']);
    Route::post('/activities/{id}/unregister', [ActivityController::class, 'unregister']);

    // Dashboard Routes
    Route::get('/dashboard/user', [ApiDashboardController::class, 'userDashboard']);
    Route::get('/dashboard/activity/{id}', [ApiDashboardController::class, 'activityDashboard']);

    // News Routes
    Route::get('/news', [ApiNewsController::class, 'index']);
    Route::get('/news/{id}', [ApiNewsController::class, 'show']);
});

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});
