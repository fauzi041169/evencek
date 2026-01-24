<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Comment;
use App\Models\News;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Mews\Purifier\Facades\Purifier;
use Inertia\Inertia;

class NewsController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth')->except(['index', 'show', 'list', 'search', 'category']);
    }

    public function index()
    {
        $queryText = request('query');
        $hasSearch = is_string($queryText) && strlen(trim($queryText)) > 0;
        // Mengambil 3 berita terbaru untuk section "Berita Terbaru"
        // Jika ada published_at, gunakan scope published, jika tidak gunakan latest saja
        $featuredNews = News::with('category')
            ->where(function ($query) {
            $query->whereNotNull('published_at')
                ->where('published_at', '<=', now())
                ->orWhereNull('published_at');
        })
            ->latest()
            ->take(3)
            ->get();

        // Mengambil semua berita untuk section "Semua Berita" dengan pagination
        $allNewsQuery = News::with('category')->where(function ($query) {
            $query->whereNotNull('published_at')
                ->where('published_at', '<=', now())
                ->orWhereNull('published_at');
        });
        if ($hasSearch) {
            $q = trim($queryText);
            $allNewsQuery->where(function ($qq) use ($q) {
                $qq->where('title', 'like', '%'.$q.'%')
                    ->orWhere('content', 'like', '%'.$q.'%');
            });
        }
        $allNews = $allNewsQuery->latest()->paginate(12)->withQueryString();

        // Total count untuk badge
        if ($hasSearch) {
            $totalNews = $allNews->total();
        } else {
            $totalNews = News::where(function ($query) {
                $query->whereNotNull('published_at')
                    ->where('published_at', '<=', now())
                    ->orWhereNull('published_at');
            })->count();
        }

        $categories = Category::all();

        return Inertia::render('News/Index', compact('featuredNews', 'allNews', 'totalNews', 'categories'));
    }

    public function create()
    {
        $categories = Category::all();

        // Get subscription limits for creator
        $subscriptionLimits = null;
        $canCreate = ['allowed' => true, 'message' => ''];
        $currentNewsCount = 0;

        if (auth()->check() && ! auth()->user()->isSuperAdmin() && auth()->user()->isCreator()) {
            $subscriptionLimits = auth()->user()->getSubscriptionLimits();
            $canCreate = auth()->user()->canCreateNews();
            $currentNewsCount = \App\Models\News::where('author_id', auth()->id())->count();
        }

        return Inertia::render('News/Create', compact('categories', 'subscriptionLimits', 'canCreate', 'currentNewsCount'));
    }

    public function store(Request $request)
    {
        try {
            $user = auth()->user();

            // Check subscription limits for creators
            if ($user && ! $user->isSuperAdmin() && $user->isCreator()) {
                $canCreate = $user->canCreateNews();
                if (! $canCreate['allowed']) {
                    return redirect()->back()
                        ->withInput()
                        ->with('error', $canCreate['message']);
                }
            }

            // Validasi dengan pesan error yang lebih detail
            $validator = Validator::make($request->all(), [
                'title' => 'required|max:255',
                'category_id' => 'required|exists:categories,id',
                'content' => 'required',
                'status' => 'required|in:draft,published',
                'image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:512000', // max 500MB
                'featured' => 'nullable|boolean',
            ], [
                'title.required' => 'Judul berita harus diisi',
                'title.max' => 'Judul berita maksimal 255 karakter',
                'category_id.required' => 'Kategori harus dipilih',
                'category_id.exists' => 'Kategori yang dipilih tidak valid',
                'content.required' => 'Konten berita harus diisi',
                'status.required' => 'Status harus dipilih',
                'status.in' => 'Status yang dipilih tidak valid',
                'image.image' => 'File yang diupload harus berupa gambar',
                'image.mimes' => 'Format gambar harus JPG, PNG, atau GIF',
                'image.max' => 'Ukuran gambar maksimal 500MB',
            ]);

            if ($validator->fails()) {
                return redirect()->back()
                    ->withErrors($validator)
                    ->withInput();
            }

            $validated = $validator->validated();

            // Cek duplikasi judul secara eksplisit agar konsisten di semua driver DB
            if (News::where('title', $validated['title'])->exists()) {
                return redirect()->back()
                    ->with('error', 'Judul berita sudah ada dalam database.')
                    ->withInput();
            }

            // Generate slug dari title
            $validated['slug'] = Str::slug($validated['title']);

            // Cek apakah slug sudah ada
            $slugCount = News::where('slug', $validated['slug'])->count();
            if ($slugCount > 0) {
                $validated['slug'] = $validated['slug'].'-'.time();
            }

            // Handle upload gambar utama jika ada
            if ($request->hasFile('image')) {
                try {
                    $file = $request->file('image');

                    // Validasi tambahan untuk file
                    if (! $file->isValid()) {
                        throw new \Exception('File upload tidak valid. Error: '.$file->getError());
                    }

                    // Cek ukuran file
                    $fileSize = $file->getSize();
                    $maxSize = 5 * 1024 * 1024; // 5MB
                    if ($fileSize > $maxSize) {
                        throw new \Exception('Ukuran file terlalu besar. Maksimal 5MB, file Anda: '.
                            round($fileSize / (1024 * 1024), 2).'MB');
                    }

                    // Cek tipe MIME
                    $allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
                    if (! in_array($file->getMimeType(), $allowedMimes)) {
                        throw new \Exception('Format file tidak didukung. Gunakan JPG, PNG, atau GIF');
                    }

                    $fileName = time().'_'.uniqid().'.'.$file->getClientOriginalExtension();
                    
                    // Gunakan Storage facade untuk menyimpan file
                    $path = $file->storeAs('news/images', $fileName, 'public');

                    if (!$path) {
                        throw new \Exception('Gagal menyimpan file ke storage.');
                    }

                    $validated['image'] = 'news/images/'.$fileName;

                } catch (\Exception $e) {
                    \Log::error('Image upload error:', [
                        'message' => $e->getMessage(),
                        'file' => $file->getClientOriginalName(),
                        'size' => $file->getSize(),
                        'mime' => $file->getMimeType(),
                    ]);

                    return redirect()->back()
                        ->with('error', 'Gagal mengupload gambar: '.$e->getMessage())
                        ->withInput();
                }
            }

            // Set published_at jika status published
            if ($validated['status'] === 'published') {
                $validated['published_at'] = now();
            }

            // Set nilai default untuk featured
            $validated['featured'] = $request->has('featured') ? true : false;

            // Set author_id
            $validated['author_id'] = auth()->id();

            // Simpan konten apa adanya sebagai link biasa (tanpa embed)
            $content = Purifier::clean((string) ($validated['content'] ?? ''), 'default');
            // Proses gambar dalam konten (data URI -> simpan ke storage)
            if (preg_match_all('/<img[^>]+src="([^"]+)"/', $content, $matches)) {
                foreach ($matches[1] as $imageUrl) {
                    if (strpos($imageUrl, 'data:image') === 0) {
                        try {
                            $imageData = base64_decode(explode(',', $imageUrl)[1]);
                            
                            // Validate Base64 image content
                            $finfo = new \finfo(FILEINFO_MIME_TYPE);
                            $mimeType = $finfo->buffer($imageData);
                            
                            if (!in_array($mimeType, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
                                throw new \Exception('Format gambar base64 tidak valid: ' . $mimeType);
                            }

                            $extension = 'png';
                            if ($mimeType === 'image/jpeg') $extension = 'jpg';
                            if ($mimeType === 'image/gif') $extension = 'gif';
                            if ($mimeType === 'image/webp') $extension = 'webp';

                            $filename = 'konten_'.time().'_'.Str::random(10).'.'.$extension;
                            $path = 'news/content/'.$filename;

                            if (! Storage::disk('public')->put($path, $imageData)) {
                                throw new \Exception('Gagal menyimpan gambar konten');
                            }

                            $newUrl = '/storage/news/content/'.$filename;
                            $content = str_replace($imageUrl, $newUrl, $content);

                        } catch (\Exception $e) {
                            \Log::error('Content image processing error:', [
                                'message' => $e->getMessage(),
                            ]);

                            return redirect()->back()
                                ->with('error', 'Gagal memproses gambar dalam konten: '.$e->getMessage())
                                ->withInput();
                        }
                    }
                }
            }
            $validated['content'] = $content;

            // Buat berita baru
            $news = News::create($validated);

            return redirect()->route('news.index')
                ->with('success', 'Berita berhasil ditambahkan');

        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Validation error creating news:', [
                'errors' => $e->errors(),
                'input' => $request->all(),
            ]);

            return redirect()->back()
                ->withErrors($e->errors())
                ->withInput();

        } catch (\Exception $e) {
            \Log::error('Error creating news:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'input' => $request->except(['content']), // Log input kecuali konten yang panjang
            ]);

            $errorMessage = 'Terjadi kesalahan saat menyimpan berita. ';

            // Berikan pesan error yang lebih spesifik
            if (strpos($e->getMessage(), 'SQLSTATE') !== false) {
                if (strpos($e->getMessage(), 'Duplicate entry') !== false) {
                    $errorMessage .= 'Judul berita sudah ada dalam database.';
                } else {
                    $errorMessage .= 'Kesalahan database: '.$e->getMessage();
                }
            } elseif (strpos($e->getMessage(), 'Permission denied') !== false) {
                $errorMessage .= 'Tidak ada izin untuk menyimpan file. Hubungi administrator.';
            } elseif (strpos($e->getMessage(), 'disk full') !== false) {
                $errorMessage .= 'Ruang penyimpanan penuh. Hubungi administrator.';
            } else {
                $errorMessage .= $e->getMessage();
            }

            return redirect()->back()
                ->with('error', $errorMessage)
                ->withInput();
        }
    }

    public function show(News $news)
    {
        try {
            $news->load(['category', 'author', 'comments.user', 'comments.children.user']);
            $news->increment('views_count');
            // Rating statistics (only top-level comments with rating)
            $ratingsQuery = $news->allComments()->whereNull('parent_id')->whereNotNull('rating');
            $averageRating = $news->averageRating();
            $ratingCounts = [];
            for ($i = 1; $i <= 5; $i++) {
                $ratingCounts[$i] = (clone $ratingsQuery)->where('rating', $i)->count();
            }
            $totalRatings = array_sum($ratingCounts);

            // Current user's rating (if logged in)
            $userRating = null;
            if (auth()->check()) {
                $userRating = Comment::where('commentable_type', News::class)
                    ->where('commentable_id', $news->id)
                    ->where('user_id', auth()->id())
                    ->whereNull('parent_id')
                    ->whereNotNull('rating')
                    ->value('rating');
            }

            return Inertia::render('News/Show', compact('news', 'averageRating', 'ratingCounts', 'totalRatings', 'userRating'));
        } catch (\Exception $e) {
            return redirect()->route('news.list')
                ->with('error', 'Berita tidak ditemukan');
        }
    }

    public function edit($id)
    {
        \Log::info('Attempting to edit news with ID: '.$id);

        try {
            $news = News::findOrFail($id);

            // Check if creator can only edit their own news
            if (! auth()->user()->isSuperAdmin() && auth()->user()->isCreator() && $news->author_id !== auth()->id()) {
                abort(403, 'Anda hanya dapat mengedit berita yang Anda buat sendiri.');
            }

            \Log::info('News found:', $news->toArray());

            $categories = Category::all();

            return Inertia::render('News/Edit', compact('news', 'categories'));
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            \Log::error('News not found with ID: '.$id, [
                'error' => $e->getMessage(),
            ]);
            abort(404, 'Berita dengan ID '.$id.' tidak ditemukan.');
        } catch (\Exception $e) {
            \Log::error('An unexpected error occurred in edit method for news ID: '.$id, [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return redirect()->route('news.list')
                ->with('error', 'Terjadi kesalahan saat mencoba mengedit berita.');
        }
    }

    public function update(Request $request, News $news)
    {
        try {
            // Check if creator can only update their own news
            if (! auth()->user()->isSuperAdmin() && auth()->user()->isCreator() && $news->author_id !== auth()->id()) {
                return redirect()->route('news.list')
                    ->with('error', 'Anda hanya dapat mengedit berita yang Anda buat sendiri.');
            }

            $validator = Validator::make($request->all(), [
                'title' => 'required|max:255',
                'content' => 'required',
                'category_id' => 'required|exists:categories,id',
                'status' => 'required|in:draft,published',
                'image' => 'nullable|image|mimes:jpeg,png,gif|max:512000', // max 500MB (512000 KB)
            ]);

            if ($validator->fails()) {
                return back()
                    ->withErrors($validator)
                    ->withInput();
            }

            $data = $request->except(['image']);
            // Bersihkan konten HTML pada update
            if (isset($data['content'])) {
                $data['content'] = Purifier::clean((string) $data['content'], 'default');
            }

            // Handle image upload
            if ($request->hasFile('image')) {
                // Delete old image if exists
                if ($news->image && File::exists(public_path('storage/'.$news->image))) {
                    File::delete(public_path('storage/'.$news->image));
                }

                $image = $request->file('image');
                $fileName = time().'_'.uniqid().'.'.$image->getClientOriginalExtension();
                $image->move(public_path('storage/news/images'), $fileName);
                $data['image'] = 'news/images/'.$fileName;
            }

            $news->update($data);

            return redirect()
                ->route('news.list')
                ->with('success', 'Berita berhasil diperbarui');
        } catch (\Exception $e) {
            return back()
                ->with('error', 'Gagal memperbarui berita: '.$e->getMessage())
                ->withInput();
        }
    }

    public function destroy(News $news)
    {
        try {
            // Check if creator can only delete their own news
            if (! auth()->user()->isSuperAdmin() && auth()->user()->isCreator() && $news->author_id !== auth()->id()) {
                return redirect()->route('news.list')
                    ->with('error', 'Anda hanya dapat menghapus berita yang Anda buat sendiri.');
            }

            // Hapus gambar jika ada
            if ($news->image && File::exists(public_path('storage/'.$news->image))) {
                File::delete(public_path('storage/'.$news->image));
            }

            $news->delete();

            return redirect()->back()
                ->with('success', 'Berita berhasil dihapus');
        } catch (\Exception $e) {
            return redirect()->back()
                ->with('error', 'Terjadi kesalahan saat menghapus berita');
        }
    }

    public function uploadImage(Request $request)
    {
        try {
            if (! $request->hasFile('image')) {
                return response()->json([
                    'success' => false,
                    'message' => 'Tidak ada file yang diupload. Silakan pilih file gambar terlebih dahulu.',
                ], 400);
            }

            $file = $request->file('image');

            // Validasi file dengan pesan error yang lebih detail
            $validator = Validator::make(['image' => $file], [
                'image' => 'required|image|mimes:jpeg,png,gif|max:512000', // max 500MB
            ], [
                'image.required' => 'File gambar harus dipilih',
                'image.image' => 'File yang diupload harus berupa gambar',
                'image.mimes' => 'Format gambar harus JPG, PNG, atau GIF',
                'image.max' => 'Ukuran gambar maksimal 500MB',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => $validator->errors()->first(),
                ], 422);
            }

            // Validasi tambahan untuk file
            if (! $file->isValid()) {
                $errorMessages = [
                    UPLOAD_ERR_INI_SIZE => 'Ukuran file melebihi batas maksimal yang diizinkan server',
                    UPLOAD_ERR_FORM_SIZE => 'Ukuran file melebihi batas maksimal yang diizinkan form',
                    UPLOAD_ERR_PARTIAL => 'File hanya terupload sebagian',
                    UPLOAD_ERR_NO_FILE => 'Tidak ada file yang diupload',
                    UPLOAD_ERR_NO_TMP_DIR => 'Folder temporary tidak ditemukan',
                    UPLOAD_ERR_CANT_WRITE => 'Gagal menulis file ke disk',
                    UPLOAD_ERR_EXTENSION => 'Upload dihentikan oleh ekstensi PHP',
                ];

                $errorMessage = $errorMessages[$file->getError()] ?? 'Error upload tidak diketahui';

                return response()->json([
                    'success' => false,
                    'message' => 'File upload tidak valid: '.$errorMessage,
                ], 400);
            }

            // Cek ukuran file
            $fileSize = $file->getSize();
            $maxSize = 500 * 1024 * 1024; // 500MB
            if ($fileSize > $maxSize) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ukuran file terlalu besar. Maksimal 500MB, file Anda: '.
                        round($fileSize / (1024 * 1024), 2).'MB',
                ], 413);
            }

            // Cek tipe MIME
            $allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
            $fileMime = $file->getMimeType();
            if (! in_array($fileMime, $allowedMimes)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format file tidak didukung. File Anda: '.$fileMime.'. Gunakan JPG, PNG, atau GIF',
                ], 422);
            }

            // Generate nama file unik
            $fileName = time().'_'.uniqid().'.'.$file->getClientOriginalExtension();
            
            // Gunakan Storage facade
            $path = $file->storeAs('news/images', $fileName, 'public');

            if (!$path) {
                \Log::error('Failed to store uploaded file:', [
                    'original_name' => $file->getClientOriginalName(),
                    'error' => 'Storage::storeAs returned false',
                ]);

                return response()->json([
                    'success' => false,
                    'message' => 'Gagal menyimpan file. Hubungi administrator.',
                ], 500);
            }

            // Generate URL untuk file yang diupload
            $url = '/storage/news/images/'.$fileName;

            \Log::info('Image uploaded successfully:', [
                'original_name' => $file->getClientOriginalName(),
                'stored_name' => $fileName,
                'size' => $fileSize,
                'mime' => $fileMime,
                'url' => $url,
            ]);

            return response()->json([
                'success' => true,
                'url' => $url,
                'filename' => $fileName,
            ]);

        } catch (\Exception $e) {
            \Log::error('Image upload error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'file_info' => $request->hasFile('image') ? [
                    'original_name' => $request->file('image')->getClientOriginalName(),
                    'size' => $request->file('image')->getSize(),
                    'mime' => $request->file('image')->getMimeType(),
                ] : 'No file',
            ]);

            $errorMessage = 'Gagal mengupload gambar. ';

            // Berikan pesan error yang lebih spesifik
            if (strpos($e->getMessage(), 'Permission denied') !== false) {
                $errorMessage .= 'Tidak ada izin untuk menyimpan file. Hubungi administrator.';
            } elseif (strpos($e->getMessage(), 'disk full') !== false) {
                $errorMessage .= 'Ruang penyimpanan penuh. Hubungi administrator.';
            } elseif (strpos($e->getMessage(), 'No space left on device') !== false) {
                $errorMessage .= 'Ruang penyimpanan penuh. Hubungi administrator.';
            } else {
                $errorMessage .= $e->getMessage();
            }

            return response()->json([
                'success' => false,
                'message' => $errorMessage,
            ], 500);
        }
    }

    public function list()
    {
        $query = News::latest()->with(['category', 'author']);

        if (auth()->check() && ! auth()->user()->isSuperAdmin() && auth()->user()->isCreator()) {
            $query->where('author_id', auth()->id());
        }

        $perPageParam = request('per_page');
        if (request()->boolean('all') || ($perPageParam === 'all')) {
            $news = $query->get();
        } else {
            $allowed = [10, 25, 50, 100];
            $perPage = (int) ($perPageParam ?: 10);
            if (! in_array($perPage, $allowed, true)) {
                $perPage = 10;
            }
            $news = $query->paginate($perPage)->withQueryString();
        }

        return Inertia::render('News/List', compact('news'));
    }

    public function search(Request $request)
    {
        $query = $request->get('query');

        $latestNews = News::where('title', 'like', "%{$query}%")
            ->orWhere('content', 'like', "%{$query}%")
            ->latest()
            ->paginate(9);

        $categories = Category::all();

        return Inertia::render('News/Index', compact('latestNews', 'categories'));
    }

    public function category(Category $category)
    {
        try {
            $latestNews = News::where('category_id', $category->id)
                ->latest()
                ->paginate(9);

            $categories = Category::all();

            return Inertia::render('News/Index', compact('latestNews', 'categories'));
        } catch (\Exception $e) {
            return redirect()->route('news.index')
                ->with('error', 'Kategori tidak ditemukan');
        }
    }

    /**
     * Normalize common video links to embeddable URLs (YouTube, Vimeo)
     */
    private function normalizeVideoEmbedUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }
        $u = trim($url);
        if (preg_match('#(youtube\.com/watch\?v=|youtu\.be/)([A-Za-z0-9_-]{6,})#', $u, $m)) {
            return 'https://www.youtube.com/embed/'.$m[2];
        }
        if (preg_match('#youtube\.com/shorts/([A-Za-z0-9_-]{6,})#', $u, $m)) {
            return 'https://www.youtube.com/embed/'.$m[1];
        }
        if (preg_match('#vimeo\.com/(\d+)#', $u, $m)) {
            return 'https://player.vimeo.com/video/'.$m[1];
        }
        if (preg_match('#(youtube\.com/embed/|player\.vimeo\.com/video/)#', $u)) {
            return $u;
        }

        return $u;
    }

    /**
     * Convert YouTube/Vimeo links (plain text or <a href>) into iframe embeds.
     */
    private function convertVideoLinksToEmbed(string $html): string
    {
        $convert = function ($url) {
            $embed = $this->normalizeVideoEmbedUrl($url);
            if (! $embed) {
                return null;
            }

            return '<iframe class="ql-video" src="'.e($embed).'" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
        };

        // Replace anchor tags with embed
        $html = preg_replace_callback('/<a[^>]+href="([^"]+)"[^>]*>[^<]*<\/a>/i', function ($m) use ($convert) {
            $iframe = $convert($m[1]);

            return $iframe ?: $m[0];
        });

        // Replace plain URLs inside paragraph or div text
        $pattern = '~(https?://(?:www\.)?(?:youtube\.com/watch\?v=[A-Za-z0-9_-]{6,}|youtu\.be/[A-Za-z0-9_-]{6,}|vimeo\.com/\d+))~i';
        $html = preg_replace_callback($pattern, function ($m) use ($convert) {
            $iframe = $convert($m[1]);

            return $iframe ?: $m[1];
        }, $html);

        return $html;
    }
}
