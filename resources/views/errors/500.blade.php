<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>500 | Server Error</title>
  <style>
    body{margin:0;background:#0f172a;color:#cbd5e1;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif}
    .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center}
    .box{text-align:center}
    .code{font-size:44px;letter-spacing:2px;color:#e2e8f0}
    .text{margin-top:8px;font-size:16px;color:#94a3b8}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="box">
      <div class="code">500</div>
      <div class="text">SERVER ERROR</div>
    </div>
  </div>
  <script>
    (function(){
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
