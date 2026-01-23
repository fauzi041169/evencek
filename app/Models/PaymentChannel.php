<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PaymentChannel extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'type', // e.g., 'bank_transfer', 'e_wallet', 'cstore', 'cardless_credit', 'credit_card'
        'description',
        'is_active',
        'icon_url',
        'fee',
        'fee_type',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'fee' => 'decimal:2',
    ];
}
