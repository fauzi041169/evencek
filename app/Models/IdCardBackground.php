<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IdCardBackground extends Model
{
    use HasCustomUid, HasFactory;

    protected $table = 'id_card_backgrounds';

    protected $fillable = [
        'activity_id',
        'filename',
        'original_name',
    ];
}
