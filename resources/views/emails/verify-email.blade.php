<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Verifikasi Email - IVEN-HUB</title>
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
        /* Fallback button style for clients that respect CSS */
        .button-link {
            display: inline-block;
            padding: 14px 26px;
            background: #6366f1; /* solid color for broad support */
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            letter-spacing: .2px;
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
            <h2>Verifikasi Email Anda</h2>
            <p>Halo {{ $user->name }},</p>
            <p>Terima kasih telah mendaftar di IVEN-HUB!</p>
            <p>Untuk mengaktifkan akun Anda, silakan verifikasi alamat email Anda dengan mengklik tombol di bawah ini:</p>

            <!-- Bulletproof button using table for better compatibility -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 20px auto;">
                <tr>
                    <td bgcolor="#6366f1" style="border-radius: 8px;">
                        <a href="{{ $verificationUrl }}" target="_blank" class="button-link" style="display:inline-block;color:#ffffff;text-decoration:none;border-radius:8px;background:#6366f1;padding:14px 26px;font-weight:600;">
                            Verifikasi Email
                        </a>
                    </td>
                </tr>
            </table>

            <p>Jika tombol di atas tidak berfungsi, Anda dapat menyalin dan menempelkan URL berikut ke browser Anda:</p>
            <p style="word-break: break-all; background-color: #fff; padding: 10px; border-radius: 5px;">{{ $verificationUrl }}</p>

            <p><strong>Penting:</strong> Link verifikasi ini akan kadaluarsa dalam 24 jam. Jika link sudah kadaluarsa, Anda dapat meminta link verifikasi baru melalui halaman login.</p>

            <p>Jika Anda tidak merasa melakukan registrasi ini, Anda dapat mengabaikan email ini.</p>

            <p>Terima kasih,<br>Tim IVEN-HUB</p>
        </div>

        <div class="footer">
            <p>Email ini dikirim secara otomatis, mohon tidak membalas email ini.</p>
            <p>&copy; {{ date('Y') }} IVEN-HUB. All rights reserved.</p>
        </div>
    </div>
</body>
</html>




