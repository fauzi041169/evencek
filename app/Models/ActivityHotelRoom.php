<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityHotelRoom extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $table = 'activity_hotel_rooms';

    protected $fillable = ['activity_id', 'activity_batch_id', 'hotel_name', 'room_number', 'capacity', 'notes', 'is_active'];

    public function batch()
    {
        return $this->belongsTo(ActivityBatch::class, 'activity_batch_id');
    }

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function assignments()
    {
        return $this->hasMany(ActivityHotelRoomAssignment::class, 'room_id');
    }

    public function users()
    {
        return $this->belongsToMany(User::class, 'activity_hotel_room_assignments', 'room_id', 'user_id');
    }
}
