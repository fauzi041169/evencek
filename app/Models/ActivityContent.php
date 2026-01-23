<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityContent extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'title',
        'body',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }
}
