<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Subscription extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected static function booted()
    {
        static::saved(fn (Subscription $s) => Cache::forget('user_dashboard_subscription_' . $s->user_id));
        static::deleted(fn (Subscription $s) => Cache::forget('user_dashboard_subscription_' . $s->user_id));
    }

    protected $fillable = [
        'user_id',
        'subscription_plan_id',
        'status',
        'start_date',
        'end_date',
        'next_billing_date',
        'auto_renew',
        'midtrans_order_id',
        'midtrans_payment_token',
        'midtrans_response',
        'trial_ends_at',
        'cancelled_at',
        'cancellation_reason',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'next_billing_date' => 'date',
        'auto_renew' => 'boolean',
        'trial_ends_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'midtrans_response' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function plan()
    {
        return $this->belongsTo(SubscriptionPlan::class, 'subscription_plan_id');
    }

    /**
     * Check if subscription is active
     */
    public function isActive()
    {
        return $this->status === 'active' &&
               Carbon::now()->lte($this->end_date);
    }

    /**
     * Check if subscription is expired
     */
    public function isExpired()
    {
        return Carbon::now()->gt($this->end_date);
    }

    /**
     * Check if subscription is in trial
     */
    public function isTrial()
    {
        return $this->trial_ends_at && Carbon::now()->lte($this->trial_ends_at);
    }

    /**
     * Get days remaining
     */
    public function getDaysRemainingAttribute()
    {
        if ($this->isExpired()) {
            return 0;
        }

        return Carbon::now()->diffInDays($this->end_date);
    }

    /**
     * Cancel subscription
     */
    public function cancel($reason = null)
    {
        $this->update([
            'status' => 'cancelled',
            'auto_renew' => false,
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);
    }

    /**
     * Renew subscription
     */
    public function renew()
    {
        $this->update([
            'start_date' => now(),
            'end_date' => now()->addMonth(),
            'next_billing_date' => now()->addMonth(),
            'status' => 'active',
        ]);
    }
}
