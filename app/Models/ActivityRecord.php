<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Model;

class ActivityRecord extends Model
{
    use HasCustomUid;

    protected $table = 'activity_records';

    protected $fillable = [
        'user_id',
        'activity_id',
        'activity_batch_id',
        'attendance_id',
        'status',
        'device_info',
        'location',
        'record_type',
        'description',
        'metadata',
    ];

    protected $casts = [
        'location' => 'array',
        'metadata' => 'array',
        'status' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function batch()
    {
        return $this->belongsTo(ActivityBatch::class, 'activity_batch_id');
    }

    public function attendance()
    {
        return $this->belongsTo(Attendance::class);
    }
}
