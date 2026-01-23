<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Province extends Model
{
    // use HasCustomUid; // Removed to allow standard IDs
    public $incrementing = false;
    protected $keyType = 'string';

    protected $table = 'provinces';

    protected $guarded = [];

    public function regencies(): HasMany
    {
        return $this->hasMany(Regency::class);
    }

    public function districts()
    {
        return $this->hasMany(District::class);
    }


}
