<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventActivityQuestion extends Model
{
    use HasCustomUid, HasFactory;

    protected $fillable = [
        'event_activity_id',
        'question_text',
        'type',
        'options',
        'order',
        'is_required',
    ];

    protected $casts = [
        'options' => 'array',
        'is_required' => 'boolean',
    ];

    public function eventActivity()
    {
        return $this->belongsTo(EventActivity::class);
    }

    public function activityOptions()
    {
        return $this->hasMany(EventActivityOption::class, 'event_activity_question_id')->orderBy('order');
    }
}
