<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
        'description',
    ];

    protected $casts = [
        'value' => 'string',
    ];

    /**
     * Get setting by key
     */
    public static function get($key, $default = null)
    {
        try {
            $setting = static::where('key', $key)->first();

            return $setting ? $setting->value : $default;
        } catch (\Throwable $e) {
            // Ketika tabel belum tersedia (mis. dalam test tanpa migrasi), kembalikan default
            return $default;
        }
    }

    /**
     * Set setting value
     */
    public static function set($key, $value, $type = 'string', $group = 'general', $description = null)
    {
        $result = static::updateOrCreate(
            ['key' => $key],
            [
                'value' => $value,
                'type' => $type,
                'group' => $group,
                'description' => $description,
            ]
        );
        Cache::forget('inertia_app_settings');

        return $result;
    }

    /**
     * Get all color settings
     */
    public static function getColors()
    {
        try {
            return static::where('group', 'colors')->pluck('value', 'key')->toArray();
        } catch (\Throwable $e) {
            return [];
        }
    }
}
