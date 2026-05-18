<?php

namespace App\Http\Controllers;

use App\Helpers\ImageHelper;
use App\Models\Partner;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class PartnerController extends Controller
{
    public function index()
    {
        $partners = Partner::all();

        return Inertia::render('Partners/Index', compact('partners'));
    }

    public function create()
    {
        return Inertia::render('Partners/Create');
    }

    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'website_url' => 'nullable|url',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            $file = $request->file('logo');
            $path = ImageHelper::storeCompressedUploadedImage($file, 'partners', 'public', [
                'max_width' => 800,
                'max_height' => 800,
                'quality' => 85,
                'format' => 'webp',
            ]);
            $filename = basename($path);

            $validatedData['logo'] = $path;
        }

        Partner::create($validatedData);

        return redirect()->route('partners.index')->with('success', 'Mitra berhasil ditambahkan');
    }

    public function edit(Partner $partner)
    {
        return Inertia::render('Partners/Edit', compact('partner'));
    }

    public function update(Request $request, Partner $partner)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'website_url' => 'nullable|url',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($request->hasFile('logo')) {
            // Hapus logo lama jika ada
            if ($partner->logo && Storage::disk('public')->exists($partner->logo)) {
                Storage::disk('public')->delete($partner->logo);
            }

            $file = $request->file('logo');
            $path = ImageHelper::storeCompressedUploadedImage($file, 'partners', 'public', [
                'max_width' => 800,
                'max_height' => 800,
                'quality' => 85,
                'format' => 'webp',
            ]);

            $validated['logo'] = $path;
        }

        $partner->update($validated);

        return redirect()->route('partners.index')
            ->with('success', 'Mitra berhasil diperbarui.');
    }

    public function destroy(Partner $partner)
    {
        if ($partner->logo) {
            if (Storage::disk('public')->exists($partner->logo)) {
                Storage::disk('public')->delete($partner->logo);
            } elseif (! str_contains($partner->logo, '/') && Storage::disk('public')->exists('partners/'.$partner->logo)) {
                Storage::disk('public')->delete('partners/'.$partner->logo);
            }
        }

        $partner->delete();

        return redirect()->route('partners.index')
            ->with('success', 'Mitra berhasil dihapus.');
    }

    public function list()
    {
        $partners = Partner::paginate(10);

        return Inertia::render('Partners/Index', compact('partners'));
    }
}
