<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Model;

class ActivityCommitteeType extends Model
{
    use HasCustomUid;

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

    public function committeeMembers()
    {
        return $this->hasMany(ActivityCommitteeStructure::class, 'committee_type_id');
    }
}
