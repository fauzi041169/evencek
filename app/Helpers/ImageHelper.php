<?php

namespace App\Helpers;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

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
            if (str_starts_with($defaultImage, 'http')) {
                return $defaultImage;
            }

            return self::absolute(Storage::url($defaultImage));
        }

        if (str_starts_with($imagePath, 'http')) {
            return $imagePath;
        }

        // Apply folder prefix if provided and path has no directory separator
        if ($folderPrefix && ! str_contains($imagePath, '/')) {
            $imagePath = $folderPrefix.'/'.$imagePath;
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

        if (str_starts_with($defaultImage, 'http')) {
            return $defaultImage;
        }

        return self::absolute(Storage::url($defaultImage));
    }

    public static function storeCompressedUploadedImage(UploadedFile $file, string $directory, string $disk = 'public', array $options = []): string
    {
        $directory = trim($directory, '/');
        $extension = strtolower((string) $file->getClientOriginalExtension());
        $mimeType = strtolower((string) $file->getMimeType());

        if (in_array($extension, ['svg'], true) || $mimeType === 'image/svg+xml') {
            $name = self::uniqueName($extension ?: 'svg');

            return $file->storeAs($directory, $name, $disk);
        }

        if (in_array($extension, ['gif'], true) || $mimeType === 'image/gif') {
            $name = self::uniqueName($extension ?: 'gif');

            return $file->storeAs($directory, $name, $disk);
        }

        $binary = null;
        try {
            $binary = file_get_contents($file->getRealPath());
        } catch (\Throwable $e) {
            $binary = null;
        }

        if (! is_string($binary) || $binary === '') {
            $name = self::uniqueName($extension ?: 'jpg');

            return $file->storeAs($directory, $name, $disk);
        }

        $compressed = self::compressImageBinary($binary, [
            'source_mime' => $mimeType ?: null,
            'max_width' => $options['max_width'] ?? 1920,
            'max_height' => $options['max_height'] ?? 1920,
            'quality' => $options['quality'] ?? 80,
            'format' => $options['format'] ?? 'webp',
        ]);

        if (! $compressed || ! is_string($compressed['binary'] ?? null) || ($compressed['binary'] ?? '') === '') {
            $name = self::uniqueName($extension ?: 'jpg');

            return $file->storeAs($directory, $name, $disk);
        }

        $name = self::uniqueName($compressed['extension']);
        $path = $directory.'/'.$name;
        Storage::disk($disk)->put($path, $compressed['binary']);

        return $path;
    }

    public static function storeCompressedImageBinary(string $binary, string $directory, string $disk = 'public', array $options = []): array
    {
        $directory = trim($directory, '/');
        $compressed = self::compressImageBinary($binary, [
            'source_mime' => $options['source_mime'] ?? null,
            'max_width' => $options['max_width'] ?? 1920,
            'max_height' => $options['max_height'] ?? 1920,
            'quality' => $options['quality'] ?? 80,
            'format' => $options['format'] ?? 'webp',
        ]);

        if (! $compressed || ! is_string($compressed['binary'] ?? null) || ($compressed['binary'] ?? '') === '') {
            return ['path' => null, 'size' => null, 'mime' => null];
        }

        $name = self::uniqueName($compressed['extension']);
        $path = $directory.'/'.$name;
        Storage::disk($disk)->put($path, $compressed['binary']);

        return [
            'path' => $path,
            'size' => strlen($compressed['binary']),
            'mime' => $compressed['mime'],
        ];
    }

    public static function saveCompressedPublicImage(UploadedFile $file, string $publicDir, string $filenamePrefix, array $options = []): string
    {
        $publicDir = trim($publicDir, '/');
        $extension = strtolower((string) $file->getClientOriginalExtension());
        $mimeType = strtolower((string) $file->getMimeType());

        if (in_array($extension, ['svg'], true) || $mimeType === 'image/svg+xml') {
            $name = $filenamePrefix.'_'.time().'.'.($extension ?: 'svg');
            $absDir = public_path($publicDir);
            if (! File::exists($absDir)) {
                File::makeDirectory($absDir, 0755, true);
            }
            $file->move($absDir, $name);

            return $publicDir.'/'.$name;
        }

        if (in_array($extension, ['gif'], true) || $mimeType === 'image/gif') {
            $name = $filenamePrefix.'_'.time().'.'.($extension ?: 'gif');
            $absDir = public_path($publicDir);
            if (! File::exists($absDir)) {
                File::makeDirectory($absDir, 0755, true);
            }
            $file->move($absDir, $name);

            return $publicDir.'/'.$name;
        }

        $binary = null;
        try {
            $binary = file_get_contents($file->getRealPath());
        } catch (\Throwable $e) {
            $binary = null;
        }

        if (! is_string($binary) || $binary === '') {
            $name = $filenamePrefix.'_'.time().'.'.($extension ?: 'jpg');
            $absDir = public_path($publicDir);
            if (! File::exists($absDir)) {
                File::makeDirectory($absDir, 0755, true);
            }
            $file->move($absDir, $name);

            return $publicDir.'/'.$name;
        }

        $format = $options['format'] ?? 'webp';
        if (! in_array($format, ['webp', 'jpg', 'jpeg', 'png'], true)) {
            $format = 'webp';
        }
        if (($options['preserve_extension'] ?? false) === true) {
            $format = $extension ?: $format;
        }
        if ($format === 'jpeg') {
            $format = 'jpg';
        }

        $compressed = self::compressImageBinary($binary, [
            'source_mime' => $mimeType ?: null,
            'max_width' => $options['max_width'] ?? 1920,
            'max_height' => $options['max_height'] ?? 1920,
            'quality' => $options['quality'] ?? 80,
            'format' => $format,
        ]);

        if (! $compressed || ! is_string($compressed['binary'] ?? null) || ($compressed['binary'] ?? '') === '') {
            $name = $filenamePrefix.'_'.time().'.'.($extension ?: 'jpg');
            $absDir = public_path($publicDir);
            if (! File::exists($absDir)) {
                File::makeDirectory($absDir, 0755, true);
            }
            $file->move($absDir, $name);

            return $publicDir.'/'.$name;
        }

        $name = $filenamePrefix.'_'.time().'_'.Str::random(6).'.'.$compressed['extension'];
        $absDir = public_path($publicDir);
        if (! File::exists($absDir)) {
            File::makeDirectory($absDir, 0755, true);
        }
        file_put_contents($absDir.DIRECTORY_SEPARATOR.$name, $compressed['binary']);

        return $publicDir.'/'.$name;
    }

    private static function uniqueName(string $extension): string
    {
        $extension = ltrim(strtolower($extension), '.');

        return time().'_'.Str::random(10).'.'.$extension;
    }

    private static function compressImageBinary(string $binary, array $options = []): ?array
    {
        if (! function_exists('imagecreatefromstring')) {
            return null;
        }

        $sourceMime = strtolower((string) ($options['source_mime'] ?? ''));
        if ($sourceMime === 'image/gif' || $sourceMime === 'image/svg+xml') {
            return null;
        }

        $img = @imagecreatefromstring($binary);
        if (! $img) {
            return null;
        }

        $maxW = (int) ($options['max_width'] ?? 1920);
        $maxH = (int) ($options['max_height'] ?? 1920);
        $quality = (int) ($options['quality'] ?? 80);
        $format = strtolower((string) ($options['format'] ?? 'webp'));
        if ($format === 'jpeg') {
            $format = 'jpg';
        }
        if (! in_array($format, ['webp', 'jpg', 'png'], true)) {
            $format = 'webp';
        }

        $w = imagesx($img);
        $h = imagesy($img);
        if ($w <= 0 || $h <= 0) {
            imagedestroy($img);

            return null;
        }

        $scale = min($maxW / $w, $maxH / $h, 1);
        $targetW = max(1, (int) round($w * $scale));
        $targetH = max(1, (int) round($h * $scale));

        $dst = imagecreatetruecolor($targetW, $targetH);
        if (! $dst) {
            imagedestroy($img);

            return null;
        }

        if ($format === 'png') {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefilledrectangle($dst, 0, 0, $targetW, $targetH, $transparent);
        }

        imagecopyresampled($dst, $img, 0, 0, 0, 0, $targetW, $targetH, $w, $h);
        imagedestroy($img);

        ob_start();
        $ok = false;
        $outMime = null;
        $outExt = null;
        if ($format === 'webp' && function_exists('imagewebp')) {
            $ok = imagewebp($dst, null, max(0, min(100, $quality)));
            $outMime = 'image/webp';
            $outExt = 'webp';
        } elseif ($format === 'png' && function_exists('imagepng')) {
            $level = (int) round((100 - max(0, min(100, $quality))) / 11);
            $level = max(0, min(9, $level));
            $ok = imagepng($dst, null, $level);
            $outMime = 'image/png';
            $outExt = 'png';
        } else {
            $ok = imagejpeg($dst, null, max(30, min(95, $quality)));
            $outMime = 'image/jpeg';
            $outExt = 'jpg';
        }
        $out = ob_get_clean();
        imagedestroy($dst);

        if (! $ok || ! is_string($out) || $out === '') {
            return null;
        }

        return [
            'binary' => $out,
            'mime' => $outMime,
            'extension' => $outExt,
        ];
    }
}
