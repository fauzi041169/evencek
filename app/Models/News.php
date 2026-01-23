<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class News extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $table = 'news';

    protected $guarded = [];

    protected $fillable = [
        'title',          // Judul berita
        'slug',           // URL-friendly version dari judul
        'content',        // Isi berita
        'image',          // Gambar berita
        'video_embed_url', // URL video embed (YouTube/Vimeo)
        'category_id',    // Kategori berita
        'author_id',      // Penulis berita
        'status',         // Status publikasi (draft/published)
        'published_at',   // Tanggal publikasi
        'featured',       // Berita unggulan (boolean)
        'views_count',    // Jumlah view
        'user_id',        // User ID
        // add other fields as needed
    ];

    protected $casts = [
        'published_at' => 'datetime',
        'featured' => 'boolean',
        'views_count' => 'integer',
    ];

    protected $dates = [
        'published_at',
    ];

    // Relasi ke kategori berita
    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    // Relasi ke penulis (user)
    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the route key for the model.
     *
     * @return string
     */
    public function getRouteKeyName()
    {
        return 'id';
    }

    public function getExcerpt($limit = 200)
    {
        $plainText = strip_tags($this->content);

        if (strlen($plainText) > $limit) {
            $plainText = substr($plainText, 0, $limit);
            // Pastikan tidak memotong kata di tengah
            $plainText = substr($plainText, 0, strrpos($plainText, ' ')).'...';
        }

        return $plainText;
    }

    public function scopePublished($query)
    {
        return $query->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    /**
     * Get the first media URL for the news
     */
    public function getFirstMediaUrl($collection = 'default', $conversion = '')
    {
        if ($this->image) {
            return asset('storage/'.$this->image);
        }

        return asset('storage/news/images/default.png');
    }

    public function comments()
    {
        return $this->morphMany(Comment::class, 'commentable')
            ->whereNull('parent_id')
            ->orderBy('created_at', 'desc');
    }

    public function allComments()
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function averageRating(): float
    {
        $avg = $this->allComments()->whereNull('parent_id')->whereNotNull('rating')->avg('rating');

        return $avg ? round((float) $avg, 1) : 0.0;
    }
}
