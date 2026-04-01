<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;

class AIController extends Controller
{
    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string|max:1500',
            'history' => 'nullable|array|max:12',
        ]);

        $userId = optional($request->user())->id;
        $rateKey = 'ai-chat:'.($userId ? 'u:'.$userId : 'ip:'.$request->ip());
        if (RateLimiter::tooManyAttempts($rateKey, 20)) {
            $seconds = RateLimiter::availableIn($rateKey);

            return response()->json([
                'error' => 'Terlalu banyak permintaan. Coba lagi sebentar ya.',
                'retry_after' => $seconds,
            ], 429);
        }
        RateLimiter::hit($rateKey, 60);

        $message = trim((string) $request->input('message'));
        $history = $this->normalizeHistory($request->input('history', []));

        if ($message === '') {
            return response()->json([
                'error' => 'Pesan tidak boleh kosong.',
            ], 422);
        }

        if ($this->isToxic($message)) {
            return response()->json([
                'response' => 'Saya siap bantu, tapi mohon gunakan bahasa yang sopan. Jelaskan pertanyaan kamu tentang EventCek (contoh: cara buat kegiatan, absensi QR, sertifikat, pembayaran, atau berita).',
                'model' => 'Safety',
            ]);
        }

        $context = $this->getAppContext();

        // System Prompt - Optimized for speed (concise)
        $systemPrompt = "You are 'EVENTCEK AI', a helpful assistant for the EVENTCEK platform (Event Management & Membership).
        Rules:
        1. Concise & helpful answers.
        2. Speak same language as user.
        3. Features: Event mgmt, Membership, Certificates, Payments (Midtrans), Attendance QR, News.
        4. Be polite. Never insult the user. If user is rude, de-escalate and ask for a clear question.
        5. Do not request or expose secrets (API keys, passwords). If asked, refuse.
        App: ".config('app.name');

        try {
            // Prioritize Gemini if API Key exists, even in dev, for much better speed/performance
            if (config('services.gemini.key') || env('GEMINI_API_KEY')) {
                return $this->chatWithGemini($systemPrompt, $message, $history);
            }

            // Fallback to local Ollama if no Gemini Key
            return $this->chatWithOllama($systemPrompt, $message, $history);
        } catch (\Exception $e) {
            Log::error('AI Chat Error: '.$e->getMessage());
            $isDev = app()->environment(['local', 'development']);

            return response()->json([
                'error' => 'Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi nanti.',
                'details' => $isDev ? $e->getMessage() : null,
            ], 500);
        }
    }

    private function getAppContext()
    {
        return Cache::remember('ai_app_context_v1', 3600, function () {
            $settings = \App\Models\Setting::first();
            $appName = $settings->app_name ?? config('app.name');

            $features = [
                'Manajemen Kegiatan (Activity Management)',
                'Pendaftaran Anggota (Membership Registration)',
                'Sertifikat Otomatis (Automatic Certificates)',
                'Pembayaran Online (Midtrans Integration)',
                'Absensi QR Code (QR Attendance)',
                'Laporan Keuangan (Financial Reports)',
                'Manajemen Berita (News/Blog)',
            ];

            return "App Name: $appName\nFeatures: ".implode(', ', $features);
        });
    }

    private function chatWithOllama($systemPrompt, $message, $history)
    {
        $ollamaUrl = env('OLLAMA_URL', 'http://localhost:11434/api/chat');
        $model = env('OLLAMA_MODEL', 'llama3.1:8b');

        $messages = [
            ['role' => 'system', 'content' => $systemPrompt],
        ];

        foreach ($history as $h) {
            $messages[] = ['role' => $h['role'], 'content' => $h['content']];
        }

        $messages[] = ['role' => 'user', 'content' => $message];

        try {
            $response = Http::retry(2, 250)->timeout(60)->post($ollamaUrl, [
                'model' => $model,
                'messages' => $messages,
                'stream' => false,
            ]);

            if ($response->failed()) {
                $errorData = $response->json();
                if (isset($errorData['error']) && str_contains($errorData['error'], 'not found')) {
                    throw new \Exception("Model '$model' tidak ditemukan di Ollama. Silakan jalankan 'ollama pull $model' di terminal Anda.");
                }
                throw new \Exception('Ollama connection failed: '.$response->body());
            }

            $data = $response->json();

            return response()->json([
                'response' => $data['message']['content'],
                'model' => $model.' (Local)',
            ]);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            throw new \Exception("Tidak dapat terhubung ke Ollama di $ollamaUrl. Pastikan aplikasi Ollama sudah dijalankan.");
        }
    }

    private function chatWithGemini($systemPrompt, $message, $history)
    {
        $apiKey = config('services.gemini.key') ?: env('GEMINI_API_KEY');
        if (! $apiKey) {
            throw new \Exception('GEMINI_API_KEY not configured in production.');
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey";

        $contents = [];

        // System instruction for Gemini 1.5
        $systemInstruction = [
            'parts' => [
                ['text' => $systemPrompt],
            ],
        ];

        foreach ($history as $h) {
            $contents[] = [
                'role' => $h['role'] === 'user' ? 'user' : 'model',
                'parts' => [['text' => $h['content']]],
            ];
        }

        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $message]],
        ];

        $response = Http::retry(2, 250)->timeout(25)->post($url, [
            'contents' => $contents,
            'system_instruction' => $systemInstruction,
        ]);

        if ($response->failed()) {
            throw new \Exception('Gemini connection failed: '.$response->body());
        }

        $data = $response->json();
        $aiResponse = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'Maaf, saya tidak bisa mejawab itu.';

        return response()->json([
            'response' => $aiResponse,
            'model' => 'Gemini 1.5 Flash',
        ]);
    }

    private function normalizeHistory($history)
    {
        if (! is_array($history)) {
            return [];
        }

        $out = [];
        foreach (array_slice($history, -8) as $h) {
            if (! is_array($h)) {
                continue;
            }
            $role = isset($h['role']) ? (string) $h['role'] : '';
            if (! in_array($role, ['user', 'assistant'], true)) {
                continue;
            }
            $content = isset($h['content']) ? trim((string) $h['content']) : '';
            if ($content === '') {
                continue;
            }
            $out[] = [
                'role' => $role,
                'content' => mb_substr($content, 0, 2000),
            ];
        }

        return $out;
    }

    private function isToxic($text)
    {
        $t = mb_strtolower($text);
        $t = str_replace([' ', '-', '_', '.', ',', '!', '?', '"', "'", '`'], '', $t);

        $bad = [
            'bodoh', 'goblok', 'tolol', 'idiot', 'anjing', 'bangsat', 'bajingan', 'kontol', 'memek', 'ngentot',
        ];

        foreach ($bad as $w) {
            if ($w !== '' && str_contains($t, $w)) {
                return true;
            }
        }

        return false;
    }
}
