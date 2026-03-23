<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EventActivityOption extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_activity_question_id',
        'value',
        'image',
        'description',
        'order',
    ];

    public function question()
    {
        return $this->belongsTo(EventActivityQuestion::class, 'event_activity_question_id');
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->id)) {
                $model->id = \Illuminate\Support\Str::random(6);
            }
        });
    }

    public $incrementing = false;

    protected $keyType = 'string';
}
