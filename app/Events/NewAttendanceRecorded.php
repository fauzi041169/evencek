<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewAttendanceRecorded
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $activityId;

    public $attendanceId;

    public $attendanceData;

    /**
     * Create a new event instance.
     */
    public function __construct($activityId, $attendanceId, $attendanceData)
    {
        $this->activityId = $activityId;
        $this->attendanceId = $attendanceId;
        $this->attendanceData = $attendanceData;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('attendance'),
        ];
    }
}
