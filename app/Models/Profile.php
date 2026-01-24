<?php

namespace App\Models;

use App\Traits\HasCustomUid;
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

        // Hapus foto lama saat update foto baru
        static::updating(function ($profile) {
            if ($profile->isDirty('foto') && $profile->getOriginal('foto')) {
                $oldPhotoPath = public_path('assets/images/profilefoto/'.$profile->getOriginal('foto'));
                if (file_exists($oldPhotoPath)) {
                    unlink($oldPhotoPath);
                }
            }

            if ($profile->isDirty('cover_image') && $profile->getOriginal('cover_image')) {
                $oldCoverPath = public_path('assets/images/profilecover/'.$profile->getOriginal('cover_image'));
                if (file_exists($oldCoverPath)) {
                    unlink($oldCoverPath);
                }
            }
        });

        // Hapus foto saat profile dihapus
        static::deleting(function ($profile) {
            if ($profile->foto) {
                $photoPath = public_path('assets/images/profilefoto/'.$profile->foto);
                if (file_exists($photoPath)) {
                    unlink($photoPath);
                }
            }

            if ($profile->cover_image) {
                $coverPath = public_path('assets/images/profilecover/'.$profile->cover_image);
                if (file_exists($coverPath)) {
                    unlink($coverPath);
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
        if ($this->foto) {
            $photoPath = public_path('assets/images/profilefoto/'.$this->foto);

            if (file_exists($photoPath)) {
                return '/assets/images/profilefoto/'.$this->foto;
            }
        }

        return '/assets/images/profilefoto/default-profile.png';
    }

    public function getCoverImageUrlAttribute()
    {
        if ($this->cover_image) {
            $coverPath = public_path('assets/images/profilecover/'.$this->cover_image);

            if (file_exists($coverPath)) {
                return '/assets/images/profilecover/'.$this->cover_image;
            }
        }

        return '/assets/images/profilecover/default-cover.png';
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
