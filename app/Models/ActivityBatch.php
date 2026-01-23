<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class ActivityBatch extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = [
        'activity_id',
        'name',
        'code',
        'start_date',
        'end_date',
        'start_time',
        'end_time',
        'is_active',
        'description',
        'quota',
        'price',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_active' => 'boolean',
        'quota' => 'integer',
        'price' => 'decimal:2',
    ];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function users()
    {
        $pivot = 'activity_users';
        try {
            if (Schema::hasTable('activitiusers')) {
                $pivot = 'activitiusers';
            } elseif (Schema::hasTable('activity_users')) {
                $pivot = 'activity_users';
            }
        } catch (\Throwable $e) {
            $pivot = 'activity_users';
        }

        return $this->belongsToMany(User::class, $pivot, 'activity_batch_id', 'user_id')
            ->withPivot(['status', 'created_at', 'print_count', 'certificate_id'])
            ->withTimestamps();
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }
}
