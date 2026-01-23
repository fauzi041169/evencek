<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Model;

class CertificateSettings extends Model
{
    use HasCustomUid;

    protected $table = 'certificate_settings';

    protected $fillable = [
        'activity_id',
        'activity_batch_id',
        'certificate_setting',
        'print_settings',
        'additional_pages',
    ];

    protected $casts = [
        'certificate_setting' => 'array',
        'print_settings' => 'array',
        'additional_pages' => 'array',
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
