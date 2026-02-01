<?php

namespace Database\Seeders;

use App\Models\PaymentChannel;
use Illuminate\Database\Seeder;

class PaymentChannelSeeder extends Seeder
{
    public function run()
    {
        $channels = [
            // Bank Transfer
            [
                'code' => 'bca_va',
                'name' => 'BCA Virtual Account',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/bca.svg',
                'fee' => 4000,
                'fee_type' => 'fixed',
            ],
            [
                'code' => 'bni_va',
                'name' => 'BNI Virtual Account',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/bni.svg',
                'fee' => 4000,
                'fee_type' => 'fixed',
            ],
            [
                'code' => 'bri_va',
                'name' => 'BRI Virtual Account',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/bri.svg',
                'fee' => 4000,
                'fee_type' => 'fixed',
            ],
            [
                'code' => 'mandiri_bill',
                'name' => 'Mandiri Bill Payment',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/mandiri.svg',
                'fee' => 4000,
                'fee_type' => 'fixed',
            ],
            [
                'code' => 'permata_va',
                'name' => 'Permata Virtual Account',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/permata.svg',
                'fee' => 4000,
                'fee_type' => 'fixed',
            ],
            [
                'code' => 'cimb_va',
                'name' => 'CIMB Virtual Account',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/cimb.svg',
                'fee' => 4000,
                'fee_type' => 'fixed',
            ],
            [
                'code' => 'danamon_va',
                'name' => 'Danamon Virtual Account',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/danamon.svg',
                'fee' => 4000,
                'fee_type' => 'fixed',
            ],
            [
                'code' => 'bsi_va',
                'name' => 'Bank Syariah Indonesia (BSI)',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/bsi.svg',
                'fee' => 4000,
                'fee_type' => 'fixed',
            ],

            // E-Wallet
            [
                'code' => 'gopay',
                'name' => 'GoPay',
                'type' => 'e_wallet',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/gopay.svg',
                'fee' => 2,
                'fee_type' => 'percent',
            ],
            [
                'code' => 'shopeepay',
                'name' => 'ShopeePay',
                'type' => 'e_wallet',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/shopeepay.svg',
                'fee' => 2,
                'fee_type' => 'percent',
            ],
            [
                'code' => 'qris',
                'name' => 'QRIS',
                'type' => 'e_wallet',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/qris.svg',
                'fee' => 0.7,
                'fee_type' => 'percent',
            ],
            [
                'code' => 'dana',
                'name' => 'DANA',
                'type' => 'e_wallet',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/dana.svg',
                'fee' => 1.5,
                'fee_type' => 'percent',
            ],
            [
                'code' => 'ovo',
                'name' => 'OVO',
                'type' => 'e_wallet',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/ovo.svg',
                'fee' => 1.5,
                'fee_type' => 'percent',
            ],

            // Credit Card
            [
                'code' => 'credit_card',
                'name' => 'Credit Card (Visa/Master/JCB/Amex)',
                'type' => 'credit_card',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/visa.svg',
                'fee' => 2.9,
                'fee_type' => 'percent',
            ],

            // C-Store
            [
                'code' => 'indomaret',
                'name' => 'Indomaret',
                'type' => 'cstore',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/indomaret.png',
                'fee' => 5000,
                'fee_type' => 'fixed',
            ],
            [
                'code' => 'alfamart',
                'name' => 'Alfamart',
                'type' => 'cstore',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/alfamart.svg',
                'fee' => 5000,
                'fee_type' => 'fixed',
            ],

            // Cardless Credit
            [
                'code' => 'akulaku',
                'name' => 'Akulaku',
                'type' => 'cardless_credit',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/akulaku.svg',
                'fee' => 2.5,
                'fee_type' => 'percent',
            ],
            [
                'code' => 'kredivo',
                'name' => 'Kredivo',
                'type' => 'cardless_credit',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/kredivo.svg',
                'fee' => 2.5,
                'fee_type' => 'percent',
            ],
        ];

        foreach ($channels as $channel) {
            PaymentChannel::updateOrCreate(
                ['code' => $channel['code']],
                $channel
            );
        }
    }
}
