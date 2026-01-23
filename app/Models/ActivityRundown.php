<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityRundown extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $table = 'activity_rundowns';

    protected $fillable = [
        'activity_id',
        'activity_batch_id',
        'rundown_date',
        'start_time',
        'end_time',
        'title',
        'description',
        'speaker',
        'location',
        'order',
    ];

    protected $casts = [
        'order' => 'integer',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function batch()
    {
        return $this->belongsTo(ActivityBatch::class, 'activity_batch_id');
    }
}
