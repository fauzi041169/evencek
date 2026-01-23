<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityHotelRoomAssignment extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $table = 'activity_hotel_room_assignments';

    protected $fillable = ['activity_id', 'activity_batch_id', 'room_id', 'user_id'];

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function batch()
    {
        return $this->belongsTo(ActivityBatch::class, 'activity_batch_id');
    }

    public function room()
    {
        return $this->belongsTo(ActivityHotelRoom::class, 'room_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
