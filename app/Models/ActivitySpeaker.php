<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivitySpeaker extends Model
{
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'name',
        'title',
        'institution',
        'bio',
        'photo',
        'cv',
        'email',
        'phone',
        'instagram',
        'linkedin',
        'order',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }
}
