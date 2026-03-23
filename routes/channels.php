<?php

use App\Models\Activity;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('activity.{activityId}.chat.{participantId}', function ($user, $activityId, $participantId) {
    $activity = Activity::find($activityId);
    if (! $activity) {
        return false;
    }

    if ((int) $user->id === (int) $participantId) {
        return true;
    }

    return $activity->canManageRegistration((int) $user->id);
});
