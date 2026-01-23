<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubscriptionPlan extends Model
{
    use HasCustomUid;
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'price',
        'max_activities',
        'max_users',
        'max_news',
        'max_participants_per_activity',
        'max_committees_per_activity',
        'has_analytics',
        'has_custom_branding',
        'has_api_access',
        'has_priority_support',
        'has_white_label',
        'features',
        'trial_days',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'features' => 'array',
        'has_analytics' => 'boolean',
        'has_custom_branding' => 'boolean',
        'has_api_access' => 'boolean',
        'has_priority_support' => 'boolean',
        'has_white_label' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscriptions()
    {
        return $this->hasMany(Subscription::class)->where('status', 'active');
    }

    /**
     * Check if plan has unlimited feature
     */
    public function isUnlimited($feature)
    {
        return is_null($this->{"max_{$feature}"});
    }

    /**
     * Get formatted price
     */
    public function getFormattedPriceAttribute()
    {
        return 'Rp '.number_format($this->price, 0, ',', '.');
    }
}
