<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomField extends Model
{
    use HasFactory;

    protected $fillable = [
        'label',
        'key',
        'type',
        'options',
    ];

    public function activities()
    {
        return $this->belongsToMany(Activity::class, 'activity_custom_field')
            ->withPivot('is_required')
            ->withTimestamps();
    }
}
