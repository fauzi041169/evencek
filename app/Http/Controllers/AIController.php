<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;


use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AIController extends Controller
{
    public function chat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'history' => 'nullable|array',
        ]);

        $message = $request->input('message');
        $history = $request->input('history', []);

        $context = $this->getAppContext();
        
        // System Prompt - Optimized for speed (concise)
        $systemPrompt = "You are 'EVENTCEK AI', a helpful assistant for the EVENTCEK platform (Event Management & Membership).
        Rules:
        1. Concise & helpful answers.
        2. Speak same language as user.
        3. Features: Event mgmt, Membership, Certificates, Payments (Midtrans), Attendance QR, News.
        App: " . config('app.name');

        try {
            // Prioritize Gemini if API Key exists, even in dev, for much better speed/performance
            if (env('GEMINI_API_KEY')) {
                return $this->chatWithGemini($systemPrompt, $message, $history);
            }
            
            // Fallback to local Ollama if no Gemini Key
            return $this->chatWithOllama($systemPrompt, $message, $history);
        } catch (\Exception $e) {
            Log::error('AI Chat Error: ' . $e->getMessage());
            $isDev = app()->environment(['local', 'development']);
            return response()->json([
                'error' => 'Maaf, terjadi kesalahan saat menghubungi AI. Silakan coba lagi nanti.',
                'details' => $isDev ? $e->getMessage() : null
            ], 500);
        }
    }


    private function getAppContext()
    {
        // Gather some basic info about the app to give to AI
        $settings = \App\Models\Setting::first();
        $appName = $settings->app_name ?? config('app.name');
        
        // You could add more info here like available routes, features, etc.
        $features = [
            'Manajemen Kegiatan (Activity Management)',
            'Pendaftaran Anggota (Membership Registration)',
            'Sertifikat Otomatis (Automatic Certificates)',
            'Pembayaran Online (Midtrans Integration)',
            'Absensi QR Code (QR Attendance)',
            'Laporan Keuangan (Financial Reports)',
            'Manajemen Berita (News/Blog)',
        ];

        return "App Name: $appName\nFeatures: " . implode(', ', $features);
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
            $response = Http::timeout(60)->post($ollamaUrl, [
                'model' => $model,
                'messages' => $messages,
                'stream' => false,
            ]);

            if ($response->failed()) {
                $errorData = $response->json();
                if (isset($errorData['error']) && str_contains($errorData['error'], 'not found')) {
                    throw new \Exception("Model '$model' tidak ditemukan di Ollama. Silakan jalankan 'ollama pull $model' di terminal Anda.");
                }
                throw new \Exception('Ollama connection failed: ' . $response->body());
            }

            $data = $response->json();
            return response()->json([
                'response' => $data['message']['content'],
                'model' => $model . ' (Local)'
            ]);
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            throw new \Exception("Tidak dapat terhubung ke Ollama di $ollamaUrl. Pastikan aplikasi Ollama sudah dijalankan.");
        }
    }


    private function chatWithGemini($systemPrompt, $message, $history)
    {
        $apiKey = env('GEMINI_API_KEY');
        if (!$apiKey) {
            throw new \Exception('GEMINI_API_KEY not configured in production.');
        }

        $url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey";

        $contents = [];
        
        // System instruction for Gemini 1.5
        $systemInstruction = [
            'parts' => [
                ['text' => $systemPrompt]
            ]
        ];

        foreach ($history as $h) {
            $contents[] = [
                'role' => $h['role'] === 'user' ? 'user' : 'model',
                'parts' => [['text' => $h['content']]]
            ];
        }

        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $message]]
        ];

        $response = Http::timeout(30)->post($url, [
            'contents' => $contents,
            'system_instruction' => $systemInstruction,
        ]);

        if ($response->failed()) {
            throw new \Exception('Gemini connection failed: ' . $response->body());
        }

        $data = $response->json();
        $aiResponse = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'Maaf, saya tidak bisa mejawab itu.';

        return response()->json([
            'response' => $aiResponse,
            'model' => 'Gemini 1.5 Flash'
        ]);
    }
}

