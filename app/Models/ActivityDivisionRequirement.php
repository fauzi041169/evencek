<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityDivisionRequirement extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $table = 'activity_division_requirements';

    protected $fillable = [
        'activity_division_id',
        'name',
        'quantity',
        'unit',
        'status',
        'notes',
        'target_date',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'target_date' => 'date',
    ];

    public function division()
    {
        return $this->belongsTo(ActivityDivision::class, 'activity_division_id');
    }

    public function getStatusBadgeAttribute()
    {
        $badges = [
            'pending' => 'warning',
            'ready' => 'info',
            'completed' => 'success',
        ];

        return $badges[$this->status] ?? 'secondary';
    }

    public function getStatusTextAttribute()
    {
        $texts = [
            'pending' => 'Menunggu',
            'ready' => 'Siap',
            'completed' => 'Selesai',
        ];

        return $texts[$this->status] ?? 'Tidak Diketahui';
    }
}
