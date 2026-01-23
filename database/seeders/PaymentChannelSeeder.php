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
            ],
            [
                'code' => 'bni_va',
                'name' => 'BNI Virtual Account',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/bni.svg',
            ],
            [
                'code' => 'bri_va',
                'name' => 'BRI Virtual Account',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/bri.svg',
            ],
            [
                'code' => 'mandiri_bill',
                'name' => 'Mandiri Bill Payment',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/mandiri.svg',
            ],
            [
                'code' => 'permata_va',
                'name' => 'Permata Virtual Account',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/permata.svg',
            ],
            [
                'code' => 'cimb_va',
                'name' => 'CIMB Virtual Account',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/cimb.svg',
            ],
            [
                'code' => 'danamon_va',
                'name' => 'Danamon Virtual Account',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/danamon.svg',
            ],
            [
                'code' => 'bsi_va',
                'name' => 'Bank Syariah Indonesia (BSI)',
                'type' => 'bank_transfer',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/bsi.svg',
            ],

            // E-Wallet
            [
                'code' => 'gopay',
                'name' => 'GoPay',
                'type' => 'e_wallet',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/gopay.svg',
            ],
            [
                'code' => 'shopeepay',
                'name' => 'ShopeePay',
                'type' => 'e_wallet',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/shopeepay.svg',
            ],
            [
                'code' => 'qris',
                'name' => 'QRIS',
                'type' => 'e_wallet',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/qris.svg',
            ],
            [
                'code' => 'dana',
                'name' => 'DANA',
                'type' => 'e_wallet',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/dana.svg',
            ],
            [
                'code' => 'ovo',
                'name' => 'OVO',
                'type' => 'e_wallet',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/ovo.svg',
            ],

            // Credit Card
            [
                'code' => 'credit_card',
                'name' => 'Credit Card (Visa/Master/JCB/Amex)',
                'type' => 'credit_card',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/visa.svg',
            ],

            // C-Store
            [
                'code' => 'indomaret',
                'name' => 'Indomaret',
                'type' => 'cstore',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/indomaret.png',
            ],
            [
                'code' => 'alfamart',
                'name' => 'Alfamart',
                'type' => 'cstore',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/alfamart.svg',
            ],

            // Cardless Credit
            [
                'code' => 'akulaku',
                'name' => 'Akulaku',
                'type' => 'cardless_credit',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/akulaku.svg',
            ],
            [
                'code' => 'kredivo',
                'name' => 'Kredivo',
                'type' => 'cardless_credit',
                'is_active' => true,
                'icon_url' => 'assets/images/payment-channels/kredivo.svg',
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
