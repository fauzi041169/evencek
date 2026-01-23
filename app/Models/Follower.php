<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Follower extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = ['user_id', 'follower_id'];
}
