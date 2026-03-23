<?php

namespace App\Events;

use App\Models\ActivityChat;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ActivityChatMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public array $message;

    public function __construct(ActivityChat $chat)
    {
        $chat->loadMissing(['sender:id,name,avatar']);

        $this->message = [
            'id' => $chat->id,
            'activity_id' => $chat->activity_id,
            'user_id' => $chat->user_id,
            'sender_id' => $chat->sender_id,
            'message' => $chat->message,
            'is_read' => (bool) $chat->is_read,
            'created_at' => optional($chat->created_at)->toISOString(),
            'sender' => $chat->sender ? [
                'id' => $chat->sender->id,
                'name' => $chat->sender->name,
                'avatar' => $chat->sender->avatar,
            ] : null,
        ];
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("activity.{$this->message['activity_id']}.chat.{$this->message['user_id']}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'activity.chat.message.sent';
    }
}
