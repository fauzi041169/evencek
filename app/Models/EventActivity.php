<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventActivity extends Model
{
    use HasCustomUid, HasFactory;

    protected $fillable = [
        'activity_id',
        'title',
        'slug',
        'type',
        'description',
        'image',
        'start_time',
        'end_time',
        'is_active',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function questions()
    {
        return $this->hasMany(EventActivityQuestion::class)->orderBy('order');
    }

    public function responses()
    {
        return $this->hasMany(EventActivityResponse::class);
    }
}
