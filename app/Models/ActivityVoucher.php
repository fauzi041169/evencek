<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ActivityVoucher extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'activity_id',
        'code',
        'usage_limit',
        'usage_count',
        'valid_until',
        'description',
        'is_active',
    ];

    protected $casts = [
        'usage_limit' => 'integer',
        'usage_count' => 'integer',
        'valid_until' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }
}
