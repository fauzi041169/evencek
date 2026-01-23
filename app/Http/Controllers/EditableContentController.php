<?php

namespace App\Http\Controllers;

use App\Models\EditableContent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Mews\Purifier\Facades\Purifier;

class EditableContentController extends Controller
{
    /**
     * GET /editable-contents?page=/path
     * Public endpoint: memuat konten yang telah disimpan untuk halaman tertentu.
     */
    public function index(Request $request)
    {
        $page = $request->query('page', '/');
        $items = EditableContent::where('page_path', $page)->get(['selector', 'content_html', 'styles_json']);

        return response()->json(['data' => $items]);
    }

    /**
     * POST /editable-contents
     * Body: page_path, selector, content_html, styles_json
     * Hanya admin/superadmin yang boleh menyimpan.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        if (! in_array($user->role, ['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'page_path' => 'required|string|max:191',
            'selector' => 'required|string|max:191',
            'content_html' => 'nullable|string',
            'styles_json' => 'nullable',
        ]);

        // Sanitize HTML to prevent XSS; allow only safe tags/styles per config/purifier.php
        $safeHtml = '';
        if (! empty($validated['content_html'])) {
            $safeHtml = Purifier::clean($validated['content_html'], 'default');
        }

        // Normalize and whitelist styles: only allow text color for now
        $styles = [];
        if (! empty($validated['styles_json'])) {
            try {
                $raw = is_string($validated['styles_json'])
                    ? json_decode($validated['styles_json'], true)
                    : (array) $validated['styles_json'];
                if (is_array($raw)) {
                    if (isset($raw['color'])) {
                        $color = trim((string) $raw['color']);
                        // Accept valid hex/rgb/hsl values; simple validation to avoid JS injection
                        $isHex = preg_match('/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/', $color);
                        $isRgb = preg_match('/^rgb\s*\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/', $color);
                        $isRgba = preg_match('/^rgba\s*\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/', $color);
                        $isHsl = preg_match('/^hsl\s*\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)$/', $color);
                        if ($isHex || $isRgb || $isRgba || $isHsl) {
                            $styles['color'] = $color;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // Ignore invalid styles
            }
        }

        $item = EditableContent::updateOrCreate(
            ['page_path' => $validated['page_path'], 'selector' => $validated['selector']],
            [
                'content_html' => $safeHtml,
                'styles_json' => json_encode($styles),
                'updated_by' => $user->id,
            ]
        );

        return response()->json(['message' => 'Saved', 'data' => $item]);
    }
}
