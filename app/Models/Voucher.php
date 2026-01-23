<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    use HasCustomUid;

    protected $fillable = [
        'code', 'type', 'amount', 'applicable', 'max_uses', 'used_count', 'start_date', 'end_date', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'start_date' => 'date',
        'end_date' => 'date',
    ];

    public function isUsableFor(string $context): bool
    {
        if (! $this->is_active) {
            return false;
        }
        $today = now()->startOfDay();
        if ($this->start_date && $today->lt($this->start_date)) {
            return false;
        }
        if ($this->end_date && $today->gt($this->end_date)) {
            return false;
        }
        if ($this->max_uses !== null && $this->used_count >= $this->max_uses) {
            return false;
        }

        $applicable = strtolower($this->applicable ?? 'activity');
        if ($context === 'activity' && ! in_array($applicable, ['activity', 'both'])) {
            return false;
        }
        if ($context === 'subscription' && ! in_array($applicable, ['subscription', 'both'])) {
            return false;
        }

        return true;
    }

    public function applyToAmount(int $original): int
    {
        $type = strtolower($this->type);
        $amount = (int) $this->amount;
        if ($type === 'percent') {
            $discount = (int) floor(($amount / 100) * $original);
            $final = max(0, $original - $discount);
        } else { // fixed
            $final = max(0, $original - $amount);
        }

        return $final;
    }

    public static function findByCode(string $code): ?self
    {
        return static::whereRaw('LOWER(code) = ?', [strtolower(trim($code))])->first();
    }
}
