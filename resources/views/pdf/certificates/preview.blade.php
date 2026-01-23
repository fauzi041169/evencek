<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Preview Sertifikat PDF - {{ $activity->name ?? 'Sertifikat Peserta' }}</title>
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
            display: contents; /* Flatten rows for grid */
        }
        .certificate-page-cell {
            position: relative;
            /* width/height set inline */
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
                white-space: nowrap; /* Keep cells in row */
                font-size: 0; /* Remove whitespace gaps */
            }
            .certificate-page-cell {
                display: inline-block;
                vertical-align: top;
            }
            .no-print { display: none !important; }
        }

        .yellow-card-3d {
            background-color: transparent;
            border-radius: 20px;
            box-shadow:
                0 8px 24px 0 rgba(0,0,0,0.18),
                0 1.5px 4px 0 rgba(255, 215, 0, 0.3);
            border: 2px solid #fff9c4;
            position: relative;
            overflow: hidden;
            width: 100%;
            height: 100%;
            box-sizing: border-box;
        }
        @media print {
            .yellow-card-3d {
                box-shadow: none;
                border: none;
                border-radius: 0;
            }
            .yellow-card-3d[data-offset-left][data-offset-top] {
                margin-left: calc(-1 * var(--offset-left, 0cm));
                margin-top: calc(-1 * var(--offset-top, 0cm));
            }
        }
        .yellow-card-3d img[alt="Certificate Background"] {
            position: absolute; top:0; left:0; width:100%; height:100%; object-fit: fill; object-position: center;
            z-index: 1;
        }
        .certificate-content-wrapper {
            width: 100%; height: 100%; position: relative; z-index: 2; box-sizing: border-box;
            padding: 0;
            border-radius: 18px;
            /* Ensure container maintains aspect ratio and correct size for positioning */
            min-width: 0;
            min-height: 0;
        }
        .certificate-element { position: absolute; line-height: 1.2; }
        .page-break { page-break-after: always; width: 100%; display: block; height: 0; }
        @media screen {
            .page-break { height: 20px; background: #f0f0f0; border-top: 1px dashed #ccc; margin: 10px 0; content: 'Page Break'; text-align: center; font-size: 12px; color: #999; line-height: 20px; }
        }
        .hero-download { position: relative; overflow: hidden; background: linear-gradient(135deg, #1e3a8a, #bfa100); color: #fff; }
        .hero-download .inner { max-width: 1080px; margin: 0 auto; padding: 28px 16px; text-align: center; }
        .hero-download h1 { font-size: 2rem; font-weight: 800; margin: 0 0 8px; }
        .hero-download p { margin: 4px 0; opacity: 0.92; }
        .hero-rounded-bottom { height: 18px; background: #fff; border-top-left-radius: 18px; border-top-right-radius: 18px; margin-top: -10px; }
        @media print { .hero-download, .hero-rounded-bottom { display: none !important; } }
        /* .certificates-container.center { display: block; text-align: center; } REMOVED for Grid compatibility */
        /* .certificates-container.center .certificate-page-row { display: block; width: 100%; } */
        /* .certificates-container.center .certificate-page-cell { margin-left: auto; margin-right: auto; } */
        .no-print { text-align: center; margin: 16px 0 28px; }
        .no-print button { background: #bfa100; color: #fff; border: none; border-radius: 10px; padding: 12px 22px; font-size: 1rem; font-weight: 700; cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,0.12); }
        .no-print button:hover { background: #a48a00; }
        @media print { .no-print { display: none !important; } }
        @media print { .hero-news-section, .hero-rounded-bottom { display: none !important; } }
        @php
            $paper = data_get($printSettings ?? [], 'paper', 'A4');
            $orientation = data_get($printSettings ?? [], 'orientation', 'landscape');
            
            $sizeCss = $paper . ' ' . $orientation;
            if ($paper === 'IDCARD') {
                $w = '53.98mm'; $h = '85.60mm';
                if ($orientation === 'landscape') { $tmp = $w; $w = $h; $h = $tmp; }
                $sizeCss = $w . ' ' . $h;
            } elseif ($paper === 'F4') {
                $w = '215mm'; $h = '330mm';
                if ($orientation === 'landscape') { $tmp = $w; $w = $h; $h = $tmp; }
                $sizeCss = $w . ' ' . $h;
            }
        @endphp
        @media print {
            @page {
                size: {{ $sizeCss }};
                margin: 0cm;
            }
            body { 
                margin: 0 !important; 
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    </style>
</head>
<body>
@if(!empty($showHero))
<section class="hero-news-section relative overflow-hidden" style="--color-hero-start:#1e3a8a; --color-hero-end:#bfa100;">
  @php $heroAnim = \App\Models\Setting::get('hero_animation_style', 'circles'); @endphp
  <div class="hero-gradient-bg"></div>
  @if($heroAnim !== 'clean')
    <div class="hero-dots-pattern"></div>
  @endif
  @switch($heroAnim)
    @case('circles')
      <div class="hero-circles">
        <div class="hero-circle hero-circle-1"></div>
        <div class="hero-circle hero-circle-2"></div>
        <div class="hero-circle hero-circle-3"></div>
      </div>
      @break
    @case('rain')
      <div class="hero-rain-streaks"></div>
      @break
    @case('waves')
      <div class="hero-diagonal-waves"></div>
      @break
    @case('particles')
      <div class="hero-snow-particles"></div>
      @break
    @case('parallax')
      <div class="hero-gradient-overlay"></div>
      <div class="hero-gradient-overlay-top"></div>
      @break
    @default
      <!-- clean -->
  @endswitch
  @php
    $dateStr = $activity->date ? (method_exists($activity->date, 'format') ? $activity->date->format('d M Y') : (string) $activity->date) : null;
  @endphp
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center" style="position: relative; z-index: 3;">
    <h1 class="hero-news-title font-bold text-white mb-3">{{ data_get($activity,'title') ?? data_get($activity,'name') ?? 'Judul Kegiatan' }}</h1>
    @if(!empty($activity->location))
      <p class="hero-news-subtitle" style="color:#ffffff">{{ $activity->location }}</p>
    @endif
    @if(!empty($dateStr))
      <p class="hero-news-subtitle" style="color:#ffffff">{{ $dateStr }}</p>
    @endif
    @if(!empty($activity->description))
      <p class="hero-news-excerpt mx-auto" style="color:#ffffff">{{ \Illuminate\Support\Str::limit(strip_tags($activity->description), 200) }}</p>
    @endif
  </div>
  <div class="hero-rounded-bottom"></div>
</section>
@endif
@if(empty($showHero))
@php $isValid = isset($participants) && count($participants) > 0; $p = $isValid ? $participants->first() : null; @endphp
<section class="no-print" style="padding:16px; background:#f8fafc; border-bottom:1px solid #e5e7eb;">
  <div style="max-width:1080px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; gap:12px;">
    <div>
      <div style="font-size:18px; font-weight:800; color:#111827;">Verifikasi Sertifikat</div>
      <div style="font-size:14px; color:#374151;">
        @if($isValid)
          <span style="color:#111827;">{{ optional(optional($p)->user)->name ?? 'Peserta' }}</span>
          @if(!empty($p->certificate_id))
            <span style="margin-left:8px; color:#6b7280;">ID: {{ $p->certificate_id }}</span>
          @endif
        @else
          Sertifikat tidak ditemukan atau tidak valid
        @endif
      </div>
    </div>
    <div>
      @if($isValid)
        <span style="display:inline-block; padding:8px 12px; border-radius:999px; background:#10b981; color:#fff; font-weight:700; font-size:13px;">Sertifikat Asli</span>
      @else
        <span style="display:inline-block; padding:8px 12px; border-radius:999px; background:#ef4444; color:#fff; font-weight:700; font-size:13px;">Tidak Valid</span>
      @endif
    </div>
  </div>
</section>
@endif
@php
    $widthCmDefault = (float) data_get($certificateSetting, 'card.width_cm', 21);
    $heightCmDefault = (float) data_get($certificateSetting, 'card.height_cm', 29.7);
    $bgFilenameGlobal = data_get($certificateSetting, 'card.background');
    if (!$bgFilenameGlobal) {
        $bgFilenameGlobal = \Illuminate\Support\Facades\DB::table('certificate_backgrounds')
            ->where('activity_id', $activity->id)
            ->orderBy('id', 'desc')
            ->value('filename');
    }
    if (!function_exists('image_to_base64_data_uri')) {
        function image_to_base64_data_uri($path) {
            if (!file_exists($path) || !is_readable($path)) { return null; }
            $type = mime_content_type($path);
            if ($type === false) { $type = 'image/' . pathinfo($path, PATHINFO_EXTENSION); }
            $data = file_get_contents($path);
            return 'data:' . $type . ';base64,' . base64_encode($data);
        }
    }
    $certificatesPerPage = max(1, (int)($cols * $rows));
@endphp

@if(!empty($showHero) || request()->has('debug'))
<div class="no-print" style="width: {{ $widthCmDefault }}cm; margin: 10px auto;">
  <button onclick="window.print()" class="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition duration-200" style="width: 100%;">Download Sertifikat</button>
</div>
@endif
<div class="certificates-container {{ !empty($showHero) ? 'center' : '' }}">
@foreach($participants->chunk($certificatesPerPage) as $pageIndex => $page)
    @if($pageIndex > 0)
        <div class="page-break"></div>
    @endif
    @foreach($page->chunk($cols) as $rowIndex => $row)
        <div class="certificate-page-row">
            @foreach($row as $peserta)
                @php
                    $profileParticipant = optional(optional($peserta)->user)->profile;
                    $provinceParticipant = optional($profileParticipant->province)->name ?? ($profileParticipant->other_province ?? null);
                    $regencyParticipant = optional($profileParticipant->regency)->name ?? ($profileParticipant->other_regency ?? null);
                    $districtParticipant = optional($profileParticipant->district)->name ?? ($profileParticipant->other_district ?? null);

                    // Apply certificate settings & Fit to Paper Logic (same as print_certificates_html)
                    $origWidthCm = (float) data_get($certificateSetting, 'card.width_cm', 8.6);
                    $origHeightCm = (float) data_get($certificateSetting, 'card.height_cm', 15);
                    $widthCm = $origWidthCm;
                    $heightCm = $origHeightCm;
                    
                    $paper = data_get($printSettings ?? [], 'paper', 'A4');
                    $orientation = data_get($printSettings ?? [], 'orientation', 'landscape');
                    $paperUpper = strtoupper($paper);
                    $paperDims = [21.0, 29.7]; // default A4 cm
                    switch ($paperUpper) {
                        case 'A3': $paperDims = [29.7, 42.0]; break;
                        case 'A4': $paperDims = [21.0, 29.7]; break;
                        case 'A5': $paperDims = [14.8, 21.0]; break;
                        case 'LETTER': $paperDims = [21.59, 27.94]; break;
                        case 'LEGAL': $paperDims = [21.59, 35.56]; break;
                        case 'F4': $paperDims = [21.5, 33.0]; break;
                        case 'IDCARD': $paperDims = [5.398, 8.56]; break;
                    }
                    if ($orientation === 'landscape') { $paperDims = [$paperDims[1], $paperDims[0]]; }

                    $marginCss = data_get($printSettings ?? [], 'margin', '0cm');
                    $marginVal = 0.0;
                    if (is_string($marginCss)) {
                        if (str_contains($marginCss, 'mm')) {
                            $marginVal = (float) str_replace(['mm',' '],'', $marginCss) / 10.0;
                        } else {
                            $marginVal = (float) str_replace(['cm',' '],'', $marginCss);
                        }
                    }

                    $sizeAdjustMm = (float) data_get($printSettings ?? [], 'size_adjust_mm', 0);
                    $offsetTopMm = (float) data_get($printSettings ?? [], 'offset_top_mm', 0);
                    $offsetLeftMm = (float) data_get($printSettings ?? [], 'offset_left_mm', 0);
                    $sizeAdjustCm = $sizeAdjustMm / 10.0;
                    $offsetTopCm = $offsetTopMm / 10.0;
                    $offsetLeftCm = $offsetLeftMm / 10.0;
                    
                    $availableWidthCm = max(0.0, $paperDims[0] - 2*$marginVal);
                    $availableHeightCm = max(0.0, $paperDims[1] - 2*$marginVal);
                    $fitEpsilonCm = 0.1;

                    if ((($cols ?? 1) == 1) && (($rows ?? 1) == 1)) {
                        $availW = max(0.0, ($availableWidthCm - $fitEpsilonCm) + $sizeAdjustCm);
                        $availH = max(0.0, ($availableHeightCm - $fitEpsilonCm) + $sizeAdjustCm);
                        
                        // Use Stretch to Fit (match print_certificates_html.blade.php)
                        // This ensures that if the design was done on a stretched canvas, the preview matches it.
                        $widthCm = $availW;
                        $heightCm = $availH;
                    } else {
                        $widthCm = min(max(0.0, $widthCm + $sizeAdjustCm), $availableWidthCm - $fitEpsilonCm);
                        $heightCm = min(max(0.0, $heightCm + $sizeAdjustCm), $availableHeightCm - $fitEpsilonCm);
                    }

                    // MATCH PRINTING LOGIC: Scale to fit paper, then scale elements
                    $savedBaseW = (float) (data_get($certificateSetting, 'card.base_width_px') ?? data_get($certificateSetting, 'card.width_px') ?? 0);
                    $savedBaseH = (float) (data_get($certificateSetting, 'card.base_height_px') ?? data_get($certificateSetting, 'card.height_px') ?? 0);
                    
                    $pxW = $widthCm * 37.8;
                    $pxH = $heightCm * 37.8;
                    
                    $baseW = ($savedBaseW > 0) ? $savedBaseW : $pxW;
                    $baseH = ($savedBaseH > 0) ? $savedBaseH : $pxH;
                    
                    $scaleX = ($savedBaseW > 0) ? ($pxW / $savedBaseW) : 1.0;
                    $scaleY = ($savedBaseH > 0) ? ($pxH / $savedBaseH) : 1.0;
                    $fontScale = 1.0; // Fonts are not scaled in print_certificates_html.blade.php

                    $certificateType = data_get($certificateSetting, 'certificate_type', 'single');
                    $isDoubleSided = (strtolower(trim((string)$certificateType)) === 'double');
                    $bgFilename = $bgFilenameGlobal;
                    $bgPathCandidate = $bgFilename ? public_path('assets/images/certificate/' . $bgFilename) : null;
                    $bgFileExists = $bgPathCandidate && file_exists($bgPathCandidate);
                    $bgPath = $bgFileExists ? $bgPathCandidate : null;
                    if (!$bgPath) {
                        $defaultDir = public_path('assets/images/certificate/background/default');
                        $files = glob($defaultDir.'/*.{png,jpg,jpeg,gif,webp}', GLOB_BRACE);
                        $bgPath = ($files && count($files) > 0) ? ($defaultDir.'/'.basename($files[0])) : null;
                    }
                    $bgBase64 = image_to_base64_data_uri($bgPath);
                    $titleStyle = data_get($certificateSetting, 'title', []);
                    $photoStyle = data_get($certificateSetting, 'photo', []);
                    $qrStyle = data_get($certificateSetting, 'qr', []);
                    $photoSizeSetting = (float) data_get($photoStyle, 'size', 90) * $scaleX;
                    $photoShape = data_get($photoStyle, 'shape', 'square');
                    $photoFilename = optional($profileParticipant)->foto;
                    $photoPath = $photoFilename ? public_path('assets/images/profilefoto/' . $photoFilename) : public_path('assets/images/profilefoto/default-profile.png');
                    $photoBase64 = image_to_base64_data_uri($photoPath);
                    $imgAspectRatio = 1.0;
                    if (file_exists($photoPath)) {
                        $imgInfo = @getimagesize($photoPath);
                        if ($imgInfo && $imgInfo[1] > 0) {
                            $imgAspectRatio = $imgInfo[0] / $imgInfo[1];
                        }
                    }
                    $overlayColor = data_get($photoStyle, 'overlay_color', '#000000');
                    $overlayOpacity = (int) data_get($photoStyle, 'overlay_opacity', 0);
                    $overlayAlpha = max(0, min(100, $overlayOpacity)) / 100.0;
                    $qrTop = (int) round((float) data_get($qrStyle, 'top', 320) * $scaleY);
                    $qrLeft = (int) round((float) data_get($qrStyle, 'left', 90) * $scaleX);
                    $qrSizeInput = (float) data_get($qrStyle, 'size', 80);
                    $qrSize = max(0, (int) round($qrSizeInput * $scaleX));
                @endphp
                <div class="certificate-page-cell" style="width: {{ $widthCm }}cm; height: {{ $heightCm }}cm;">
                    <div class="yellow-card-3d" style="width: 100%; height: 100%; --offset-left: {{ $offsetLeftCm }}cm; --offset-top: {{ $offsetTopCm }}cm;" data-offset-left="{{ $offsetLeftCm }}cm" data-offset-top="{{ $offsetTopCm }}cm">
                        @php
                            $bgUrl = $bgFileExists
                                ? asset('assets/images/certificate/' . $bgFilename)
                                : (function(){ $d=public_path('assets/images/certificate/background/default'); $fs=glob($d.'/*.{png,jpg,jpeg,gif,webp}', GLOB_BRACE); return ($fs && count($fs)>0) ? asset('assets/images/certificate/background/default/'.basename($fs[0])) : null; })();
                        @endphp
                        @if($bgBase64)
                            <img src="{{ $bgBase64 }}" alt="Certificate Background">
                        @else
                            <img src="{{ $bgUrl }}" alt="Certificate Background">
                        @endif
                        <div class="certificate-content-wrapper" style="position: relative; width: 100%; height: 100%;">
                            @php
                                $titleFont = data_get($titleStyle, 'font');
                                if (empty($titleFont) || $titleFont === 'undefined') { $titleFont = 'DejaVu Sans'; }
                            @endphp
                            @if(data_get($titleStyle, 'visible', true))
                            @php
                                $titleTop = (int) round((float) data_get($titleStyle, 'top', 20) * $scaleY);
                                $titleLeft = (int) round((float) data_get($titleStyle, 'marginLeft', data_get($titleStyle, 'left', 0)) * $scaleX);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $titleTop }}px;
                                left:0;
                                width:100%;
                                margin-left:{{ $titleLeft }}px;
                                font-size:{{ data_get($titleStyle, 'size', 18) }}px;
                                color:{{ data_get($titleStyle, 'color', '#bfa100') }};
                                font-family:'{{ $titleFont }}';
                                font-weight:{{ data_get($titleStyle, 'weight', 'bold') }};
                                font-style:{{ data_get($titleStyle, 'italic', 'normal') }};
                                text-align:{{ data_get($titleStyle, 'align', 'center') }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 6px;
                            ">{{ str_replace(["\r\n","\n"], ' ', ($activity->name ?? 'Sertifikat PESERTA')) }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'name.visible', true))
                            @php
                                $nameFont = data_get($certificateSetting, 'name.font');
                                if (empty($nameFont) || $nameFont === 'undefined') { $nameFont = 'DejaVu Sans'; }
                                $nameAlignRaw = strtolower((string) data_get($certificateSetting, 'name.align', 'center'));
                                $nameAlignCss = in_array($nameAlignRaw, ['kiri','left']) ? 'left' : (in_array($nameAlignRaw, ['kanan','right']) ? 'right' : 'center');
                                // Use exact values from database - match the exact precision shown in debug
                                $nameTopRaw = (float) data_get($certificateSetting, 'name.top', 190);
                                $nameLeftRaw = (float) data_get($certificateSetting, 'name.left', 30);
                                $nameWidthRaw = (float) data_get($certificateSetting, 'name.width', 180);
                                // Apply scaling exactly like print_certificates_html.blade.php
                                // Calculate with full precision first, then round for display
                                $nameTopCalculated = $nameTopRaw * $scaleY;
                                $nameLeftCalculated = $nameLeftRaw * $scaleX;
                                $nameWidthCalculated = $nameWidthRaw * $scaleX;
                                // Round to match print behavior (print uses int round)
                                $nameTop = (int) round($nameTopCalculated);
                                $nameLeft = (int) round($nameLeftCalculated);
                                $nameWidth = (int) round($nameWidthCalculated);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $nameTop }}px;
                                left:{{ $nameLeft }}px;
                                width:{{ $nameWidth }}px;
                                font-size:{{ data_get($certificateSetting, 'name.size', 16) }}px;
                                color:{{ data_get($certificateSetting, 'name.color', '#333333') }};
                                font-family:'{{ $nameFont }}';
                                font-weight:{{ data_get($certificateSetting, 'name.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'name.italic', 'normal') }};
                                text-align:{{ $nameAlignCss }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ optional(optional($peserta)->user)->name ?? '-' }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'email.visible', true))
                            @php
                                $emailFont = data_get($certificateSetting, 'email.font');
                                if (empty($emailFont) || $emailFont === 'undefined') { $emailFont = 'DejaVu Sans'; }
                            @endphp
                            @php
                                $emailTop = (int) round((float) data_get($certificateSetting, 'email.top', 220) * $scaleY);
                                $emailLeft = (int) round((float) data_get($certificateSetting, 'email.left', 30) * $scaleX);
                                $emailWidth = (int) round((float) data_get($certificateSetting, 'email.width', 180) * $scaleX);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $emailTop }}px;
                                left:{{ $emailLeft }}px;
                                width:{{ $emailWidth }}px;
                                font-size:{{ data_get($certificateSetting, 'email.size', 16) }}px;
                                color:{{ data_get($certificateSetting, 'email.color', '#333333') }};
                                font-family:'{{ $emailFont }}';
                                font-weight:{{ data_get($certificateSetting, 'email.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'email.italic', 'normal') }};
                                text-align:{{ data_get($certificateSetting, 'email.align', 'center') }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ optional(optional($peserta)->user)->email ?? '-' }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'no_hp.visible', false))
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ data_get($certificateSetting, 'no_hp.top', 240) }}px;
                                left:{{ data_get($certificateSetting, 'no_hp.left', 30) }}px;
                                width:{{ data_get($certificateSetting, 'no_hp.width', 180) }}px;
                                font-size:{{ data_get($certificateSetting, 'no_hp.size', 16) }}px;
                                color:{{ data_get($certificateSetting, 'no_hp.color', '#333333') }};
                                font-family:'{{ data_get($certificateSetting, 'no_hp.font', 'DejaVu Sans') }}';
                                font-weight:{{ data_get($certificateSetting, 'no_hp.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'no_hp.italic', 'normal') }};
                                text-align:{{ data_get($certificateSetting, 'no_hp.align', 'center') }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ optional($profileParticipant)->no_hp ?? '-' }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'jenis_kelamin.visible', false))
                            @php
                                $genderTop = (int) round((float) data_get($certificateSetting, 'jenis_kelamin.top', 260) * $scaleY);
                                $genderLeft = (int) round((float) data_get($certificateSetting, 'jenis_kelamin.left', 30) * $scaleX);
                                $genderWidth = (int) round((float) data_get($certificateSetting, 'jenis_kelamin.width', 180) * $scaleX);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $genderTop }}px;
                                left:{{ $genderLeft }}px;
                                width:{{ $genderWidth }}px;
                                font-size:{{ data_get($certificateSetting, 'jenis_kelamin.size', 16) }}px;
                                color:{{ data_get($certificateSetting, 'jenis_kelamin.color', '#333333') }};
                                font-family:'{{ data_get($certificateSetting, 'jenis_kelamin.font', 'DejaVu Sans') }}';
                                font-weight:{{ data_get($certificateSetting, 'jenis_kelamin.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'jenis_kelamin.italic', 'normal') }};
                                text-align:{{ data_get($certificateSetting, 'jenis_kelamin.align', 'center') }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ optional($profileParticipant)->jenis_kelamin ?? '-' }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'pekerjaan.visible', false))
                            @php
                                $jobTop = (int) round((float) data_get($certificateSetting, 'pekerjaan.top', 280) * $scaleY);
                                $jobLeft = (int) round((float) data_get($certificateSetting, 'pekerjaan.left', 30) * $scaleX);
                                $jobWidth = (int) round((float) data_get($certificateSetting, 'pekerjaan.width', 180) * $scaleX);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $jobTop }}px;
                                left:{{ $jobLeft }}px;
                                width:{{ $jobWidth }}px;
                                font-size:{{ data_get($certificateSetting, 'pekerjaan.size', 16) }}px;
                                color:{{ data_get($certificateSetting, 'pekerjaan.color', '#333333') }};
                                font-family:'{{ data_get($certificateSetting, 'pekerjaan.font', 'DejaVu Sans') }}';
                                font-weight:{{ data_get($certificateSetting, 'pekerjaan.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'pekerjaan.italic', 'normal') }};
                                text-align:{{ data_get($certificateSetting, 'pekerjaan.align', 'center') }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ optional($profileParticipant)->pekerjaan ?? '-' }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'instansi.visible', false))
                            @php
                                $instTop = (int) round((float) data_get($certificateSetting, 'instansi.top', 290) * $scaleY);
                                $instLeft = (int) round((float) data_get($certificateSetting, 'instansi.left', 30) * $scaleX);
                                $instWidth = (int) round((float) data_get($certificateSetting, 'instansi.width', 180) * $scaleX);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $instTop }}px;
                                left:{{ $instLeft }}px;
                                width:{{ $instWidth }}px;
                                font-size:{{ data_get($certificateSetting, 'instansi.size', 16) }}px;
                                color:{{ data_get($certificateSetting, 'instansi.color', '#333333') }};
                                font-family:'{{ data_get($certificateSetting, 'instansi.font', 'DejaVu Sans') }}';
                                font-weight:{{ data_get($certificateSetting, 'instansi.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'instansi.italic', 'normal') }};
                                text-align:{{ data_get($certificateSetting, 'instansi.align', 'center') }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ optional($profileParticipant)->instansi ?? '-' }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'jabatan.visible', false))
                            @php
                                $roleTop = (int) round((float) data_get($certificateSetting, 'jabatan.top', 300) * $scaleY);
                                $roleLeft = (int) round((float) data_get($certificateSetting, 'jabatan.left', 30) * $scaleX);
                                $roleWidth = (int) round((float) data_get($certificateSetting, 'jabatan.width', 180) * $scaleX);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $roleTop }}px;
                                left:{{ $roleLeft }}px;
                                width:{{ $roleWidth }}px;
                                font-size:{{ data_get($certificateSetting, 'jabatan.size', 16) }}px;
                                color:{{ data_get($certificateSetting, 'jabatan.color', '#333333') }};
                                font-family:'{{ data_get($certificateSetting, 'jabatan.font', 'DejaVu Sans') }}';
                                font-weight:{{ data_get($certificateSetting, 'jabatan.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'jabatan.italic', 'normal') }};
                                text-align:{{ data_get($certificateSetting, 'jabatan.align', 'center') }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ optional($profileParticipant)->jabatan ?? '-' }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'alamat.visible', false))
                            @php
                                $addrTop = (int) round((float) data_get($certificateSetting, 'alamat.top', 320) * $scaleY);
                                $addrLeft = (int) round((float) data_get($certificateSetting, 'alamat.left', 30) * $scaleX);
                                $addrWidth = (int) round((float) data_get($certificateSetting, 'alamat.width', 180) * $scaleX);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $addrTop }}px;
                                left:{{ $addrLeft }}px;
                                width:{{ $addrWidth }}px;
                                font-size:{{ data_get($certificateSetting, 'alamat.size', 16) }}px;
                                color:{{ data_get($certificateSetting, 'alamat.color', '#333333') }};
                                font-family:'{{ data_get($certificateSetting, 'alamat.font', 'DejaVu Sans') }}';
                                font-weight:{{ data_get($certificateSetting, 'alamat.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'alamat.italic', 'normal') }};
                                text-align:{{ data_get($certificateSetting, 'alamat.align', 'center') }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ optional($profileParticipant)->alamat ?? '-' }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'province.visible', false))
                            @php
                                $provFont = data_get($certificateSetting, 'province.font');
                                if (empty($provFont) || $provFont === 'undefined') { $provFont = 'DejaVu Sans'; }
                                $provTop = (int) round((float) data_get($certificateSetting, 'province.top', 340) * $scaleY);
                                $provLeft = (int) round((float) data_get($certificateSetting, 'province.left', 30) * $scaleX);
                                $provWidth = (int) round((float) data_get($certificateSetting, 'province.width', 180) * $scaleX);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $provTop }}px;
                                left:{{ $provLeft }}px;
                                width:{{ $provWidth }}px;
                                font-size:{{ data_get($certificateSetting, 'province.size', 16) }}px;
                                color:{{ data_get($certificateSetting, 'province.color', '#333333') }};
                                font-family:'{{ $provFont }}';
                                font-weight:{{ data_get($certificateSetting, 'province.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'province.italic', 'normal') }};
                                text-align:{{ data_get($certificateSetting, 'province.align', 'center') }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ $provinceParticipant ?? '-' }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'regency.visible', false))
                            @php
                                $regFont = data_get($certificateSetting, 'regency.font');
                                if (empty($regFont) || $regFont === 'undefined') { $regFont = 'DejaVu Sans'; }
                                $regTop = (int) round((float) data_get($certificateSetting, 'regency.top', 360) * $scaleY);
                                $regLeft = (int) round((float) data_get($certificateSetting, 'regency.left', 30) * $scaleX);
                                $regWidth = (int) round((float) data_get($certificateSetting, 'regency.width', 180) * $scaleX);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $regTop }}px;
                                left:{{ $regLeft }}px;
                                width:{{ $regWidth }}px;
                                font-size:{{ data_get($certificateSetting, 'regency.size', 16) }}px;
                                color:{{ data_get($certificateSetting, 'regency.color', '#333333') }};
                                font-family:'{{ $regFont }}';
                                font-weight:{{ data_get($certificateSetting, 'regency.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'regency.italic', 'normal') }};
                                text-align:{{ data_get($certificateSetting, 'regency.align', 'center') }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ $regencyParticipant ?? '-' }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'district.visible', false))
                            @php
                                $distFont = data_get($certificateSetting, 'district.font');
                                if (empty($distFont) || $distFont === 'undefined') { $distFont = 'DejaVu Sans'; }
                                $distTop = (int) round((float) data_get($certificateSetting, 'district.top', 380) * $scaleY);
                                $distLeft = (int) round((float) data_get($certificateSetting, 'district.left', 30) * $scaleX);
                                $distWidth = (int) round((float) data_get($certificateSetting, 'district.width', 180) * $scaleX);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $distTop }}px;
                                left:{{ $distLeft }}px;
                                width:{{ $distWidth }}px;
                                font-size:{{ data_get($certificateSetting, 'district.size', 16) }}px;
                                color:{{ data_get($certificateSetting, 'district.color', '#333333') }};
                                font-family:'{{ $distFont }}';
                                font-weight:{{ data_get($certificateSetting, 'district.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'district.italic', 'normal') }};
                                text-align:{{ data_get($certificateSetting, 'district.align', 'center') }};
                                white-space: pre-wrap;
                                overflow-wrap: anywhere;
                                word-break: break-word;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ $districtParticipant ?? '-' }}</div>
                            @endif

                            @if(data_get($certificateSetting, 'certificate_id.visible', false))
                            @php
                                $certIdFont = data_get($certificateSetting, 'certificate_id.font');
                                if (empty($certIdFont) || $certIdFont === 'undefined') { $certIdFont = 'DejaVu Sans'; }
                                $certTop = (int) round((float) data_get($certificateSetting, 'certificate_id.top', 360) * $scaleY);
                                $certLeft = (int) round((float) data_get($certificateSetting, 'certificate_id.left', 30) * $scaleX);
                                $certWidth = (int) round((float) data_get($certificateSetting, 'certificate_id.width', 180) * $scaleX);
                            @endphp
                            <div class="certificate-element" style="
                                position:absolute;
                                top:{{ $certTop }}px;
                                left:{{ $certLeft }}px;
                                width:{{ $certWidth }}px;
                                font-size:{{ data_get($certificateSetting, 'certificate_id.size', 14) }}px;
                                color:{{ data_get($certificateSetting, 'certificate_id.color', '#333333') }};
                                font-family:'{{ $certIdFont }}';
                                font-weight:{{ data_get($certificateSetting, 'certificate_id.weight', 'normal') }};
                                font-style:{{ data_get($certificateSetting, 'certificate_id.italic', 'normal') }};
                                text-align:{{ data_get($certificateSetting, 'certificate_id.align', 'left') }};
                                white-space: nowrap;
                                overflow: hidden;
                                line-height: 1.2;
                                padding: 0 2mm;
                                box-sizing: border-box;
                                ">{{ $peserta->certificate_id ?? '-' }}</div>
                            @endif

                            @if(data_get($photoStyle, 'visible', true))
                            <div class="certificate-element" style="top:{{ (int) round((float) data_get($photoStyle, 'top', 70) * $scaleY) }}px; left:{{ (int) round((float) data_get($photoStyle, 'left', 85) * $scaleX) }}px; width: {{ (int) round($photoSizeSetting) }}px; height: {{ (int) round($photoShape == 'circle' ? $photoSizeSetting : $photoSizeSetting / $imgAspectRatio) }}px;">
                                @if($photoBase64)
                                <img src="{{ $photoBase64 }}" alt="Foto" style="width:100%; height:100%; object-fit: cover; border-radius: {{ $photoShape === 'circle' ? '50%' : '12px' }};">
                                <div style="position:absolute; inset:0; background: {{ $overlayColor }}; opacity: {{ $overlayAlpha }}; border-radius: {{ $photoShape === 'circle' ? '50%' : '12px' }};"></div>
                                @endif
                            </div>
                            @endif

                            @if(data_get($qrStyle, 'visible', true))
                            <div class="certificate-element" style="top: {{ $qrTop + 20 }}px; left: {{ $qrLeft }}px;">
                                @php
                                    $qrVal = route('activity.verify-certificate', ['id' => $activity->id]) . '?certificate_id=' . urlencode((string) ($peserta->certificate_id ?? ''));
                                    $qrSizeInt = (int) round($qrSize);
                                    try {
                                        $qrBinary = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('png')->size(max($qrSizeInt,40))->generate((string) $qrVal);
                                        $qrSrc = 'data:image/png;base64,'.base64_encode($qrBinary);
                                    } catch (\Throwable $e) {
                                        $qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size='.max($qrSizeInt,40).'x'.max($qrSizeInt,40).'&data='.urlencode((string) $qrVal);
                                    }
                                @endphp
                                <img src="{{ $qrSrc }}" alt="QR Code" style="width: {{ $qrSize }}px; height: {{ $qrSize }}px; object-fit: contain;">
                            </div>
                            @endif
                        </div>
                        </div>
                    </div>
                    @if($isDoubleSided)
                        @php
                            $backBgFilename = data_get($certificateSetting, 'card.background_back');
                            $backBgPathCandidate = $backBgFilename ? public_path('assets/images/certificate/' . $backBgFilename) : null;
                            $backBgExists = $backBgPathCandidate && file_exists($backBgPathCandidate);
                            $backBgPath = $backBgExists ? $backBgPathCandidate : null;
                            $backBgBase64 = $backBgPath ? image_to_base64_data_uri($backBgPath) : $bgBase64;
                            if (!$backBgBase64) { $backBgBase64 = $bgBase64; }
                            $backScaleX = $scaleX;
                            $backScaleY = $scaleY;
                            $backOffsetLeftCm = $offsetLeftCm;
                        @endphp
                        <div class="page-break"></div>
                        <div class="certificate-page-cell" style="width: {{ $pxW }}px; height: {{ $pxH }}px;">
                        <div class="yellow-card-3d" style="width: 100%; height: 100%; --offset-left: {{ $backOffsetLeftCm }}cm; --offset-top: {{ $offsetTopCm }}cm;" data-offset-left="{{ $backOffsetLeftCm }}cm" data-offset-top="{{ $offsetTopCm }}cm">
                            @if($backBgBase64)
                                <img src="{{ $backBgBase64 }}" alt="Certificate Background">
                            @endif
                            <div class="certificate-content-wrapper">
                                @php
                                    $backTitleVisible = (bool) data_get($certificateSetting, 'back_title.visible', true);
                                    $backSubtitleVisible = (bool) data_get($certificateSetting, 'back_subtitle.visible', false);
                                    $backContentVisible = (bool) data_get($certificateSetting, 'back_content.visible', false);
                                    $backCertIdVisible = (bool) data_get($certificateSetting, 'back_certid.visible', true);
                                @endphp
                                @if($backTitleVisible)
                                    @php
                                        $backTitleFont = data_get($certificateSetting, 'back_title.font');
                                        if (empty($backTitleFont) || $backTitleFont === 'undefined') { $backTitleFont = 'DejaVu Sans'; }
                                    @endphp
                                    <div class="certificate-element" style="
                                        top:{{ (int) round((float) data_get($certificateSetting, 'back_title.top', 100) * $scaleY) }}px;
                                        left:0;
                                        width:100%;
                                        margin-left:{{ (int) round((float) data_get($certificateSetting, 'back_title.marginLeft', (float) data_get($certificateSetting, 'back_title.left', 0)) * $scaleX) }}px;
                                        font-size:{{ (float) data_get($certificateSetting, 'back_title.size', 18) * $fontScale }}px;
                                        color:{{ data_get($certificateSetting, 'back_title.color', '#333333') }};
                                        font-family:'{{ $backTitleFont }}';
                                        font-weight:{{ data_get($certificateSetting, 'back_title.weight', 'bold') }};
                                        font-style:{{ data_get($certificateSetting, 'back_title.italic', 'normal') }};
                                        text-align:{{ data_get($certificateSetting, 'back_title.align', 'center') }};
                                        line-height: 1.2;
                                        padding: 0 2mm;
                                        box-sizing: border-box;
                                        white-space: pre-wrap;
                                        overflow-wrap: anywhere;
                                        word-break: break-word;">
                                        {{ $activity->name ?? 'Sertifikat Peserta' }}
                                    </div>
                                @endif
                                @if($backSubtitleVisible)
                                    @php
                                        $backSubtitleFont = data_get($certificateSetting, 'back_subtitle.font');
                                        if (empty($backSubtitleFont) || $backSubtitleFont === 'undefined') { $backSubtitleFont = 'DejaVu Sans'; }
                                    @endphp
                                    <div class="certificate-element" style="
                                        top:{{ (int) round((float) data_get($certificateSetting, 'back_subtitle.top', 140) * $scaleY) }}px;
                                        left:0;
                                        width:100%;
                                        margin-left:{{ (int) round((float) data_get($certificateSetting, 'back_subtitle.marginLeft', (float) data_get($certificateSetting, 'back_subtitle.left', 0)) * $scaleX) }}px;
                                        font-size:{{ (float) data_get($certificateSetting, 'back_subtitle.size', 14) * $fontScale }}px;
                                        color:{{ data_get($certificateSetting, 'back_subtitle.color', '#666666') }};
                                        font-family:'{{ $backSubtitleFont }}';
                                        font-weight:{{ data_get($certificateSetting, 'back_subtitle.weight', 'normal') }};
                                        font-style:{{ data_get($certificateSetting, 'back_subtitle.italic', 'normal') }};
                                        text-align:{{ data_get($certificateSetting, 'back_subtitle.align', 'center') }};
                                        line-height: 1.2;
                                        padding: 0 2mm;
                                        box-sizing: border-box;
                                        white-space: pre-wrap;
                                        overflow-wrap: anywhere;
                                        word-break: break-word;">
                                        Informasi Tambahan
                                    </div>
                                @endif
                                @if($backContentVisible)
                                    @php
                                        $backContentFont = data_get($certificateSetting, 'back_content.font');
                                        if (empty($backContentFont) || $backContentFont === 'undefined') { $backContentFont = 'DejaVu Sans'; }
                                    @endphp
                                    <div class="certificate-element" style="
                                        top:{{ (int) round((float) data_get($certificateSetting, 'back_content.top', 180) * $scaleY) }}px;
                                        left:{{ (int) round((float) data_get($certificateSetting, 'back_content.left', 50) * $scaleX) }}px;
                                        width:{{ (int) round((float) data_get($certificateSetting, 'back_content.width', 400) * $scaleX) }}px;
                                        font-size:{{ (float) data_get($certificateSetting, 'back_content.size', 12) * $fontScale }}px;
                                        color:{{ data_get($certificateSetting, 'back_content.color', '#555555') }};
                                        font-family:'{{ $backContentFont }}';
                                        font-weight:{{ data_get($certificateSetting, 'back_content.weight', 'normal') }};
                                        font-style:{{ data_get($certificateSetting, 'back_content.italic', 'normal') }};
                                        text-align:{{ data_get($certificateSetting, 'back_content.align', 'left') }};
                                        line-height: 1.2;
                                        padding: 0 2mm;
                                        box-sizing: border-box;
                                        white-space: pre-wrap;
                                        overflow-wrap: anywhere;
                                        word-break: break-word;">
                                        {{ data_get($certificateSetting, 'back_content.text', 'Sertifikat ini diterbitkan sebagai bukti keikutsertaan dalam kegiatan.') }}
                                    </div>
                                @endif
                                @if($backCertIdVisible)
                                    @php
                                        $backCertIdFont = data_get($certificateSetting, 'back_certid.font');
                                        if (empty($backCertIdFont) || $backCertIdFont === 'undefined') { $backCertIdFont = 'DejaVu Sans'; }
                                    @endphp
                                    <div class="certificate-element" style="
                                        top:{{ (int) round((float) data_get($certificateSetting, 'back_certid.top', 260) * $scaleY) }}px;
                                        left:{{ (int) round((float) data_get($certificateSetting, 'back_certid.left', 50) * $scaleX) }}px;
                                        width:{{ (int) round((float) data_get($certificateSetting, 'back_certid.width', 400) * $scaleX) }}px;
                                        font-size:{{ (float) data_get($certificateSetting, 'back_certid.size', 12) * $fontScale }}px;
                                        color:{{ data_get($certificateSetting, 'back_certid.color', '#555555') }};
                                        font-family:'{{ $backCertIdFont }}';
                                        font-weight:{{ data_get($certificateSetting, 'back_certid.weight', 'normal') }};
                                        font-style:{{ data_get($certificateSetting, 'back_certid.italic', 'normal') }};
                                        text-align:{{ data_get($certificateSetting, 'back_certid.align', 'left') }};
                                        line-height: 1.2;
                                        padding: 0 2mm;
                                        box-sizing: border-box;
                                        white-space: pre-wrap;
                                        overflow-wrap: anywhere;
                                        word-break: break-word;">
                                        {{ $peserta->certificate_id ?? '-' }}
                                    </div>
                                @endif
                            </div>
                        </div>
                        </div>
                    @endif
            @endforeach
            @if(count($row) < $cols)
                @php
                    $pxWDefault = $widthCmDefault * 37.8;
                    $pxHDefault = $heightCmDefault * 37.8;
                @endphp
                @for($i = 0; $i < $cols - count($row); $i++)
                    <div class="certificate-page-cell" style="width: {{ $pxWDefault }}px; height: {{ $pxHDefault }}px;"></div>
                @endfor
            @endif
        </div>
    @endforeach
@endforeach
</div>

</body>
</html>
