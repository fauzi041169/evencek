<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Tidak Tersedia</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            padding: 40px;
            text-align: center;
        }
        
        .icon {
            font-size: 80px;
            color: #f56565;
            margin-bottom: 20px;
        }
        
        h1 {
            color: #2d3748;
            font-size: 28px;
            margin-bottom: 15px;
            font-weight: 600;
        }
        
        .message {
            color: #4a5568;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        
        .error-details {
            background: #f7fafc;
            border-left: 4px solid #f56565;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            text-align: left;
            font-size: 14px;
            color: #718096;
            word-break: break-word;
        }
        
        .actions {
            margin-top: 30px;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            transition: background 0.3s;
            margin: 5px;
        }
        
        .btn:hover {
            background: #5568d3;
        }
        
        .btn-secondary {
            background: #e2e8f0;
            color: #4a5568;
        }
        
        .btn-secondary:hover {
            background: #cbd5e0;
        }
        
        .steps {
            text-align: left;
            margin-top: 30px;
            padding-top: 30px;
            border-top: 1px solid #e2e8f0;
        }
        
        .steps h3 {
            color: #2d3748;
            font-size: 18px;
            margin-bottom: 15px;
        }
        
        .steps ol {
            color: #4a5568;
            line-height: 2;
            padding-left: 20px;
        }
        
        .steps li {
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">⚠️</div>
        <h1>Database Tidak Tersedia</h1>
        <div class="message">
            {{ $message ?? 'Terjadi kesalahan saat menghubungkan ke database. Sistem sedang mengalami masalah teknis.' }}
        </div>
        
        @if(config('app.debug') && isset($error))
        <div class="error-details">
            <strong>Error Detail:</strong><br>
            {{ $error }}
        </div>
        @endif
        
        <div class="actions">
            <a href="javascript:location.reload()" class="btn">🔄 Muat Ulang Halaman</a>
            <a href="{{ url('/') }}" class="btn btn-secondary">🏠 Kembali ke Home</a>
        </div>
        
        <div class="steps">
            <h3>Langkah-langkah untuk memperbaiki:</h3>
            <ol>
                <li>Pastikan MySQL/MariaDB service sedang berjalan</li>
                <li>Periksa konfigurasi database di file <code>.env</code></li>
                <li>Pastikan username, password, dan host database benar</li>
                <li>Hubungi administrator sistem jika masalah berlanjut</li>
            </ol>
        </div>
    </div>
</body>
</html>

