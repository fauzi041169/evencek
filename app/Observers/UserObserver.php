<?php

namespace App\Observers;

use App\Models\User;
use Illuminate\Support\Facades\Log;

class UserObserver
{
    public function created(User $user)
    {
        // Buat profile kosong saat user dibuat
        $user->profile()->create([]);
    }

    public function updated(User $user)
    {
        // Implementasi jika ada perubahan pada model User
        Log::info('User updated: '.$user->id);
    }

    public function deleted(User $user)
    {
        // Implementasi jika user dihapus
        Log::info('User deleted: '.$user->id);
    }

    public function restored(User $user)
    {
        // Implementasi jika user direstore
        Log::info('User restored: '.$user->id);
    }

    public function forceDeleted(User $user)
    {
        // Implementasi jika user dihapus secara permanen
        Log::info('User force deleted: '.$user->id);
    }
}
