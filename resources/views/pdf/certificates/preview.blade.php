<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Preview Sertifikat - {{ $activity->name ?? 'Sertifikat Peserta' }}</title>
    <link rel="stylesheet" href="{{ asset('css/central.css') }}">
    <style>
        @page { margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fafafa; }
        
        /* Grid Layout for Screen */
        .certificates-container {
            display: grid;
            grid-template-columns: repeat({{ $cols }}, 1fr);
            gap: 12mm 10px;
            width: 100%;
            padding: 20px;
            justify-items: center;
            justify-content: center;
        }
        .certificate-page-row {
            display: contents;
        }
        .certificate-page-cell {
            position: relative;
        }

        /* Print Layout */
        @media print {
            body { background: none; }
            .certificates-container {
                display: block;
                padding: 0;
            }
            .certificate-page-row {
                display: block;
                page-break-inside: avoid;
                white-space: nowrap;
                font-size: 0;
            }
            .certificate-page-cell {
                display: inline-block;
                vertical-align: top;
            }
            .no-print { display: none !important; }
        }

        .certificate-card {
            background-color: transparent;
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
            box-shadow: 0 8px 24px 0 rgba(0,0,0,0.18);
        }
        
        @media print {
            .certificate-card {
                box-shadow: none;
                border: none;
                border-radius: 0;
            }
        }

        .certificate-bg {
            position: absolute; top:0; left:0; width:100%; height:100%; object-fit: fill;
            z-index: 1;
        }
        
        .certificate-content {
            width: 100%; height: 100%; position: relative; z-index: 2;
        }

        .certificate-element { position: absolute; line-height: 1.2; overflow: hidden; }
        .page-break { page-break-after: always; width: 100%; display: block; height: 0; }
        
        @media screen {
            .page-break { height: 20px; background: #f0f0f0; border-top: 1px dashed #ccc; margin: 10px 0; position: relative; }
            .page-break::after { content: 'PAGE BREAK'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 10px; color: #999; }
        }

        .hero-news-section { position: relative; overflow: hidden; background: linear-gradient(135deg, #1e3a8a, #bfa100); color: #fff; }
        .no-print { text-align: center; margin: 16px 0 28px; }
        .no-print button { background: #bfa100; color: #fff; border: none; border-radius: 10px; padding: 12px 22px; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
        .no-print button:hover { background: #a48a00; }
        @media print { .hero-news-section, .no-print { display: none !important; } }
    </style>
</head>
<body>

@php
    // Helper function for user data
    if (!function_exists('get_cert_data')) {
        function get_cert_data($peserta, $key, $activity) {
            $user = optional($peserta->user);
            $profile = optional($user->profile);
            
            switch($key) {
                case 'name': return $user->name ?? '-';
                case 'email': return $user->email ?? '-';
                case 'certificate_id': return $peserta->certificate_id ?? '-';
                case 'no_hp': return $profile->no_hp ?? '-';
                case 'nik': return $profile->nik ?? '-';
                case 'pekerjaan': return $profile->pekerjaan ?? '-';
                case 'instansi': return $profile->instansi ?? '-';
                case 'jabatan': return $profile->jabatan ?? '-';
                case 'alamat': return $profile->alamat ?? '-';
                case 'jenis_kelamin': return $profile->jenis_kelamin ?? '-';
                case 'birth_place': return $profile->birth_place ?? '-';
                case 'birth_date': return $profile->birth_date ? (is_string($profile->birth_date) ? $profile->birth_date : $profile->birth_date->format('d-m-Y')) : '-';
                case 'province': return optional($profile->province)->name ?? $profile->other_province ?? '-';
                case 'regency': return optional($profile->regency)->name ?? $profile->other_regency ?? '-';
                case 'district': return optional($profile->district)->name ?? $profile->other_district ?? '-';
                default:
                    // Check custom data
                    $customData = $peserta->custom_data ?? [];
                    if (isset($customData[$key])) return $customData[$key];
                    
                    // Fallback to profile additional data
                    $additionalData = $profile->additional_data ?? [];
                    if (isset($additionalData[$key])) return $additionalData[$key];
                    
                    return null;
            }
        }
    }

    if (!function_exists('image_to_base64')) {
        function image_to_base64($path) {
            if (!file_exists($path) || !is_readable($path)) return null;
            $type = mime_content_type($path);
            $data = file_get_contents($path);
            return 'data:' . $type . ';base64,' . base64_encode($data);
        }
    }

    $paper = data_get($printSettings, 'paper', 'A4');
    $orientation = data_get($printSettings, 'orientation', 'landscape');
    $widthCmPage = 21; $heightCmPage = 29.7;
    
    if ($paper === 'A4') { $widthCmPage = 21; $heightCmPage = 29.7; }
    elseif ($paper === 'A3') { $widthCmPage = 29.7; $heightCmPage = 42; }
    elseif ($paper === 'F4') { $widthCmPage = 21.5; $heightCmPage = 33; }
    elseif ($paper === 'IDCARD') { $widthCmPage = 5.398; $heightCmPage = 8.56; }
    
    if ($orientation === 'landscape') { $tmp = $widthCmPage; $widthCmPage = $heightCmPage; $heightCmPage = $tmp; }
    
    $widthCmCert = (float) data_get($certificateSetting, 'page.width_cm', 29.7);
    $heightCmCert = (float) data_get($certificateSetting, 'page.height_cm', 21);
    
    // Scale factor between designer and final print
    $pxPerCmDesigner = (float) data_get($certificateSetting, 'page.px_per_cm', 37.795);
    if ($pxPerCmDesigner <= 0) $pxPerCmDesigner = 37.795;
    
    // How many certs per page
    $certificatesPerPage = max(1, (int)($cols * $rows));
@endphp

<style>
    @media print {
        @page {
            size: {{ $paper }} {{ $orientation }};
            margin: 0;
        }
    }
</style>

@if(!empty($showHero))
<section class="hero-news-section relative overflow-hidden" style="padding: 40px 0;">
  <div class="max-w-7xl mx-auto px-4 text-center">
    <h1 class="font-bold text-white mb-3" style="font-size: 2.5rem;">{{ $activity->name ?? 'Sertifikat' }}</h1>
    <p class="text-white opacity-90">{{ $activity->location }} | {{ $activity->date }}</p>
  </div>
</section>
@endif

@if(empty($showHero))
<section class="no-print" style="padding:16px; background:#f8fafc; border-bottom:1px solid #e5e7eb;">
  <div style="max-width:1080px; margin:0 auto; display:flex; align-items:center; justify-content:space-between;">
    <div>
      <div style="font-size:18px; font-weight:800;">Verifikasi Sertifikat</div>
      <div style="font-size:14px; color:#666;">
        @php $p = $participants->first(); @endphp
        @if($p)
            {{ optional($p->user)->name }} | ID: {{ $p->certificate_id }}
        @else
            Sertifikat tidak valid
        @endif
      </div>
    </div>
  </div>
</section>
@endif

<div class="no-print" style="margin: 20px auto; text-align: center;">
    <button onclick="window.print()">Download / Cetak Sertifikat</button>
</div>

<div class="certificates-container">
    @foreach($participants->chunk($certificatesPerPage) as $pageIndex => $pageData)
        @if($pageIndex > 0)
            <div class="page-break"></div>
        @endif
        
        <div class="certificate-page-row">
            @foreach($pageData as $peserta)
                <div class="certificate-page-cell" style="width: {{ $widthCmCert }}cm; height: {{ $heightCmCert }}cm;">
                    <div class="certificate-card">
                        {{-- Background --}}
                        @php
                            $bgFile = data_get($certificateSetting, 'page.background');
                            $bgUrl = null;
                            if ($bgFile) {
                                if (str_starts_with($bgFile, 'http')) $bgUrl = $bgFile;
                                else {
                                    $possiblePaths = [
                                        public_path('storage/' . $bgFile),
                                        public_path('assets/images/certificate/' . $bgFile),
                                        public_path('assets/images/certificate/background/default/' . $bgFile)
                                    ];
                                    foreach($possiblePaths as $path) {
                                        if (file_exists($path)) {
                                            $bgUrl = image_to_base64($path);
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            // Default fallback if no background
                            if (!$bgUrl) {
                                $defaultDir = public_path('assets/images/certificate/background/default');
                                if (is_dir($defaultDir)) {
                                    $files = glob($defaultDir . '/*.{png,jpg,jpeg,webp}', GLOB_BRACE);
                                    if (!empty($files)) $bgUrl = image_to_base64($files[0]);
                                }
                            }
                        @endphp
                        
                        @if($bgUrl)
                            <img src="{{ $bgUrl }}" class="certificate-bg" alt="BG">
                        @endif

                        <div class="certificate-content">
                            @foreach($certificateSetting as $key => $config)
                                @if($key === 'page' || $key === 'card' || !is_array($config) || !data_get($config, 'visible', true)) @continue @endif
                                
                                @php
                                    $dataKey = data_get($config, 'data_key');
                                    $fieldType = data_get($config, 'fieldType');
                                    $value = '';
                                    
                                    if ($dataKey === 'qr') {
                                        $qrValue = "V:" . ($activity->uid ?? $activity->id) . ":" . $peserta->user_id;
                                        $value = 'QR'; // Placeholder
                                    } else {
                                        $value = get_cert_data($peserta, $dataKey, $activity);
                                        if ($value === null && isset($config['text'])) $value = $config['text'];
                                    }

                                    // Scale positions from px to final cm
                                    $left = (float)data_get($config, 'left', 0) / $pxPerCmDesigner;
                                    $top = (float)data_get($config, 'top', 0) / $pxPerCmDesigner;
                                    $width = (float)data_get($config, 'width', 100) / $pxPerCmDesigner;
                                    $height = (float)data_get($config, 'height', 40) / $pxPerCmDesigner;
                                    $fontSize = (float)data_get($config, 'size', 16) / $pxPerCmDesigner;
                                @endphp

                                <div class="certificate-element" style="
                                    left: {{ $left }}cm;
                                    top: {{ $top }}cm;
                                    width: {{ $width }}cm;
                                    height: {{ $height }}cm;
                                    font-size: {{ $fontSize }}cm;
                                    color: {{ data_get($config, 'color', '#000') }};
                                    font-family: {{ data_get($config, 'font', 'inherit') }};
                                    font-weight: {{ data_get($config, 'weight', 'normal') }};
                                    font-style: {{ data_get($config, 'italic', 'normal') }};
                                    text-align: {{ data_get($config, 'align', 'left') }};
                                ">
                                    @if($dataKey === 'qr')
                                        <div style="width: 100%; height: 100%;">
                                            {!! QrCode::size(500)->format('svg')->generate($qrValue) !!}
                                            <style>
                                                .certificate-element svg { width: 100%; height: 100%; }
                                            </style>
                                        </div>
                                    @else
                                        {!! nl2br(e($value)) !!}
                                    @endif
                                </div>
                            @endforeach
                        </div>
                    </div>
                </div>
            @endforeach
        </div>
    @endforeach
</div>

</body>
</html>
