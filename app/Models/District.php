<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class District extends Model
{
    // use HasCustomUid;
    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'districts';

    protected $guarded = [];

    public function regency(): BelongsTo
    {
        return $this->belongsTo(Regency::class);
    }

    public function province(): BelongsTo
    {
        return $this->belongsTo(Province::class);
    }
}
