<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppBaileysController extends Controller
{
    private function assertCanManage(Activity $activity): void
    {
        $user = auth()->user();
        if (! $user || ! $activity->canManageRegistration($user->id)) {
            abort(403, 'Anda tidak memiliki akses ke layanan WhatsApp aktivitas ini');
        }
    }

    private function serviceUrl(string $path): string
    {
        $base = rtrim((string) config('services.whatsapp_baileys.url', 'http://127.0.0.1:3001'), '/');

        return $base.'/'.ltrim($path, '/');
    }

    private function serviceToken(): ?string
    {
        return config('services.whatsapp_baileys.token') ?: config('services.whatsapp.token');
    }

    private function proxy(string $method, string $path, array $payload = [], array $query = [])
    {
        $token = $this->serviceToken();
        if (! $token) {
            return response()->json([
                'error' => 'Token WhatsApp Baileys belum dikonfigurasi (WHATSAPP_BAILEYS_TOKEN)',
            ], 503);
        }

        try {
            $request = Http::timeout(20)
                ->acceptJson()
                ->withToken($token);

            $url = $this->serviceUrl($path);
            if (! empty($query)) {
                $url .= (str_contains($url, '?') ? '&' : '?').http_build_query($query);
            }

            $response = strtoupper($method) === 'GET'
                ? $request->get($url)
                : $request->post($url, $payload);

            return response()->json($response->json() ?? ['error' => 'Invalid response from WhatsApp service'], $response->status());
        } catch (\Throwable $e) {
            Log::warning('WhatsApp Baileys proxy error', ['message' => $e->getMessage()]);

            return response()->json([
                'error' => 'Layanan WhatsApp tidak dapat dijangkau. Pastikan service Baileys berjalan di localhost.',
            ], 502);
        }
    }

    public function status(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);
        $this->assertCanManage($activity);

        return $this->proxy('GET', '/status', [], ['activity_id' => (string) $activity->id]);
    }

    public function send(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);
        $this->assertCanManage($activity);

        $validated = $request->validate([
            'phone' => 'required|string|max:30',
            'message' => 'required|string|max:4000',
        ]);

        return $this->proxy('POST', '/send', array_merge($validated, [
            'activity_id' => (string) $activity->id,
        ]));
    }

    public function logout(Request $request, $activityId)
    {
        $activity = Activity::findOrFail($activityId);
        $this->assertCanManage($activity);

        return $this->proxy('POST', '/logout', [
            'activity_id' => (string) $activity->id,
        ]);
    }
}
