<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CategoryController extends Controller
{
    public function index()
    {
        $title = 'Data Kategori';
        $titlepage = 'Data Kategori';
        $categories = Category::all();

        return Inertia::render('Categories/Index', compact('categories', 'title', 'titlepage'));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|max:255',
            'description' => 'nullable',
        ]);

        // Generate slug yang unik
        $slug = Str::slug($request->name);
        $count = 1;

        // Cek apakah slug sudah ada
        while (Category::where('slug', $slug)->exists()) {
            $slug = Str::slug($request->name).'-'.$count;
            $count++;
        }

        $category = Category::create([
            'name' => $request->name,
            'description' => $request->description,
            'slug' => $slug,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Kategori berhasil ditambahkan',
                'category' => $category,
            ]);
        }

        return redirect()->route('kategori.index')->with('success', 'Kategori berhasil ditambahkan');
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|max:255',
            'description' => 'nullable',
        ]);

        $category->update($validated);

        return redirect()->route('kategori.index')
            ->with('success', 'Kategori berhasil diperbarui');
    }

    public function destroy(Request $request, Category $category)
    {
        try {
            $category->delete();

            if ($request->wantsJson()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Kategori berhasil dihapus',
                ]);
            }

            return redirect()->route('kategori.index')->with('success', 'Kategori berhasil dihapus');
        } catch (\Exception $e) {
            if ($request->wantsJson()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Kategori tidak dapat dihapus karena masih digunakan',
                ], 422);
            }

            return back()->with('error', 'Kategori tidak dapat dihapus karena masih digunakan');
        }
    }
}
