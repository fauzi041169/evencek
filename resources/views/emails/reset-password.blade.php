<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Password - IVEN-HUB</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 20px 0;
        }
        .header img {
            max-width: 150px;
            height: auto;
        }
        .content {
            background-color: #f9f9f9;
            padding: 30px;
            border-radius: 10px;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            padding: 12px 24px;
            background: linear-gradient(135deg, #2575fc, #6a11cb);
            color: #ffffff !important;
            text-decoration: none !important;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: 600;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            @php
                $logoPath = 'assets/images/logo.png';
                if (!file_exists(public_path($logoPath)) && file_exists(public_path('assets/images/logo_1762164536.png'))) {
                    $logoPath = 'assets/images/logo_1762164536.png';
                }
                // Jika logo tidak ada, jangan tampilkan gambar
                if (!file_exists(public_path($logoPath))) {
                    $logoPath = null;
                }
            @endphp
            @if($logoPath)
                <img src="{{ asset($logoPath) }}" 
                     alt="IVEN-HUB Logo"
                     onerror="this.style.display='none';">
            @endif
        </div>

        <div class="content">
            <h2>Reset Password</h2>
            <p>Halo {{ $user->name }},</p>
            <p>Kami menerima permintaan untuk mereset password akun IVEN-HUB Anda. Untuk melanjutkan proses reset password, silakan klik tombol di bawah ini:</p>

            <div style="text-align: center;">
                <a href="{{ $resetUrl }}" class="button">Reset Password</a>
            </div>

            <p>Jika tombol di atas tidak berfungsi, Anda dapat menyalin dan menempelkan URL berikut ke browser Anda:</p>
            <p style="word-break: break-all;">{{ $resetUrl }}</p>

            <p>Link ini akan kadaluarsa dalam 60 menit.</p>

            <p>Jika Anda tidak merasa melakukan permintaan reset password ini, Anda dapat mengabaikan email ini.</p>

            <p>Terima kasih,<br>Tim IVEN-HUB</p>
        </div>

        <div class="footer">
            <p>Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
            <p>&copy; {{ date('Y') }} IVEN-HUB. All rights reserved.</p>
        </div>
    </div>
</body>
</html> 
