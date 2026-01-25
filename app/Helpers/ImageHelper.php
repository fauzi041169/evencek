<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Storage;

class ImageHelper
{
    private static function absolute($path)
    {
        if (! $path) {
            return null;
        }
        $normalized = ltrim($path, '/');
        $base = request()->getSchemeAndHttpHost();

        return $base.'/'.$normalized;
    }

    public static function getImageUrl($imagePath, $defaultImage = 'images/activities/defoult.png', $folderPrefix = null)
    {
        if (empty($imagePath)) {
            if (str_starts_with($defaultImage, 'http')) return $defaultImage;
            return self::absolute(Storage::url($defaultImage));
        }

        if (str_starts_with($imagePath, 'http')) {
            return $imagePath;
        }

        // Apply folder prefix if provided and path has no directory separator
        if ($folderPrefix && !str_contains($imagePath, '/')) {
            $imagePath = $folderPrefix . '/' . $imagePath;
        }

        if (Storage::disk('public')->exists($imagePath)) {
            return self::absolute(Storage::url($imagePath));
        }

        // Try removing 'public/' or 'storage/' prefix if present and check again
        $cleanPath = ltrim($imagePath, '/');
        if (str_starts_with($cleanPath, 'storage/')) {
            $cleanPath = substr($cleanPath, 8);
        } elseif (str_starts_with($cleanPath, 'public/')) {
            $cleanPath = substr($cleanPath, 7);
        }

        if (Storage::disk('public')->exists($cleanPath)) {
            return self::absolute(Storage::url($cleanPath));
        }

        if (str_starts_with($defaultImage, 'http')) return $defaultImage;
        return self::absolute(Storage::url($defaultImage));
    }
}
