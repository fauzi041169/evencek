<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <script>
        // Suppress React DevTools console message
        (function() {
            const originalInfo = console.info;
            const originalLog = console.log;

            function shouldSuppress(args) {
                const msg = args[0];
                return typeof msg === 'string' && msg.includes('Download the React DevTools');
            }

            console.info = function(...args) {
                if (!shouldSuppress(args)) {
                    originalInfo.apply(console, args);
                }
            };

            console.log = function(...args) {
                if (!shouldSuppress(args)) {
                    originalLog.apply(console, args);
                }
            };
        })();
    </script>

    <title inertia>{{ config('app.name', 'EventCek') }}</title>
    
    <!-- Favicon -->
    <link rel="icon" href="{{ $appFavicon ?? asset('favicon.ico') }}">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />
    
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />

    <!-- Custom CSS -->
    <link rel="stylesheet" href="{{ asset('css/color-variables.css') }}">
    <link rel="stylesheet" href="{{ asset('css/central.css') }}">

    <!-- Midtrans Snap -->
    @php
        $isProduction = config('services.midtrans.is_production', false);
        $clientKey = config('services.midtrans.client_key');
        $snapUrl = $isProduction ? 'https://app.midtrans.com/snap/snap.js' : 'https://app.sandbox.midtrans.com/snap/snap.js';
    @endphp
    @if($clientKey)
        <script src="{{ $snapUrl }}" data-client-key="{{ $clientKey }}"></script>
    @endif

    <!-- Scripts -->
    @routes
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @inertiaHead
</head>
<body class="font-sans antialiased">
    @inertia
</body>
</html>
