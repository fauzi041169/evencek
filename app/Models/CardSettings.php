<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Model;

class CardSettings extends Model
{
    use HasCustomUid;

    protected $table = 'card_settings';

    protected $fillable = [
        'activity_id',
        'activity_batch_id',
        'type',
        'card_setting',
        'print_settings',
    ];

    protected $casts = [
        'card_setting' => 'array',
        'print_settings' => 'array',
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
