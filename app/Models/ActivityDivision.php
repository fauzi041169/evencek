<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityDivision extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $table = 'activity_divisions';

    protected $fillable = [
        'activity_id',
        'activity_batch_id',
        'name',
        'description',
        'leader_name',
        'leader_phone',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function batch()
    {
        return $this->belongsTo(ActivityBatch::class, 'activity_batch_id');
    }

    public function requirements()
    {
        return $this->hasMany(ActivityDivisionRequirement::class, 'activity_division_id');
    }
}
