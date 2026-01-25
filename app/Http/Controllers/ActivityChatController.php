<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\ActivityChat;
use App\Models\User;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ActivityChatController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Show the chat interface.
     * For participants: Shows chat with committee.
     * For committee: Shows list of conversations.
     */
    public function index(Activity $activity)
    {
        $user = Auth::user();
        $isCommittee = $activity->canManageRegistration($user->id);

        $activityData = array_merge($activity->toArray(), [
             'is_committee' => $isCommittee,
             'can_manage_registration' => $isCommittee,
        ]);

        if ($isCommittee) {
            return Inertia::render('Activity/Chat/CommitteeIndex', ['activity' => $activityData]);
        } else {
            return Inertia::render('Activity/Chat/UserIndex', ['activity' => $activityData]);
        }
    }

    /**
     * Get list of conversations (Owner only)
     * Shows all users who have chatted with the owner
     */
    public function getConversations(Activity $activity)
    {
        try {
            $user = Auth::user();
            if (! $user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            // Only owner can see conversations list
            if ($activity->user_id != $user->id) {
                return response()->json(['error' => 'Unauthorized'], 403);
            }

            // Get list of users who have chats in this activity
            // user_id = ID user yang chat dengan owner
            $conversations = ActivityChat::where('activity_id', $activity->id)
                ->whereNotNull('user_id') // Ensure user_id is not null
                ->select('user_id', DB::raw('MAX(created_at) as last_message_time'))
                ->groupBy('user_id')
                ->with(['user' => function ($query) {
                    $query->select('id', 'name', 'avatar', 'email');
                }])
                ->orderBy('last_message_time', 'desc')
                ->get()
                ->map(function ($chat) use ($activity, $user) {
                    // Ensure user exists
                    if (! $chat->user) {
                        return null;
                    }

                    // Get the actual last message content
                    $lastMsg = ActivityChat::where('activity_id', $activity->id)
                        ->where('user_id', $chat->user_id)
                        ->whereNotNull('sender_id')
                        ->orderBy('created_at', 'desc')
                        ->first();

                    // Count unread messages from this user (messages sent by user, not by owner)
                    $unreadCount = ActivityChat::where('activity_id', $activity->id)
                        ->where('user_id', $chat->user_id)
                        ->where('is_read', false)
                        ->where('sender_id', '!=', $user->id) // Messages from user, not from owner
                        ->whereNotNull('sender_id')
                        ->count();

                    return [
                        'user' => $chat->user,
                        'last_message' => $lastMsg ? $lastMsg->message : '',
                        'last_time' => $lastMsg ? $lastMsg->created_at->diffForHumans() : '',
                        'unread_count' => $unreadCount,
                    ];
                })
                ->filter(function ($item) {
                    return $item !== null; // Remove null items
                })
                ->values(); // Re-index array

            return response()->json($conversations);
        } catch (Exception $e) {
            Log::error('Error loading conversations', [
                'activity_id' => $activity->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json(['error' => 'Server error'], 500);
        }
    }

    /**
     * Get messages for a specific conversation
     * For owner: user_id = ID user yang chat dengannya
     * For user: user_id = ID mereka sendiri (chat dengan owner)
     */
    public function getMessages(Request $request, Activity $activity)
    {
        try {
            $user = Auth::user();
            if (! $user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $isOwner = ($activity->user_id == $user->id);

            // If owner, get messages with specific user
            // If user, get messages with owner (their own conversation)
            $targetUserId = $isOwner ? $request->query('user_id') : $user->id;

            if (! $targetUserId) {
                return response()->json(['error' => 'User ID required'], 400);
            }

            // Validate target user exists
            $targetUser = User::find($targetUserId);
            if (! $targetUser) {
                return response()->json(['error' => 'Target user not found'], 404);
            }

            // Mark as read - mark messages from other party as read
            try {
                ActivityChat::where('activity_id', $activity->id)
                    ->where('user_id', $targetUserId)
                    ->where('is_read', false)
                    ->where('sender_id', '!=', $user->id) // Messages from other party
                    ->whereNotNull('sender_id') // Ensure sender_id is not null
                    ->update(['is_read' => true]);
            } catch (\Exception $e) {
                \Log::warning('Error updating read status in chat', [
                    'error' => $e->getMessage(),
                    'activity_id' => $activity->id,
                    'target_user_id' => $targetUserId,
                ]);
            }

            // Get all messages in this conversation
            // Use leftJoin to handle cases where sender might be deleted
            $messages = ActivityChat::where('activity_id', $activity->id)
                ->where('user_id', $targetUserId)
                ->whereNotNull('sender_id') // Ensure sender_id is not null
                ->with(['sender' => function ($query) {
                    $query->select('id', 'name', 'avatar');
                }])
                ->orderBy('created_at', 'asc')
                ->get()
                ->map(function ($message) {
                    // Ensure sender data is properly formatted
                    if (! $message->sender) {
                        $message->sender = (object) [
                            'id' => $message->sender_id,
                            'name' => 'Unknown User',
                            'avatar' => null,
                        ];
                    }

                    return $message;
                });

            return response()->json($messages);
        } catch (\Exception $e) {
            \Log::error('Error loading chat messages', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'activity_id' => $activity->id ?? null,
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'error' => 'Failed to load messages',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan saat memuat pesan',
            ], 500);
        }
    }

    /**
     * Send a message
     * For owner: target_user_id = ID user yang dia chat dengan
     * For user: target_user_id = ID mereka sendiri (chat dengan owner)
     */
    public function store(Request $request, Activity $activity)
    {
        try {
            $request->validate([
                'message' => 'required|string|max:5000',
                'target_user_id' => 'required|exists:users,id',
            ]);

            $user = Auth::user();
            if (! $user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $isOwner = ($activity->user_id == $user->id);

            // target_user_id = ID user yang chat (bukan owner)
            // Jika owner mengirim, target_user_id adalah user yang dia chat dengan
            // Jika user mengirim, target_user_id adalah ID mereka sendiri
            $targetUserId = $request->target_user_id;

            // Validate target user exists
            $targetUser = User::find($targetUserId);
            if (! $targetUser) {
                return response()->json(['error' => 'Target user not found'], 404);
            }

            // Validate: if owner, target_user_id must be different from owner
            // if user, target_user_id must be their own ID
            if ($isOwner && $targetUserId == $user->id) {
                return response()->json(['error' => 'Owner cannot chat with themselves'], 400);
            }

            if (! $isOwner && $targetUserId != $user->id) {
                return response()->json(['error' => 'User can only chat with owner'], 400);
            }

            // Create chat message
            // user_id = ID user yang chat (bukan owner)
            // sender_id = ID pengirim pesan
            // is_read = false (belum dibaca oleh penerima)
            $chat = ActivityChat::create([
                'activity_id' => $activity->id,
                'user_id' => $targetUserId,
                'sender_id' => $user->id,
                'message' => $request->message,
                'is_read' => false, // Belum dibaca oleh penerima
            ]);

            // Load sender with safe query
            $chat->load(['sender' => function ($query) {
                $query->select('id', 'name', 'avatar');
            }]);

            // Ensure sender data exists
            if (! $chat->sender) {
                $chat->sender = (object) [
                    'id' => $chat->sender_id,
                    'name' => 'Unknown User',
                    'avatar' => null,
                ];
            }

            return response()->json([
                'success' => true,
                'message' => $chat,
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $e->errors(),
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Error sending chat message', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'activity_id' => $activity->id ?? null,
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'error' => 'Failed to send message',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan saat mengirim pesan',
            ], 500);
        }
    }

    /**
     * Get total unread messages count for current user
     * For owner: count all unread messages from all users
     * For user: count unread messages from owner
     */
    public function getUnreadCount(Activity $activity)
    {
        try {
            $user = Auth::user();
            if (! $user) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }

            $isOwner = ($activity->user_id == $user->id);

            if ($isOwner) {
                // Owner: count all unread messages from all users (messages not sent by owner)
                $unreadCount = ActivityChat::where('activity_id', $activity->id)
                    ->where('is_read', false)
                    ->where('sender_id', '!=', $user->id) // Messages from users, not from owner
                    ->whereNotNull('sender_id')
                    ->count();
            } else {
                // User: count unread messages from owner (messages sent by owner to this user)
                $unreadCount = ActivityChat::where('activity_id', $activity->id)
                    ->where('user_id', $user->id)
                    ->where('is_read', false)
                    ->where('sender_id', $activity->user_id) // Messages from owner
                    ->whereNotNull('sender_id')
                    ->count();
            }

            return response()->json([
                'unread_count' => $unreadCount,
            ]);
        } catch (\Exception $e) {
            \Log::error('Error getting unread count', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'activity_id' => $activity->id ?? null,
                'user_id' => Auth::id(),
            ]);

            return response()->json([
                'error' => 'Failed to get unread count',
                'message' => config('app.debug') ? $e->getMessage() : 'Terjadi kesalahan saat memuat jumlah pesan belum dibaca',
            ], 500);
        }
    }
}
