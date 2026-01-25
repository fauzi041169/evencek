<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityCommitteeStructure extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $table = 'activity_committee_structures';

    protected $fillable = [
        'activity_id',
        'activity_batch_id',
        'position',
        'activity_division_id',
        'committee_type_id',
        'name',
        'user_id',
        'phone',
        'email',
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

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function committeeType()
    {
        return $this->belongsTo(ActivityCommitteeType::class, 'committee_type_id');
    }

    public function division()
    {
        return $this->belongsTo(ActivityDivision::class, 'activity_division_id');
    }
}
