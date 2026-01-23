<?php

namespace App\Exceptions;

use Illuminate\Database\ConnectionException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Support\Facades\Log;
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
        if ($e instanceof ModelNotFoundException) {
            return response()->view('errors.404', [], 404);
        }
        if ($e instanceof NotFoundHttpException) {
            return response()->view('errors.404', [], 404);
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
                    ], 503);
                }

                // For web requests, show friendly error page
                return response()->view('errors.database', [
                    'message' => 'Database tidak tersedia saat ini. Silakan coba lagi nanti atau hubungi administrator.',
                    'error' => $errorMessage,
                ], 503);
            }
        }

        try {
            Log::error('Unhandled Exception', [
                'url' => $request->fullUrl(),
                'method' => $request->method(),
                'user_id' => auth()->id(),
                'message' => $e->getMessage(),
            ]);
        } catch (Throwable $logErr) {
        }

        if (! config('app.debug')) {
            if (method_exists($e, 'getStatusCode') && (int) $e->getStatusCode() === 500) {
                return response()->view('errors.500', [], 500);
            }
            if (! $this->isHttpException($e) && ! ($e instanceof TokenMismatchException)) {
                return response()->view('errors.500', [], 500);
            }
        }

        return parent::render($request, $e);
    }
}
