<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Gallery extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = ['activity_id', 'image', 'caption'];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }
}
