<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Model;

class FinancialSetting extends Model
{
    use HasCustomUid;

    protected $table = 'financial_settings';

    protected $fillable = [
        'admin_fee_percent',
        'admin_fee_flat',
        'auto_fixed_deduction',
        'min_auto_price',
        'discount_rules',
        'voucher_rules',
    ];

    protected $casts = [
        'admin_fee_percent' => 'float',
        'admin_fee_flat' => 'integer',
        'auto_fixed_deduction' => 'integer',
        'min_auto_price' => 'integer',
        'discount_rules' => 'array',
        'voucher_rules' => 'array',
    ];

    public static function current(): self
    {
        $fs = static::query()->first();
        if (! $fs) {
            return new static([
                'admin_fee_percent' => 0,
                'admin_fee_flat' => 0,
                'auto_fixed_deduction' => 5000,
                'min_auto_price' => 15000,
            ]);
        }
        if ((int) ($fs->auto_fixed_deduction ?? 0) <= 0) {
            $fs->auto_fixed_deduction = 5000;
            try {
                $fs->save();
            } catch (\Throwable $e) {
            }
        }

        return $fs;
    }

    // Biaya admin: persentase dari jumlah transaksi
    public function computeFee(float $amount): float
    {
        $percentFee = max(0.0, (float) $this->admin_fee_percent);

        return max(0.0, $amount * ($percentFee / 100.0));
    }

    // Biaya untuk transaksi otomatis (Midtrans): biaya admin tetap + potongan otomatis tetap
    public function computeAutoFee(float $amount): float
    {
        $adminFee = $this->computeFee($amount);
        $autoFixed = max(0.0, (float) $this->auto_fixed_deduction);

        return max(0.0, $adminFee + $autoFixed);
    }

    public function getAutoDeductionOverride(?int $activityId): ?array
    {
        if (! $activityId) {
            return null;
        }
        $rules = is_array($this->discount_rules) ? $this->discount_rules : [];
        $overrides = $rules['activity_auto_deductions'] ?? [];
        if (! is_array($overrides)) {
            return null;
        }
        $keyInt = (int) $activityId;
        $keyStr = (string) $activityId;
        $value = null;
        if (array_key_exists($keyInt, $overrides)) {
            $value = $overrides[$keyInt];
        } elseif (array_key_exists($keyStr, $overrides)) {
            $value = $overrides[$keyStr];
        }
        if ($value === null) {
            return null;
        }
        if (is_array($value)) {
            $type = isset($value['type']) ? (string) $value['type'] : 'fixed';
            $amount = (float) ($value['amount'] ?? 0);

            return [
                'type' => $type === 'percent' ? 'percent' : 'fixed',
                'amount' => max(0.0, $amount),
            ];
        }

        return [
            'type' => 'fixed',
            'amount' => max(0.0, (float) $value),
        ];
    }

    public function computeAutoFeeForActivity(float $amount, ?int $activityId): float
    {
        $override = $this->getAutoDeductionOverride($activityId);
        if (is_array($override)) {
            if (($override['type'] ?? 'fixed') === 'percent') {
                $p = max(0.0, (float) ($override['amount'] ?? 0));

                return max(0.0, $amount * ($p / 100.0));
            }
            $f = max(0.0, (float) ($override['amount'] ?? 0));

            return $f;
        }

        return $this->computeAutoFee($amount);
    }

    public function computeNet(float $amount): float
    {
        $net = $amount - $this->computeFee($amount);

        return max(0.0, $net);
    }

    public function computeNetAutomatic(float $amount): float
    {
        $net = $amount - $this->computeAutoFee($amount);

        return max(0.0, $net);
    }

    public function computeNetAutomaticForActivity(float $amount, ?int $activityId): float
    {
        $net = $amount - $this->computeAutoFeeForActivity($amount, $activityId);

        return max(0.0, $net);
    }
}
