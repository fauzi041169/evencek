<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityParticipationType extends Model
{
    use \App\Traits\HasCustomUid;
    // use Concerns\LogsActivity; // Trait not found

    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'activity_id',
        'name',
        'description',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }
}
