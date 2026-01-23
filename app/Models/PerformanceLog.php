<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PerformanceLog extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $table = 'performance_logs';

    protected $fillable = [
        'route_name',
        'method',
        'uri',
        'status_code',
        'duration_ms',
        'query_count',
        'query_time_ms',
        'memory_mb',
        'user_id',
    ];
}
