<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityMaterial extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'activity_batch_id',
        'name',
        'file_name',
        'file_path',
        'file_type',
        'mime_type',
        'file_size',
        'description',
        'uploaded_by',
        'cover_image_path',
    ];

    protected $casts = [
        'file_size' => 'integer',
    ];

    /**
     * Get the activity that owns the material
     */
    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function batch()
    {
        return $this->belongsTo(ActivityBatch::class, 'activity_batch_id');
    }

    /**
     * Get the user who uploaded the material
     */
    public function uploadedBy()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    /**
     * Get file extension from file name
     */
    public function getFileExtensionAttribute()
    {
        return pathinfo($this->file_name, PATHINFO_EXTENSION);
    }

    /**
     * Get human readable file size
     */
    public function getFormattedFileSizeAttribute()
    {
        $bytes = $this->file_size;
        $units = ['B', 'KB', 'MB', 'GB'];

        for ($i = 0; $bytes > 1024 && $i < count($units) - 1; $i++) {
            $bytes /= 1024;
        }

        return round($bytes, 2).' '.$units[$i];
    }

    /**
     * Check if file is image
     */
    public function isImage()
    {
        return in_array($this->file_type, ['image']);
    }

    /**
     * Check if file is document
     */
    public function isDocument()
    {
        return in_array($this->file_type, ['pdf', 'ppt', 'doc']);
    }

    /**
     * Check if file is video
     */
    public function isVideo()
    {
        return $this->file_type === 'video';
    }

    /**
     * Check if file is audio
     */
    public function isAudio()
    {
        return $this->file_type === 'audio';
    }
}
