<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityParticipantGroup extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'name',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function participants()
    {
        return $this->hasMany(ActivityUser::class, 'activity_participant_group_id');
    }
}
