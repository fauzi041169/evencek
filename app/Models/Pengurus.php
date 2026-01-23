<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Model;

class Pengurus extends Model
{
    use HasCustomUid;

    protected $table = 'pengurus';

    protected $fillable = [
        'nama',
        'email',
        'kode',
        'gelar',
        'jabatan',
        'foto',
        'deskripsi',
        'periode',
        'linkedin_url',
        'twitter_url',
        'npa',
        'telepon',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
