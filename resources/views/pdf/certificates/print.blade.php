<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cetak Sertifikat - {{ $activity->name ?? 'Sertifikat Peserta' }}</title>
    <style>
        @media print {
            @page {
                @php
                    $printSettings = $printSettings ?? [];
                    $paperUpper = strtoupper($paper ?? 'A4');
                    $orientation = $orientation ?? 'portrait';
                    $cols = max(1, (int)($cols ?? ($printSettings['cols'] ?? 1)));
                    $rows = max(1, (int)($rows ?? ($printSettings['rows'] ?? 1)));

                    $isCustomF4 = ($paperUpper === 'F4');
                    $isCustomIdCard = ($paperUpper === 'IDCARD');

                    if ($isCustomF4) {
                        $w = '215mm';
                        $h = '330mm';
                        if ($orientation === 'landscape') { $tmp = $w; $w = $h; $h = $tmp; }
                        $sizeCss = $w.' '.$h;
                    } elseif ($isCustomIdCard) {
                        $w = '53.98mm';
                        $h = '85.60mm';
                        if ($orientation === 'landscape') { $tmp = $w; $w = $h; $h = $tmp; }
                        $sizeCss = $w.' '.$h;
                    } else {
                        $sizeCss = ($paper.' '.$orientation);
                    }
                @endphp
                size: {{ $sizeCss }};
                margin: {{ data_get($printSettings ?? [], 'margin', '0cm') }};
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            .no-print {
                display: none !important;
            }
            .page-break {
                page-break-after: always;
            }
            .certificate-page-row {
                page-break-inside: avoid;
            }
            .yellow-card-3d {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                background-image: inherit !important;
                background-color: inherit !important;
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                margin: 0 !important;
            }
            .yellow-card-3d img[alt="Certificate Background"] {
                width: 100% !important;
                height: 100% !important;
                object-fit: fill !important;
                object-position: center !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            .certificates-container {
                display: block;
                width: 100%;
                margin: 0 !important;
                padding: 0 !important;
            }
            .certificate-page-row {
                display: block;
            }
            .certificate-page-cell {
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: center;
                width: 100%;
                padding: 0;
                margin: 0;
            }
            .certificate-page-cell .certificate-container {
                margin-bottom: 10px;
            }
            .certificate-page-cell .certificate-back {
                margin-top: 10px;
            }
        }
        body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #fafafa;
            margin: 0;
            padding: 20px;
        }
        .certificates-container {
            display: grid;
            grid-template-columns: repeat({{ $cols }}, 1fr);
            gap: 12mm 10px;
            max-width: 100%;
            justify-items: center;
            justify-content: center;
        }
        @media (max-width: 768px) {
            .certificates-container {
                grid-template-columns: 1fr;
            }
        }
        .yellow-card-3d {
            background-color: transparent;
            border-radius: 20px;
            box-shadow:
                0 8px 24px 0 rgba(0,0,0,0.18),
                0 1.5px 4px 0 rgba(255, 215, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s cubic-bezier(.25,.8,.25,1), box-shadow 0.2s;
            border: 2px solid #fff9c4;
            /* 3D effect */
            perspective: 800px;
            position: relative;
            overflow: hidden;
            margin: 0 auto;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
            box-sizing: border-box;
        }
        .card-content {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 24px 16px 16px 16px;
            box-sizing: border-box;
            /* background: rgba(255,255,255,0.70); */
            border-radius: 18px;
            position: relative;
        }
        .card-title {
            width: 100%;
            display: block;
            /* Izinkan teks melewati lebar Sertifikat dan tetap menghormati Enter */
            white-space: pre-wrap;          /* pertahankan line break dari input */
            overflow-wrap: anywhere;        /* patahkan kata panjang agar tidak overflow */
            word-break: break-word;         /* fallback untuk beberapa browser */
            line-height: 1.2;               /* sedikit rapat agar multi-baris rapi */
            pointer-events: auto !important;
            cursor: text;
            padding: 0;
            margin-left: 0;
            text-indent: 0;
        }
        .editable-selected { outline: 2px dashed #93c5fd; outline-offset: 2px; border-radius: 6px; }
        .bg-thumb { width: 38px; height: 54px; object-fit: cover; border-radius: 6px; border: 2px solid #ffe066; cursor: pointer; }
        .card-title {
            font-size: 1.1rem;
            font-weight: bold;
            color: #bfa100;
            margin-bottom: 10px;
            letter-spacing: 1px;
            text-align: left;
            font-family: 'Segoe UI', Arial, sans-serif;
        }
        .card-photo {
            width: 90px;
            height: 110px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.10);
            margin-bottom: 12px;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .card-photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .photo-overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; border-radius: inherit; display: none; }
        /* CSS untuk QR code dihapus - semua menggunakan inline style dari setting */
        .yellow-card-3d:hover {
            transform: rotateY(8deg) scale(1.04);
            box-shadow:
                0 16px 48px 0 rgba(0,0,0,0.22),
                0 3px 8px 0 rgba(255, 215, 0, 0.4);
        }
        .drag-item.dragging {
            opacity: 0.7;
            box-shadow: 0 0 8px #bfa100;
            /* Nonaktifkan pointer event pada child saat drag agar tidak mengganggu */
            pointer-events: none;
        }
        .card-photo img {
            pointer-events: none;
            object-fit: contain;
        }
        .card-photo { z-index: 2; }
        .card-title { z-index: 3; }
        /* Profile list on card */
        /* Profile list on card */
        .circle-photo {
            border-radius: 50% !important;
            overflow: hidden;
        }
        .square-photo {
            border-radius: 12px !important;
            overflow: hidden;
        }
        /* CSS untuk QR code di print dihapus - semua menggunakan inline style dari setting */
        .no-print {
            text-align: center;
            margin: 20px 0;
        }
        .no-print button {
            background: #bfa100;
            color: #fff;
            border: none;
            border-radius: 8px;
            padding: 12px 24px;
            font-size: 1rem;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .no-print button:hover {
            background: #998000;
        }
    </style>
</head>
<body>
    <div class="no-print">
        <button onclick="window.print()">Cetak Sertifikat</button>
    </div>

    @php
        $certificatesPerPage = $cols * $rows;
        $certificateType = data_get($certificateSetting, 'certificate_type', 'single');
        $isDoubleSided = ($certificateType === 'double');
    @endphp
    <div class="certificates-container">
        @foreach($participants->chunk($certificatesPerPage) as $pageIndex => $page)
            @if($pageIndex > 0)
                <div class="page-break"></div>
            @endif
            @foreach($page->chunk($cols) as $rowIndex => $row)
                @php
                    $paperUpper = strtoupper($paper ?? 'A4');
                    $orientationVal = $orientation ?? 'portrait';
                    $paperDimsRow = [21.0, 29.7];
                    switch ($paperUpper) {
                        case 'A3': $paperDimsRow = [29.7, 42.0]; break;
                        case 'A4': $paperDimsRow = [21.0, 29.7]; break;
                        case 'A5': $paperDimsRow = [14.8, 21.0]; break;
                        case 'LETTER': $paperDimsRow = [21.59, 27.94]; break;
                        case 'LEGAL': $paperDimsRow = [21.59, 35.56]; break;
                        case 'F4': $paperDimsRow = [21.5, 33.0]; break;
                    }
                    if ($orientationVal === 'landscape') { $paperDimsRow = [$paperDimsRow[1], $paperDimsRow[0]]; }
                    $marginCssRow = data_get($printSettings ?? [], 'margin', '0cm');
                    $marginValRow = 0.0;
                    if (is_string($marginCssRow)) {
                        if (str_contains($marginCssRow, 'mm')) {
                            $marginValRow = (float) str_replace(['mm',' '],'', $marginCssRow) / 10.0;
                        } else {
                            $marginValRow = (float) str_replace(['cm',' '],'', $marginCssRow);
                        }
                    }
                    $availableHeightRowCm = max(0.0, $paperDimsRow[1] - 2*$marginValRow);
                @endphp
                <div class="certificate-page-row" style="height: {{ $availableHeightRowCm }}cm; margin: 0; padding: 0;">
                    @foreach($row as $peserta)
                        <div class="certificate-page-cell">
            @php
                $userParticipant = optional($peserta)->user;
                if (!$userParticipant) {
                    continue;
                }
                $profileParticipant = optional($userParticipant->profile);
                $provinceParticipant = optional($profileParticipant->province)->name ?? ($profileParticipant->other_province ?? null);
                $regencyParticipant = optional($profileParticipant->regency)->name ?? ($profileParticipant->other_regency ?? null);
                $districtParticipant = optional($profileParticipant->district)->name ?? ($profileParticipant->other_district ?? null);
                
                // Apply certificate settings
                $widthCm = data_get($certificateSetting, 'card.width_cm', 8.6);
                $heightCm = data_get($certificateSetting, 'card.height_cm', 15);
                $scaleToPaper = (bool) data_get($printSettings ?? [], 'scale_to_paper', false);
                $paperName = $paper ?? 'A4';
                $paperUpper = strtoupper($paperName);
                $paperDims = [21.0, 29.7]; // default A4 cm
                switch ($paperUpper) {
                    case 'A3': $paperDims = [29.7, 42.0]; break;
                    case 'A4': $paperDims = [21.0, 29.7]; break;
                    case 'A5': $paperDims = [14.8, 21.0]; break;
                    case 'LETTER': $paperDims = [21.59, 27.94]; break;
                    case 'LEGAL': $paperDims = [21.59, 35.56]; break;
                    case 'F4': $paperDims = [21.5, 33.0]; break;
                }
                if (($orientation ?? 'portrait') === 'landscape') { $paperDims = [$paperDims[1], $paperDims[0]]; }
                $marginCss = data_get($printSettings ?? [], 'margin', '0cm');
                $marginVal = 0.0;
                if (is_string($marginCss)) {
                    if (str_contains($marginCss, 'mm')) {
                        $marginVal = (float) str_replace(['mm',' '],'', $marginCss) / 10.0;
                    } else {
                        $marginVal = (float) str_replace(['cm',' '],'', $marginCss);
                    }
                }
                $offsetTopMm = (float) data_get($printSettings ?? [], 'offset_top_mm', 0);
                $offsetLeftMm = (float) data_get($printSettings ?? [], 'offset_left_mm', 0);
                $sizeAdjustMm = (float) data_get($printSettings ?? [], 'size_adjust_mm', 0);
                $offsetTopCm = $offsetTopMm / 10.0;
                $offsetLeftCm = $offsetLeftMm / 10.0;
                $sizeAdjustCm = $sizeAdjustMm / 10.0;
                // Hitung area kertas tersedia
                $availableWidthCm = max(0.0, $paperDims[0] - 2*$marginVal);
                $availableHeightCm = max(0.0, $paperDims[1] - 2*$marginVal);
                // Untuk 1x1, isi penuh area kertas namun berikan epsilon agar tidak overflow ke halaman 2
                // Banyak browser menambahkan margin minimum saat print preview meski @page margin:0
                // Epsilon kecil memastikan tinggi/lebar aman satu halaman
                $fitEpsilonCm = 0.1;
                if ((($cols ?? 1) == 1) && (($rows ?? 1) == 1)) {
                    $widthCm = max(0.0, ($availableWidthCm - $fitEpsilonCm) + $sizeAdjustCm);
                    $heightCm = max(0.0, ($availableHeightCm - $fitEpsilonCm) + $sizeAdjustCm);
                } else {
                    // Selain 1x1, pastikan tidak overflow
                    $widthCm = min(max(0.0, $widthCm + $sizeAdjustCm), $availableWidthCm - $fitEpsilonCm);
                    $heightCm = min(max(0.0, $heightCm + $sizeAdjustCm), $availableHeightCm - $fitEpsilonCm);
                }
                // Tanpa bleed (hindari offset atas/kiri agar tidak tampak margin)
                $bleedMm = 0.0;
                $bgFilename = data_get($certificateSetting, 'card.background');
                if (!$bgFilename) {
                    $bgFilename = \Illuminate\Support\Facades\DB::table('certificate_backgrounds')
                        ->where('activity_id', $activity->id)
                        ->orderBy('id', 'desc')
                        ->value('filename');
                }
                
                // Convert background image to base64 for reliable printing
                if (!function_exists('image_to_base64_data_uri')) {
                    function image_to_base64_data_uri($path) {
                        if (!file_exists($path) || !is_readable($path)) { return null; }
                        $type = mime_content_type($path);
                        if ($type === false) { $type = 'image/' . pathinfo($path, PATHINFO_EXTENSION); }
                        $data = file_get_contents($path);
                        return 'data:' . $type . ';base64,' . base64_encode($data);
                    }
                }
                $bgPath = null;
                if ($bgFilename) {
                    $bgPath = public_path('assets/images/certificate/' . $bgFilename);
                } else {
                    $defaultDir = public_path('assets/images/certificate/background/default');
                    $files = glob($defaultDir.'/*.{png,jpg,jpeg,gif,webp}', GLOB_BRACE);
                    $bgPath = ($files && count($files) > 0) ? ($defaultDir.'/'.basename($files[0])) : null;
                }
                $bgBase64 = image_to_base64_data_uri($bgPath);
                
                // Default positions and styles
                $titleStyle = data_get($certificateSetting, 'title', []);
                $photoStyle = data_get($certificateSetting, 'photo', []);
                $qrStyle = data_get($certificateSetting, 'qr', []);
                
                // Hitung skala terhadap ukuran dasar yang disimpan
                $pxW = $widthCm * 37.8;
                $pxH = $heightCm * 37.8;
                $baseW = (float) (data_get($certificateSetting, 'card.base_width_px') ?? data_get($certificateSetting, 'card.width_px') ?? 0);
                $baseH = (float) (data_get($certificateSetting, 'card.base_height_px') ?? data_get($certificateSetting, 'card.height_px') ?? 0);
                $scaleX = ($baseW > 0) ? ($pxW / $baseW) : 1.0;
                $scaleY = ($baseH > 0) ? ($pxH / $baseH) : 1.0;
                
                // Posisi dan ukuran semua objek di database sudah dalam pixel untuk ukuran sertifikat yang tersimpan
                // Ukuran sertifikat dari database: $widthCm x $heightCm
                // Di preview, posisi disimpan relatif terhadap card-content yang ukurannya = (widthCm * 37.8) x (heightCm * 37.8) px
                // Di print, kita gunakan ukuran card dalam cm yang akan di-convert ke px oleh browser
                // Jadi posisi dan ukuran QR code digunakan langsung tanpa skala (sama seperti di certificates_preview_pdf.blade.php)
                // Karena ukuran card di print menggunakan cm, browser akan otomatis convert ke px dengan ratio 1cm = 37.8px
                
                // Calculate photo size and aspect ratio (sama dengan PDF preview)
                $photoSizeSetting = data_get($photoStyle, 'size', 90);
                $photoShape = data_get($photoStyle, 'shape', 'square');
                $photoFilename = optional($profileParticipant)->foto;
                $photoPath = $photoFilename ? public_path('assets/images/profilefoto/' . $photoFilename) : public_path('assets/images/profilefoto/default-profile.png');
                $photoBase64 = image_to_base64_data_uri($photoPath);
                $imgSize = (file_exists($photoPath) && is_readable($photoPath)) ? @getimagesize($photoPath) : null;
                $imgAspectRatio = ($imgSize && isset($imgSize[0]) && isset($imgSize[1]) && $imgSize[0] > 0 && $imgSize[1] > 0) ? ($imgSize[0] / $imgSize[1]) : 1.22;
            @endphp
            <div class="yellow-card-3d certificate-container" style="width: {{ $widthCm }}cm; height: {{ $heightCm }}cm; margin-left: -{{ $offsetLeftCm }}cm; margin-top: -{{ $offsetTopCm }}cm; position: relative; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; overflow: hidden;">
                @if($bgBase64)
                    <img src="{{ $bgBase64 }}" alt="Certificate Background" class="certificate-bg-img certificate-background-img" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; object-position: center; z-index: 1; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; pointer-events: none; display: block; margin: 0; padding: 0; border: none;">
                @endif
                <div class="card-content certificate-content-wrapper" style="width: 100%; height: 100%; position:relative; z-index: 2;">
                    <!-- Judul Sertifikat -->
                    @if(data_get($titleStyle, 'visible', true))
                    @php
                        $titleTop = (int) round((float) data_get($titleStyle, 'top', 20) * $scaleY);
                        $titleLeft = (int) round((float) data_get($titleStyle, 'marginLeft', data_get($titleStyle, 'left', 0)) * $scaleX);
                    @endphp
                    <div class="card-title certificate-element" style="
                        position:absolute;
                        top:{{ $titleTop }}px;
                        left:0;
                        width:100%;
                        margin-left:{{ $titleLeft }}px;
                        font-size:{{ data_get($titleStyle, 'size', 18) }}px;
                        color:{{ data_get($titleStyle, 'color', '#bfa100') }};
                        font-family:'{{ data_get($titleStyle, 'font', 'DejaVu Sans') }}';
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
                        $nameTop = (int) round((float) data_get($certificateSetting, 'name.top', 190) * $scaleY);
                        $nameLeft = (int) round((float) data_get($certificateSetting, 'name.left', 30) * $scaleX);
                        $nameWidth = (int) round((float) data_get($certificateSetting, 'name.width', 180) * $scaleX);
                    @endphp
                    <div class="card-name certificate-element" style="
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
                    ">{{ $userParticipant->name ?? '-' }}</div>
                    @endif
                    
                    @if(data_get($certificateSetting, 'email.visible', false))
                    @php
                        $emailTop = (int) round((float) data_get($certificateSetting, 'email.top', 220) * $scaleY);
                        $emailLeft = (int) round((float) data_get($certificateSetting, 'email.left', 30) * $scaleX);
                        $emailWidth = (int) round((float) data_get($certificateSetting, 'email.width', 180) * $scaleX);
                    @endphp
                    <div class="card-email certificate-element" style="
                        position:absolute;
                        top:{{ $emailTop }}px;
                        left:{{ $emailLeft }}px;
                        width:{{ $emailWidth }}px;
                        font-size:{{ data_get($certificateSetting, 'email.size', 16) }}px;
                        color:{{ data_get($certificateSetting, 'email.color', '#333333') }};
                        font-family:'{{ data_get($certificateSetting, 'email.font', 'DejaVu Sans') }}';
                        font-weight:{{ data_get($certificateSetting, 'email.weight', 'normal') }};
                        font-style:{{ data_get($certificateSetting, 'email.italic', 'normal') }};
                        text-align:{{ data_get($certificateSetting, 'email.align', 'center') }};
                        white-space: pre-wrap;
                        overflow-wrap: anywhere;
                        word-break: break-word;
                        line-height: 1.2;
                        padding: 0 2mm;
                        box-sizing: border-box;
                    ">{{ $userParticipant->email ?? '-' }}</div>
                    @endif
                    
                    @if(data_get($certificateSetting, 'no_hp.visible', false))
                    <div class="card-phone certificate-element" style="
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
                    ">{{ $profileParticipant->no_hp ?? '-' }}</div>
                    @endif
                    
                    @if(data_get($certificateSetting, 'jenis_kelamin.visible', false))
                    @php
                        $genderTop = (int) round((float) data_get($certificateSetting, 'jenis_kelamin.top', 260) * $scaleY);
                        $genderLeft = (int) round((float) data_get($certificateSetting, 'jenis_kelamin.left', 30) * $scaleX);
                        $genderWidth = (int) round((float) data_get($certificateSetting, 'jenis_kelamin.width', 180) * $scaleX);
                    @endphp
                    <div class="card-gender certificate-element" style="
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
                    ">{{ $profileParticipant->jenis_kelamin ?? '-' }}</div>
                    @endif
                    
                    @if(data_get($certificateSetting, 'pekerjaan.visible', false))
                    @php
                        $jobTop = (int) round((float) data_get($certificateSetting, 'pekerjaan.top', 280) * $scaleY);
                        $jobLeft = (int) round((float) data_get($certificateSetting, 'pekerjaan.left', 30) * $scaleX);
                        $jobWidth = (int) round((float) data_get($certificateSetting, 'pekerjaan.width', 180) * $scaleX);
                    @endphp
                    <div class="card-job certificate-element" style="
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
                    ">{{ $profileParticipant->pekerjaan ?? '-' }}</div>
                    @endif

                    @if(data_get($certificateSetting, 'instansi.visible', false))
                    @php
                        $instTop = (int) round((float) data_get($certificateSetting, 'instansi.top', 290) * $scaleY);
                        $instLeft = (int) round((float) data_get($certificateSetting, 'instansi.left', 30) * $scaleX);
                        $instWidth = (int) round((float) data_get($certificateSetting, 'instansi.width', 180) * $scaleX);
                    @endphp
                    <div class="card-instansi certificate-element" style="
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
                    ">{{ $profileParticipant->instansi ?? '-' }}</div>
                    @endif

                    @if(data_get($certificateSetting, 'jabatan.visible', false))
                    @php
                        $roleTop = (int) round((float) data_get($certificateSetting, 'jabatan.top', 300) * $scaleY);
                        $roleLeft = (int) round((float) data_get($certificateSetting, 'jabatan.left', 30) * $scaleX);
                        $roleWidth = (int) round((float) data_get($certificateSetting, 'jabatan.width', 180) * $scaleX);
                    @endphp
                    <div class="card-role certificate-element" style="
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
                    ">{{ $profileParticipant->jabatan ?? '-' }}</div>
                    @endif
                    
                    @if(data_get($certificateSetting, 'alamat.visible', false))
                    @php
                        $addrTop = (int) round((float) data_get($certificateSetting, 'alamat.top', 320) * $scaleY);
                        $addrLeft = (int) round((float) data_get($certificateSetting, 'alamat.left', 30) * $scaleX);
                        $addrWidth = (int) round((float) data_get($certificateSetting, 'alamat.width', 180) * $scaleX);
                    @endphp
                    <div class="card-address certificate-element" style="
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
                    ">{{ $profileParticipant->alamat ?? '-' }}</div>
                    @endif
                    
                    @if(data_get($certificateSetting, 'province.visible', false))
                    @php
                        $provTop = (int) round((float) data_get($certificateSetting, 'province.top', 340) * $scaleY);
                        $provLeft = (int) round((float) data_get($certificateSetting, 'province.left', 30) * $scaleX);
                        $provWidth = (int) round((float) data_get($certificateSetting, 'province.width', 180) * $scaleX);
                    @endphp
                    <div class="card-province certificate-element" style="
                        position:absolute;
                        top:{{ $provTop }}px;
                        left:{{ $provLeft }}px;
                        width:{{ $provWidth }}px;
                        font-size:{{ data_get($certificateSetting, 'province.size', 16) }}px;
                        color:{{ data_get($certificateSetting, 'province.color', '#333333') }};
                        font-family:'{{ data_get($certificateSetting, 'province.font', 'DejaVu Sans') }}';
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
                        $regTop = (int) round((float) data_get($certificateSetting, 'regency.top', 360) * $scaleY);
                        $regLeft = (int) round((float) data_get($certificateSetting, 'regency.left', 30) * $scaleX);
                        $regWidth = (int) round((float) data_get($certificateSetting, 'regency.width', 180) * $scaleX);
                    @endphp
                    <div class="card-regency certificate-element" style="
                        position:absolute;
                        top:{{ $regTop }}px;
                        left:{{ $regLeft }}px;
                        width:{{ $regWidth }}px;
                        font-size:{{ data_get($certificateSetting, 'regency.size', 16) }}px;
                        color:{{ data_get($certificateSetting, 'regency.color', '#333333') }};
                        font-family:'{{ data_get($certificateSetting, 'regency.font', 'DejaVu Sans') }}';
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
                        $distTop = (int) round((float) data_get($certificateSetting, 'district.top', 380) * $scaleY);
                        $distLeft = (int) round((float) data_get($certificateSetting, 'district.left', 30) * $scaleX);
                        $distWidth = (int) round((float) data_get($certificateSetting, 'district.width', 180) * $scaleX);
                    @endphp
                    <div class="card-district certificate-element" style="
                        position:absolute;
                        top:{{ $distTop }}px;
                        left:{{ $distLeft }}px;
                        width:{{ $distWidth }}px;
                        font-size:{{ data_get($certificateSetting, 'district.size', 16) }}px;
                        color:{{ data_get($certificateSetting, 'district.color', '#333333') }};
                        font-family:'{{ data_get($certificateSetting, 'district.font', 'DejaVu Sans') }}';
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
                        $certTop = (int) round((int) data_get($certificateSetting, 'certificate_id.top', 360) * $scaleY);
                        $certLeft = (int) round((int) data_get($certificateSetting, 'certificate_id.left', 30) * $scaleX);
                        $certWidth = (int) round((int) data_get($certificateSetting, 'certificate_id.width', 180) * $scaleX);
                    @endphp
                    <div class="card-certid certificate-element" style="
                        position:absolute;
                        top:{{ $certTop }}px;
                        left:{{ $certLeft }}px;
                        width:{{ $certWidth }}px;
                        font-size:{{ data_get($certificateSetting, 'certificate_id.size', 14) }}px;
                        color:{{ data_get($certificateSetting, 'certificate_id.color', '#333333') }};
                        font-family:'{{ data_get($certificateSetting, 'certificate_id.font', 'DejaVu Sans') }}';
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
                    
                    <!-- Foto -->
                    @if($photoBase64 && data_get($photoStyle, 'visible', true))
                    <div class="card-photo certificate-element" style="
                        position:absolute;
                        top:{{ (int) round((float) data_get($photoStyle, 'top', 70) * $scaleY) }}px;
                        left:{{ (int) round((float) data_get($photoStyle, 'left', 85) * $scaleX) }}px;
                    ">
                        @php $photoScaled = (int) round((float) data_get($photoStyle, 'size', 90) * $scaleX); @endphp
                        <img src="{{ $photoBase64 }}" style="width: {{ $photoScaled }}px; height: {{ (data_get($photoStyle, 'shape', 'square') == 'circle' ? $photoScaled : $photoScaled / $imgAspectRatio) }}px; border-radius: {{ (data_get($photoStyle, 'shape', 'square') == 'circle' ? '50%' : '12px') }}; object-fit: cover;">
                    </div>
                    @endif
                    
                    <!-- QR Code -->
                    @php
                        // Mengambil posisi dan ukuran QR code
                        // PENTING: Di setting page, QR di-scale oleh JavaScript berdasarkan getCardScale()
                        // getCardScale() menghitung: scale = currentCardSize (yang di-render) / baseCardSize (defaultValue)
                        // actual_size adalah ukuran QR yang sudah di-scale untuk preview di setting page
                        // Di print, card menggunakan ukuran PENUH dari database dalam cm
                        // Untuk menyamakan ukuran QR di print dengan yang terlihat di setting:
                        // - Gunakan actual_size jika ada (ukuran yang benar-benar terlihat di setting)
                        // - Tapi actual_size adalah untuk card yang di-scale di preview, sedangkan di print card adalah ukuran penuh
                        // - Jadi perlu hitung balik: actual_size / scale_preview = size_input, lalu size_input * scale_print = ukuran di print
                        // - Tapi lebih mudah: gunakan actual_size dan kalikan dengan inverse scale preview
                        // - Atau lebih sederhana: jika card di print adalah baseCardSize, QR = actual_size * (baseCardSize / currentCardSize_preview)
                        // SOLUSI SEDERHANA: Gunakan size input langsung karena di print, card adalah ukuran penuh (100%)
                        // actual_size adalah untuk card yang di-scale di preview, jadi tidak relevan untuk print
                        $qrTop = (int) round(((float) data_get($qrStyle, 'top', 320) * $scaleY));
                        $qrLeft = (int) round((float) data_get($qrStyle, 'left', 90) * $scaleX);
                        $qrSizeInput = (float) data_get($qrStyle, 'size', 80);
                        $qrSizeActual = (float) data_get($qrStyle, 'actual_size', 0);
                        $qrSize = max((int) round($qrSizeInput * $scaleX), 0);
                        
                        // DEBUG: Output nilai setting QR code
                        $debugQr = [
                            'top' => $qrTop,
                            'left' => $qrLeft,
                            'size_input' => $qrSizeInput,
                            'size_actual' => $qrSizeActual,
                            'size_used' => $qrSize,
                            'width_cm' => $widthCm,
                            'height_cm' => $heightCm,
                            'qrStyle_raw' => $qrStyle,
                            'certificateSetting_qr' => data_get($certificateSetting, 'qr', []),
                        ];
                    @endphp
                    <!-- DEBUG QR CODE SETTING -->
                    <div style="position: absolute; top: 0; left: 0; background: rgba(255,0,0,0.3); padding: 5px; font-size: 10px; z-index: 9999; display: none;" class="debug-qr-info">
                        QR Debug:<br>
                        Top: {{ $qrTop }}px<br>
                        Left: {{ $qrLeft }}px<br>
                        Size Input: {{ $qrSizeInput }}px<br>
                        Size Actual: {{ $qrSizeActual ?? 'N/A' }}px<br>
                        Size Used: {{ $qrSize }}px<br>
                        Raw: {{ json_encode($qrStyle) }}
                    </div>
                    <div class="card-qr" 
                         style="position: absolute; top: {{ $qrTop }}px; left: {{ $qrLeft }}px;"
                         data-debug-top="{{ $qrTop }}" 
                         data-debug-left="{{ $qrLeft }}" 
                         data-debug-dbsize="{{ $qrSizeInput }}"
                         data-debug-size="{{ $qrSize }}"
                        data-debug-qrstyle="{{ htmlspecialchars(json_encode($qrStyle)) }}">
                        @php
                          $qrDataVal = route('activity.verify-certificate', ['id' => $activity->id]) . '?certificate_id=' . urlencode((string) ($peserta->certificate_id ?? ''));
                          try {
                            $qrBinary = \SimpleSoftwareIO\QrCode\Facades\QrCode::format('png')->size(max($qrSize, 40))->generate((string) $qrDataVal);
                            $qrBase64 = base64_encode($qrBinary);
                            $qrSrc = 'data:image/png;base64,'.$qrBase64;
                          } catch (\Throwable $e) {
                            $qrSrc = 'https://api.qrserver.com/v1/create-qr-code/?size='.max($qrSize,40).'x'.max($qrSize,40).'&data='.urlencode((string) $qrDataVal);
                          }
                        @endphp
                        <a href="{{ $qrDataVal }}" target="_blank"><img src="{{ $qrSrc }}"
                             alt="QR Code"
                             style="width: {{ $qrSize }}px !important; height: {{ $qrSize }}px !important; min-width: {{ $qrSize }}px !important; min-height: {{ $qrSize }}px !important; max-width: {{ $qrSize }}px !important; max-height: {{ $qrSize }}px !important; aspect-ratio: 1 / 1 !important; object-fit: contain !important;"></a>
                    </div>
                    <script>
                        (function(){
                            // QR Size calculation
                        })();
                    </script>
                </div>
            </div>
            
            @if($isDoubleSided)
                {{-- Sertifikat Belakang langsung di bawah sertifikat depan --}}
                @php
                    // Reuse same variables for back certificate
                    $backWidthCm = $widthCm;
                    $backHeightCm = $heightCm;
                    $backOffsetTopCm = $offsetTopCm;
                    $backOffsetLeftCm = $offsetLeftCm;
                    $backBgFilename = data_get($certificateSetting, 'card.background_back');
                    if ($backBgFilename) {
                        if (str_starts_with($backBgFilename, 'certificate-backgrounds/') || str_starts_with($backBgFilename, 'id-card-backgrounds/')) {
                            $backBgPath = storage_path('app/public/' . $backBgFilename);
                        } else {
                            $backBgPath = public_path('assets/images/certificate/' . $backBgFilename);
                        }
                        $backBgBase64 = image_to_base64_data_uri($backBgPath);
                        if (!$backBgBase64) {
                            $backBgBase64 = $bgBase64;
                        }
                    } else {
                        $backBgBase64 = $bgBase64;
                    }
                    $backScaleX = $scaleX;
                    $backScaleY = $scaleY;
                @endphp
                <div class="yellow-card-3d certificate-container certificate-back" style="width: {{ $backWidthCm }}cm; height: {{ $backHeightCm }}cm; margin-left: -{{ $backOffsetLeftCm }}cm; margin-top: 5mm; position: relative; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; overflow: hidden;">
                    @if($backBgBase64)
                        <img src="{{ $backBgBase64 }}" alt="Certificate Background" class="certificate-bg-img certificate-background-img" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: fill; object-position: center; z-index: 1; -webkit-print-color-adjust: exact; print-color-adjust: exact; color-adjust: exact; pointer-events: none; display: block; margin: 0; padding: 0; border: none;">
                    @endif
                    <div class="card-content certificate-content-wrapper" style="width: 100%; height: 100%; position:relative; z-index: 2;">
                        {{-- Back Title --}}
                        @if(data_get($certificateSetting, 'back_title.visible', true))
                        @php
                            $bTitleTop = (int) round((float) data_get($certificateSetting, 'back_title.top', 50) * $backScaleY);
                            $bTitleLeft = (int) round((float) data_get($certificateSetting, 'back_title.left', 50) * $backScaleX);
                            $bTitleWidth = (int) round((float) data_get($certificateSetting, 'back_title.width', 400) * $backScaleX);
                        @endphp
                        <div class="back-title certificate-element" style="
                            position:absolute;
                            top:{{ $bTitleTop }}px;
                            left:{{ $bTitleLeft }}px;
                            width:{{ $bTitleWidth }}px;
                            font-size:{{ data_get($certificateSetting, 'back_title.size', 18) }}px;
                            color:{{ data_get($certificateSetting, 'back_title.color', '#333333') }};
                            font-family:'{{ data_get($certificateSetting, 'back_title.font', 'DejaVu Sans') }}';
                            font-weight:{{ data_get($certificateSetting, 'back_title.weight', 'bold') }};
                            font-style:{{ data_get($certificateSetting, 'back_title.italic', 'normal') }};
                            text-align:{{ data_get($certificateSetting, 'back_title.align', 'center') }};
                            white-space: pre-wrap;
                            overflow-wrap: anywhere;
                            word-break: break-word;
                            line-height: 1.2;
                            padding: 0 2mm;
                            box-sizing: border-box;
                        ">{{ data_get($certificateSetting, 'back_title.text', $activity->name ?? 'Sertifikat Peserta') }}</div>
                        @endif

                        {{-- Back Subtitle --}}
                        @if(data_get($certificateSetting, 'back_subtitle.visible', true))
                        @php
                            $bSubTop = (int) round((float) data_get($certificateSetting, 'back_subtitle.top', 100) * $backScaleY);
                            $bSubLeft = (int) round((float) data_get($certificateSetting, 'back_subtitle.left', 50) * $backScaleX);
                            $bSubWidth = (int) round((float) data_get($certificateSetting, 'back_subtitle.width', 400) * $backScaleX);
                        @endphp
                        <div class="back-subtitle certificate-element" style="
                            position:absolute;
                            top:{{ $bSubTop }}px;
                            left:{{ $bSubLeft }}px;
                            width:{{ $bSubWidth }}px;
                            font-size:{{ data_get($certificateSetting, 'back_subtitle.size', 14) }}px;
                            color:{{ data_get($certificateSetting, 'back_subtitle.color', '#666666') }};
                            font-family:'{{ data_get($certificateSetting, 'back_subtitle.font', 'DejaVu Sans') }}';
                            font-weight:{{ data_get($certificateSetting, 'back_subtitle.weight', 'normal') }};
                            font-style:{{ data_get($certificateSetting, 'back_subtitle.italic', 'normal') }};
                            text-align:{{ data_get($certificateSetting, 'back_subtitle.align', 'center') }};
                            white-space: pre-wrap;
                            overflow-wrap: anywhere;
                            word-break: break-word;
                            line-height: 1.2;
                            padding: 0 2mm;
                            box-sizing: border-box;
                        ">{{ data_get($certificateSetting, 'back_subtitle.text', 'Informasi Tambahan') }}</div>
                        @endif

                        {{-- Back Content --}}
                        @if(data_get($certificateSetting, 'back_content.visible', true))
                        @php
                            $bContentTop = (int) round((float) data_get($certificateSetting, 'back_content.top', 150) * $backScaleY);
                            $bContentLeft = (int) round((float) data_get($certificateSetting, 'back_content.left', 50) * $backScaleX);
                            $bContentWidth = (int) round((float) data_get($certificateSetting, 'back_content.width', 400) * $backScaleX);
                        @endphp
                        <div class="back-content certificate-element" style="
                            position:absolute;
                            top:{{ $bContentTop }}px;
                            left:{{ $bContentLeft }}px;
                            width:{{ $bContentWidth }}px;
                            font-size:{{ data_get($certificateSetting, 'back_content.size', 12) }}px;
                            color:{{ data_get($certificateSetting, 'back_content.color', '#555555') }};
                            font-family:'{{ data_get($certificateSetting, 'back_content.font', 'DejaVu Sans') }}';
                            font-weight:{{ data_get($certificateSetting, 'back_content.weight', 'normal') }};
                            font-style:{{ data_get($certificateSetting, 'back_content.italic', 'normal') }};
                            text-align:{{ data_get($certificateSetting, 'back_content.align', 'left') }};
                            white-space: pre-wrap;
                            overflow-wrap: anywhere;
                            word-break: break-word;
                            line-height: 1.2;
                            padding: 0 2mm;
                            box-sizing: border-box;
                        ">{{ data_get($certificateSetting, 'back_content.text', 'Sertifikat ini diterbitkan sebagai bukti keikutsertaan dalam kegiatan.') }}</div>
                        @endif

                        {{-- Back Cert ID --}}
                        @if(data_get($certificateSetting, 'back_certid.visible', true))
                        @php
                            $bCertIdTop = (int) round((float) data_get($certificateSetting, 'back_certid.top', 250) * $backScaleY);
                            $bCertIdLeft = (int) round((float) data_get($certificateSetting, 'back_certid.left', 50) * $backScaleX);
                            $bCertIdWidth = (int) round((float) data_get($certificateSetting, 'back_certid.width', 400) * $backScaleX);
                        @endphp
                        <div class="back-certid certificate-element" style="
                            position:absolute;
                            top:{{ $bCertIdTop }}px;
                            left:{{ $bCertIdLeft }}px;
                            width:{{ $bCertIdWidth }}px;
                            font-size:{{ data_get($certificateSetting, 'back_certid.size', 12) }}px;
                            color:{{ data_get($certificateSetting, 'back_certid.color', '#555555') }};
                            font-family:'{{ data_get($certificateSetting, 'back_certid.font', 'DejaVu Sans') }}';
                            font-weight:{{ data_get($certificateSetting, 'back_certid.weight', 'normal') }};
                            font-style:{{ data_get($certificateSetting, 'back_certid.italic', 'normal') }};
                            text-align:{{ data_get($certificateSetting, 'back_certid.align', 'left') }};
                            white-space: pre-wrap;
                            overflow-wrap: anywhere;
                            word-break: break-word;
                            line-height: 1.2;
                            padding: 0 2mm;
                            box-sizing: border-box;
                        ">{{ $peserta->certificate_id ?? '-' }}</div>
                        @endif
                    </div>
                </div>
            @endif
            
                        </div>
                    @endforeach
                    @if(count($row) < $cols)
                        @for($i = 0; $i < $cols - count($row); $i++)
                            <div class="certificate-page-cell"></div>
                        @endfor
                    @endif
                </div>
            @endforeach
        @endforeach
    </div>

    <script>
        // DEBUG: Cek QR code position dan size
        // Auto print saat halaman dimuat (jika tidak dalam mode debug)
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>
