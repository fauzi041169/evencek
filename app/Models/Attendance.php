<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'activity_batch_id',
        'name',
        'jenis_absen',
        'description',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function batch()
    {
        return $this->belongsTo(ActivityBatch::class, 'activity_batch_id');
    }

    public function participants()
    {
        return $this->hasManyThrough(
            ActivityUser::class,
            Activity::class,
            'id', // Foreign key on activities table
            'activity_id', // Foreign key on activitiusers table
            'activity_id', // Local key on attendances table
            'id' // Local key on activities table
        );
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
