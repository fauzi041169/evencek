<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\ConnectionException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Render an exception into an HTTP response.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Symfony\Component\HttpFoundation\Response
     *
     * @throws \Throwable
     */
    public function render($request, Throwable $e)
    {
        $requestId = (string) ($request->headers->get('X-Request-Id') ?: Str::uuid());

        // 419 Page Expired (CSRF/session): redirect back dengan pesan agar Inertia dapat respon valid
        // sehingga tidak muncul modal error; setelah redirect halaman punya token baru.
        if ($e instanceof TokenMismatchException) {
            if ($request->expectsJson() || $request->header('X-Inertia')) {
                return redirect()->back()
                    ->with('error', 'Sesi berakhir. Silakan muat ulang halaman dan coba lagi.')
                    ->withHeaders(['X-Request-Id' => $requestId]);
            }

            return redirect()->back()
                ->with('error', 'Sesi berakhir. Silakan muat ulang halaman dan coba lagi.')
                ->withHeaders(['X-Request-Id' => $requestId]);
        }

        if ($e instanceof ModelNotFoundException) {
            if ($request->header('X-Inertia')) {
                return Inertia::render('Error', [
                    'status' => 404,
                    'request_id' => $requestId,
                ])->toResponse($request)->setStatusCode(404)->withHeaders(['X-Request-Id' => $requestId]);
            }

            return response()->view('errors.404', [], 404)->withHeaders(['X-Request-Id' => $requestId]);
        }
        if ($e instanceof NotFoundHttpException) {
            if ($request->header('X-Inertia')) {
                return Inertia::render('Error', [
                    'status' => 404,
                    'request_id' => $requestId,
                ])->toResponse($request)->setStatusCode(404)->withHeaders(['X-Request-Id' => $requestId]);
            }

            return response()->view('errors.404', [], 404)->withHeaders(['X-Request-Id' => $requestId]);
        }
        // Handle database connection errors globally
        if ($e instanceof QueryException || $e instanceof ConnectionException) {
            $errorCode = $e->getCode();
            $errorMessage = $e->getMessage();

            // Check if it's a connection error
            if (strpos($errorMessage, 'No connection could be made') !== false ||
                strpos($errorMessage, 'Connection refused') !== false ||
                strpos($errorMessage, 'SQLSTATE[HY000]') !== false) {

                // For API requests, return JSON response
                if ($request->expectsJson() || $request->is('api/*')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Database tidak tersedia. Silakan hubungi administrator.',
                        'error' => 'Database connection failed',
                        'request_id' => $requestId,
                    ], 503);
                }

                if ($request->header('X-Inertia')) {
                    return Inertia::render('Error', [
                        'status' => 503,
                        'message' => 'Database tidak tersedia saat ini. Silakan coba lagi nanti atau hubungi administrator.',
                        'request_id' => $requestId,
                    ])->toResponse($request)->setStatusCode(503)->withHeaders(['X-Request-Id' => $requestId]);
                }

                // For web requests, show friendly error page
                return response()->view('errors.database', [
                    'message' => 'Database tidak tersedia saat ini. Silakan coba lagi nanti atau hubungi administrator.',
                    'error' => $errorMessage,
                    'request_id' => $requestId,
                ], 503)->withHeaders(['X-Request-Id' => $requestId]);
            }
        }

        try {
            Log::error('Unhandled Exception', [
                'request_id' => $requestId,
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'user_id' => auth()->id(),
                'message' => $e->getMessage(),
            ]);
        } catch (Throwable $logErr) {
        }

        if (! config('app.debug')) {
            if (method_exists($e, 'getStatusCode') && (int) $e->getStatusCode() === 500) {
                if ($request->expectsJson() || $request->is('api/*')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Terjadi kesalahan server. Silakan coba lagi.',
                        'request_id' => $requestId,
                    ], 500)->withHeaders(['X-Request-Id' => $requestId]);
                }

                if ($request->header('X-Inertia')) {
                    return Inertia::render('Error', [
                        'status' => 500,
                        'message' => 'Terjadi kesalahan server. Silakan coba lagi.',
                        'request_id' => $requestId,
                    ])->toResponse($request)->setStatusCode(500)->withHeaders(['X-Request-Id' => $requestId]);
                }

                return response()->view('errors.500', [
                    'request_id' => $requestId,
                ], 500)->withHeaders(['X-Request-Id' => $requestId]);
            }
            if (! $this->isHttpException($e) && ! ($e instanceof TokenMismatchException) && ! ($e instanceof ValidationException) && ! ($e instanceof AuthenticationException)) {
                if ($request->expectsJson() || $request->is('api/*')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Terjadi kesalahan server. Silakan coba lagi.',
                        'request_id' => $requestId,
                    ], 500)->withHeaders(['X-Request-Id' => $requestId]);
                }

                if ($request->header('X-Inertia')) {
                    return Inertia::render('Error', [
                        'status' => 500,
                        'message' => 'Terjadi kesalahan server. Silakan coba lagi.',
                        'request_id' => $requestId,
                    ])->toResponse($request)->setStatusCode(500)->withHeaders(['X-Request-Id' => $requestId]);
                }

                return response()->view('errors.500', [
                    'request_id' => $requestId,
                ], 500)->withHeaders(['X-Request-Id' => $requestId]);
            }
        }

        $response = parent::render($request, $e);

        try {
            return $response->withHeaders(['X-Request-Id' => $requestId]);
        } catch (Throwable $ignored) {
            return $response;
        }
    }
}
