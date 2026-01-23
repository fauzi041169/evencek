<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>404 | Tidak Ditemukan</title>
  <style>
    body{margin:0;background:#0f172a;color:#cbd5e1;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
    .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center}
    .box{text-align:center}
    .code{font-size:44px;letter-spacing:2px;color:#e2e8f0}
    .text{margin-top:8px;font-size:16px;color:#94a3b8}
    .hint{margin-top:14px;font-size:13px;color:#64748b}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="box">
      <div class="code">404</div>
      <div class="text">NOT FOUND</div>
      <div class="hint">Halaman atau berkas tidak ditemukan.</div>
    </div>
  </div>
  <script>
    (function(){
      try{
        var qs=new URLSearchParams(window.location.search);
        var needLogin = qs.get('login')==='true';
        var ref = document.referrer || '';
        if(needLogin){
          var target = ref && ref.indexOf('http')===0 ? ref : '{{ url('/') }}';
          var s = target.indexOf('?')>=0 ? '&' : '?';
          window.location.replace(target + s + 'login=true');
        }
      }catch(e){}
    })();
  </script>
</body>
</html>
