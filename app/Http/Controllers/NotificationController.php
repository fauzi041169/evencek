<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\WithdrawalRequest;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        if (!$user) {
            return response()->json([]);
        }

        // 1. Get standard notifications
        $notifications = $user->unreadNotifications->map(function ($n) {
            return [
                'id' => $n->id,
                'type' => 'notification',
                'data' => $n->data,
                'read_at' => $n->read_at,
                'created_at' => $n->created_at->diffForHumans(),
                'timestamp' => $n->created_at->timestamp,
            ];
        });

        // 2. If Superadmin, get pending Withdrawal Requests
        if ($user->role === 'superadmin') {
            $pendingWithdrawals = WithdrawalRequest::with('user')
                ->where('status', 'pending')
                ->orderBy('created_at', 'desc')
                ->get()
                ->map(function ($w) {
                    return [
                        'id' => 'withdrawal_' . $w->id,
                        'type' => 'withdrawal_request',
                        'data' => [
                            'message' => 'Permintaan penarikan dari ' . ($w->user->name ?? 'User'),
                            'amount' => 'Rp ' . number_format($w->amount, 0, ',', '.'),
                            'user_id' => $w->user_id,
                            'withdrawal_id' => $w->id,
                            'url' => route('payments.admin.withdraw.history'),
                        ],
                        'read_at' => null,
                        'created_at' => $w->created_at->diffForHumans(),
                        'timestamp' => $w->created_at->timestamp,
                    ];
                });

            $notifications = $notifications->merge($pendingWithdrawals);
        }

        // Sort by date desc
        $notifications = $notifications->sortByDesc('timestamp')->values();

        return response()->json($notifications);
    }

    public function markAsRead(Request $request, $id)
    {
        $user = auth()->user();
        if (!$user) return response()->json(['success' => false], 401);

        if (str_starts_with($id, 'withdrawal_')) {
            // Withdrawal notifications persist until the request is processed
            return response()->json(['success' => true]);
        }

        $notification = $user->notifications()->where('id', $id)->first();
        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json(['success' => true]);
    }
    
    public function markAllRead(Request $request)
    {
        $user = auth()->user();
        if ($user) {
            $user->unreadNotifications->markAsRead();
        }
        return response()->json(['success' => true]);
    }
}
