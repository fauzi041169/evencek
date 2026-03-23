<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>500 | Server Error</title>
  <style>
    body{margin:0;background:#0f172a;color:#cbd5e1;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
    .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center}
    .box{max-width:560px;width:100%;padding:24px}
    .card{background:rgba(15,23,42,.6);border:1px solid rgba(148,163,184,.25);border-radius:16px;padding:22px;box-shadow:0 18px 40px rgba(0,0,0,.35)}
    .code{font-size:44px;letter-spacing:2px;color:#e2e8f0}
    .title{margin-top:8px;font-size:18px;color:#e2e8f0;font-weight:700}
    .text{margin-top:10px;font-size:14px;line-height:1.6;color:#94a3b8}
    .meta{margin-top:14px;display:flex;flex-wrap:wrap;gap:10px}
    .pill{display:inline-flex;align-items:center;gap:8px;padding:8px 10px;border-radius:999px;background:rgba(2,6,23,.55);border:1px solid rgba(148,163,184,.22);color:#cbd5e1;font-size:12px}
    .btn{margin-top:16px;display:inline-block;padding:10px 14px;border-radius:12px;background:#7c3aed;color:#fff;text-decoration:none;font-weight:600}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="box">
      <div class="card">
        <div class="code">500</div>
        <div class="title">Terjadi Kesalahan Server</div>
        <div class="text">
          Server tidak dapat memproses permintaan saat ini. Silakan muat ulang halaman atau coba beberapa saat lagi.
        </div>
        <div class="meta">
          @if(!empty($request_id))
            <div class="pill">Request ID: <strong style="color:#e2e8f0">{{ $request_id }}</strong></div>
          @endif
          <div class="pill">Waktu: <strong style="color:#e2e8f0" id="t"></strong></div>
        </div>
        <a class="btn" href="javascript:window.location.reload()">Muat Ulang</a>
      </div>
    </div>
  </div>
  <script>
    (function(){
      var el = document.getElementById('t');
      if (el) el.textContent = new Date().toLocaleString();
      var data = {
        url: window.location.href,
        path: window.location.pathname,
        query: window.location.search,
        user_id: "{{ (string) (auth()->id() ?? '') }}",
        env: "{{ app()->environment() }}",
        app_debug: "{{ config('app.debug') ? 'true' : 'false' }}",
        last_activity: "{{ (string) (session('last_activity') ?? '') }}",
        time: new Date().toISOString()
      };
      /*
      console.group('Server Error 500');
      console.table(data);
      // console.error('500', data);
      console.groupEnd();
      */
    })();
  </script>
</body>
</html>
