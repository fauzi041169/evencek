<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventActivityResponse extends Model
{
    use HasCustomUid, HasFactory;

    protected $fillable = [
        'event_activity_id',
        'user_id',
        'answers',
        'score',
    ];

    protected $casts = [
        'answers' => 'array',
        'score' => 'decimal:2',
    ];

    public function eventActivity()
    {
        return $this->belongsTo(EventActivity::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
