<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Model;

class Regency extends Model
{
    use HasCustomUid;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'regencies';

    protected $guarded = [];

    public function province()
    {
        return $this->belongsTo(Province::class);
    }

    public function districts()
    {
        return $this->hasMany(District::class);
    }
}
