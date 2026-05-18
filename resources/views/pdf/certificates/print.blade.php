<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Cetak Sertifikat - {{ $activity->name ?? 'Sertifikat Peserta' }}</title>
    <style>
        @page { margin: 0; }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #fafafa; }
        
        .certificates-container {
            display: grid;
            grid-template-columns: repeat({{ $cols }}, 1fr);
            gap: 10px;
            width: 100%;
            padding: 20px;
            justify-items: center;
        }

        @media print {
            body { background: none; padding: 0; }
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
        
        .no-print { text-align: center; margin: 16px 0; }
        .no-print button { background: #1e3a8a; color: #fff; border: none; border-radius: 8px; padding: 10px 20px; cursor: pointer; font-weight: bold; }
    </style>
</head>
<body>

@php
    if (!function_exists('get_cert_data_print')) {
        function get_cert_data_print($peserta, $key, $activity) {
            $user = optional($peserta->user);
            $profile = optional($user->profile);
            switch($key) {
                case 'name': return $user->name ?? '-';
                case 'email': return $user->email ?? '-';
                case 'certificate_id': return $peserta->certificate_id ?? '-';
                case 'no_hp': return $profile->no_hp ?? '-';
                case 'nik': return $profile->nik ?? '-';
                case 'instansi': return $profile->instansi ?? '-';
                case 'jabatan': return $profile->jabatan ?? '-';
                case 'alamat': return $profile->alamat ?? '-';
                case 'jenis_kelamin': return $profile->jenis_kelamin ?? '-';
                case 'birth_place': return $profile->birth_place ?? '-';
                case 'birth_date': return $profile->birth_date ? (is_string($profile->birth_date) ? $profile->birth_date : $profile->birth_date->format('d-m-Y')) : '-';
                default:
                    $customData = $peserta->custom_data ?? [];
                    if (isset($customData[$key])) return $customData[$key];
                    $additionalData = $profile->additional_data ?? [];
                    if (isset($additionalData[$key])) return $additionalData[$key];
                    return null;
            }
        }
    }

    if (!function_exists('image_to_base64_print')) {
        function image_to_base64_print($path) {
            if (!file_exists($path) || !is_readable($path)) return null;
            $type = mime_content_type($path);
            $data = file_get_contents($path);
            return 'data:' . $type . ';base64,' . base64_encode($data);
        }
    }

    $paper = $paper ?? 'A4';
    $orientation = $orientation ?? 'landscape';
    
    $widthCmCert = (float) data_get($certificateSetting, 'page.width_cm', 29.7);
    $heightCmCert = (float) data_get($certificateSetting, 'page.height_cm', 21);
    $pxPerCmDesigner = (float) data_get($certificateSetting, 'page.px_per_cm', 37.795);
    if ($pxPerCmDesigner <= 0) $pxPerCmDesigner = 37.795;
    
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

<div class="no-print">
    <button onclick="window.print()">Cetak Semua Sertifikat</button>
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
                                        if (file_exists($path)) { $bgUrl = image_to_base64_print($path); break; }
                                    }
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
                                    $value = '';
                                    if ($dataKey === 'qr') {
                                        $qrValue = "V:" . ($activity->uid ?? $activity->id) . ":" . $peserta->user_id;
                                    } else {
                                        $value = get_cert_data_print($peserta, $dataKey, $activity);
                                        if ($value === null && isset($config['text'])) $value = $config['text'];
                                    }

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
                                            <style> .certificate-element svg { width: 100%; height: 100%; } </style>
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
