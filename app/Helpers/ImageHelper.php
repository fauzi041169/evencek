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

    public static function getImageUrl($imagePath)
    {
        $defaultImage = 'images/activities/defoult.png';

        if (empty($imagePath)) {
            return self::absolute(Storage::url($defaultImage));
        }

        if (Storage::disk('public')->exists($imagePath)) {
            return self::absolute(Storage::url($imagePath));
        }

        return self::absolute(Storage::url($defaultImage));
    }
}
