<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityChat extends Model
{
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'user_id',
        'sender_id',
        'message',
        'is_read',
        'is_read_by_user',
        'is_read_by_committee',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'is_read_by_user' => 'boolean',
        'is_read_by_committee' => 'boolean',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    // The participant involved in the chat
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // The person who sent the message
    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
