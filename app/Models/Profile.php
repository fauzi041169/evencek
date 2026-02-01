<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use App\Helpers\GenderHelper;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Profile extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = [
        'user_id',
        'no_hp',
        'nik',
        'pekerjaan',
        'instansi',
        'jabatan',
        'alamat',
        'foto',
        'cover_image',
        'province_id',
        'regency_id',
        'district_id',
        'other_province',
        'other_regency',
        'other_district',
        'jenis_kelamin',
        'birth_place',
        'birth_date',
        'additional_data',
        'bank_name',
        'account_name',
        'account_number',
    ];

    protected $casts = [
        'additional_data' => 'array',
        'birth_date' => 'date',
    ];

    protected $appends = [
        'foto_url',
        'cover_image_url',
    ];

    protected static function boot()
    {
        parent::boot();

        // Normalisasi dan Prediksi Gender sebelum simpan
        static::saving(function ($profile) {
            // 1. Normalisasi
            if (!empty($profile->jenis_kelamin)) {
                $profile->jenis_kelamin = GenderHelper::normalize($profile->jenis_kelamin);
            }

            // 2. Prediksi jika kosong
            if (empty($profile->jenis_kelamin)) {
                // Coba ambil nama dari relasi user
                $user = $profile->user;
                
                // Jika user belum terload (misal saat create baru via user_id), coba cari
                if (!$user && $profile->user_id) {
                    $user = \App\Models\User::find($profile->user_id);
                }

                if ($user && !empty($user->name)) {
                    $prediction = GenderHelper::predict($user->name);
                    if ($prediction) {
                        $profile->jenis_kelamin = $prediction;
                    }
                }
            }
        });

        // Hapus foto lama saat update foto baru
        static::updating(function ($profile) {
            if ($profile->isDirty('foto') && $profile->getOriginal('foto')) {
                $originalFoto = $profile->getOriginal('foto');
                // Check storage first
                if (\Illuminate\Support\Facades\Storage::disk('public')->exists($originalFoto)) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($originalFoto);
                } else {
                    // Fallback to legacy
                    $oldPhotoPath = public_path('assets/images/profilefoto/'.$originalFoto);
                    if (file_exists($oldPhotoPath)) {
                        @unlink($oldPhotoPath);
                    }
                }
            }

            if ($profile->isDirty('cover_image') && $profile->getOriginal('cover_image')) {
                $originalCover = $profile->getOriginal('cover_image');
                if (\Illuminate\Support\Facades\Storage::disk('public')->exists($originalCover)) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($originalCover);
                } else {
                    $oldCoverPath = public_path('assets/images/profilecover/'.$originalCover);
                    if (file_exists($oldCoverPath)) {
                        @unlink($oldCoverPath);
                    }
                }
            }
        });

        // Hapus foto saat profile dihapus
        static::deleting(function ($profile) {
            if ($profile->foto) {
                if (\Illuminate\Support\Facades\Storage::disk('public')->exists($profile->foto)) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($profile->foto);
                } else {
                    $photoPath = public_path('assets/images/profilefoto/'.$profile->foto);
                    if (file_exists($photoPath)) {
                        unlink($photoPath);
                    }
                }
            }

            if ($profile->cover_image) {
                if (\Illuminate\Support\Facades\Storage::disk('public')->exists($profile->cover_image)) {
                    \Illuminate\Support\Facades\Storage::disk('public')->delete($profile->cover_image);
                } else {
                    $coverPath = public_path('assets/images/profilecover/'.$profile->cover_image);
                    if (file_exists($coverPath)) {
                        unlink($coverPath);
                    }
                }
            }
        });
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function province()
    {
        return $this->belongsTo(Province::class);
    }

    public function regency()
    {
        return $this->belongsTo(Regency::class);
    }

    public function district()
    {
        return $this->belongsTo(District::class);
    }

    public function getFotoUrlAttribute()
    {
        $default = asset('assets/images/profilefoto/default-profile.png');
        
        if (!$this->foto) {
            return $default;
        }

        // 1. If it's a modern storage path (starts with profile-photos/)
        if (str_starts_with($this->foto, 'profile-photos/')) {
            if (\Illuminate\Support\Facades\Storage::disk('public')->exists($this->foto)) {
                return \Illuminate\Support\Facades\Storage::url($this->foto);
            }
            // If it's supposed to be in storage but isn't there, DON'T check assets.
            return $default;
        }
        
        // 2. If it's a raw GUID/filename (usually older storage or direct upload)
        if (!str_contains($this->foto, '/') && strlen($this->foto) > 30) {
            $storagePath = 'profile-photos/' . $this->foto;
            if (\Illuminate\Support\Facades\Storage::disk('public')->exists($storagePath)) {
                return \Illuminate\Support\Facades\Storage::url($storagePath);
            }
        }

        // 3. Legacy path check (only for filenames that are NOT storage paths)
        if (!str_contains($this->foto, '/')) {
            $photoPath = public_path('assets/images/profilefoto/' . $this->foto);
            if (file_exists($photoPath) && !is_dir($photoPath)) {
                return asset('assets/images/profilefoto/' . $this->foto);
            }
        }

        // 4. Final attempt: any other string that might be a storage path
        if (str_contains($this->foto, '/') && \Illuminate\Support\Facades\Storage::disk('public')->exists($this->foto)) {
            return \Illuminate\Support\Facades\Storage::url($this->foto);
        }

        return $default;
    }

    public function getCoverImageUrlAttribute()
    {
        if ($this->cover_image) {
            // Check if it's a storage path (contains slash or starts with profile-covers)
            if (str_contains($this->cover_image, '/') || str_starts_with($this->cover_image, 'profile-covers')) {
                return \Illuminate\Support\Facades\Storage::url($this->cover_image);
            }

            $coverPath = public_path('assets/images/profilecover/'.$this->cover_image);

            if (file_exists($coverPath)) {
                return asset('assets/images/profilecover/'.$this->cover_image);
            }
        }

        return asset('assets/images/profilecover/default-cover.png');
    }

    public function getFullAddressAttribute()
    {
        $parts = array_filter([
            $this->alamat,
            $this->district_id ? $this->district->name : $this->other_district,
            $this->regency_id ? $this->regency->name : $this->other_regency,
            $this->province_id ? $this->province->name : $this->other_province,
        ]);

        return implode(', ', $parts);
    }
}
