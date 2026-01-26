<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cetak Kartu Peserta - {{ $activity->name ?? 'Kartu Peserta' }}</title>
    <style>
        @media print {
            @page {
                @php
                    $printSettings = $printSettings ?? [];
                    $paper = $paper ?? ($printSettings['paper'] ?? 'A4');
                    $orientation = $orientation ?? ($printSettings['orientation'] ?? 'landscape');
                    $cols = max(1, (int)($cols ?? ($printSettings['cols'] ?? 2)));
                    $rows = max(1, (int)($rows ?? ($printSettings['rows'] ?? 4)));

                    $paperUpper = strtoupper($paper);
                    $isCustomIdCard = ($paperUpper === 'IDCARD');
                    
                    // Define dimensions matching the body render logic
                    $customSizes = [
                        'F4' => ['21.59cm', '33.02cm'], // 8.5 x 13 inch (Folio)
                    ];

                    if ($isCustomIdCard) {
                        $w = '53.98mm';
                        $h = '85.60mm';
                        if ($orientation === 'landscape') { $tmp = $w; $w = $h; $h = $tmp; }
                        $sizeCss = $w.' '.$h;
                    } elseif (isset($customSizes[$paperUpper])) {
                        [$w, $h] = $customSizes[$paperUpper];
                        if ($orientation === 'landscape') { 
                            $sizeCss = $h.' '.$w; 
                        } else { 
                            $sizeCss = $w.' '.$h; 
                        }
                    } else {
                        $sizeCss = ($paper.' '.$orientation);
                    }
                @endphp
                size: {{ $sizeCss }};
                margin: 0;
            }
            * { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
                color-adjust: exact !important; 
            }
            body { margin: 0; padding: 0; }
            .no-print {
                display: none !important;
            }
            .page-break {
                page-break-after: always;
            }
            .card-page-row {
                page-break-inside: avoid;
            }
            .cards-container {
                display: table;
                width: 100%;
                border-collapse: separate;
                border-spacing: 2mm;
                table-layout: fixed;
            }
            .card-page-row {
                display: table-row;
            }
            .card-page-cell {
                display: table-cell;
                vertical-align: top;
                width: {{ 100 / $cols }}%;
            }
            .sheet {
                break-after: page;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                margin: 0 auto !important;
                height: auto !important;
                padding-left: 1mm !important;
                padding-right: 4mm !important;
                padding-top: 3mm !important;
            }
            .sheet:last-of-type {
                break-after: auto;
            }
            .yellow-card-3d {
                background: #ffffff !important;
                background-image: none !important;
                box-shadow: none !important;
                border: 1px solid #000 !important;
            }
            .cards-page-cell {
                background: transparent !important;
                border: none !important;
            }
        }
        body { 
            margin: 0; 
            padding: 20px; 
            font-family: DejaVu Sans, Arial, sans-serif; 
            background: #fafafa;
        }
        .no-print {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            background: #1f2937;
            color: #fff;
            padding: 12px 24px;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            box-sizing: border-box;
            height: 70px;
        }
        body { 
            padding-top: 90px; /* Make space for fixed header */
        }
        .no-print button {
            background: #fbbf24;
            color: #000;
            border: none;
            border-radius: 6px;
            padding: 8px 16px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .no-print button:hover {
            background: #f59e0b;
        }
        .print-controls {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        .print-control-group {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        .print-control-group label {
            font-size: 0.7rem;
            color: #9ca3af;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .print-control-group select, .print-control-group input {
            background: #374151;
            border: 1px solid #4b5563;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        .print-control-group input[type="number"] {
            width: 60px;
        }
        .sheet {
            background: #fff;
            border: none;
            border-radius: 0;
            margin: 0 auto;
            box-shadow: none;
            overflow: hidden;
            padding: 8mm; 
            box-sizing: border-box;
        }
        .cards-page-grid { height: auto; display: grid; grid-template-columns: repeat({{ (int)$cols }}, 1fr); grid-template-rows: repeat({{ (int)$rows }}, auto); gap: 3mm; padding: 0; box-sizing: border-box; }
        .cards-page-cell { background: rgba(191,161,0,0.06); border: 1px dashed #bfa100; border-radius: 6px; display:flex; align-items:center; justify-content:center; }
        .page-wrapper { 
            display: flex; 
            justify-content: center; 
            align-items: center;
            padding: 0;
        }
        .yellow-card-3d { 
            position: relative; 
            overflow: visible; 
            border-radius: 20px; 
            box-shadow: 0 8px 24px 0 rgba(0,0,0,0.18), 0 1.5px 4px 0 rgba(255,215,0,0.3); 
            border: 2px solid #fff9c4; 
            perspective: 800px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s cubic-bezier(.25,.8,.25,1), box-shadow 0.2s;
        }
        .card-content { 
            position: relative; 
            width: 100%; 
            height: 100%; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: flex-start; 
            padding: 24px 16px 16px 16px; 
            box-sizing: border-box; 
            border-radius: 18px; 
        }
        .certificate-element { user-select: none; }
        .card-title { 
            width: 100%; 
            display: block; 
            white-space: pre-wrap; 
            overflow-wrap: anywhere; 
            word-break: break-word; 
            line-height: 1.2; 
            padding: 0;
            font-size: 1.1rem;
            font-weight: bold;
            color: #bfa100;
            margin-bottom: 10px;
            letter-spacing: 1px;
            text-align: left;
            font-family: 'Segoe UI', Arial, sans-serif;
            pointer-events: auto !important;
            cursor: text;
            margin-left: 0;
            text-indent: 0;
            z-index: 3;
        }
        .card-photo { 
            display: flex; 
            align-items: center; 
            justify-content: center;
            width: 90px;
            height: 110px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.10);
            margin-bottom: 12px;
            background: transparent;
            z-index: 2;
        }
        .card-photo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            pointer-events: none;
        }
        .card-qr { 
            display: flex; 
            align-items: center; 
            justify-content: center;
            margin-top: auto;
            flex-direction: column;
        }
        .card-qr img { 
            background: #fff; 
            padding: 4px; 
            border-radius: 8px; 
            box-shadow: 0 1px 4px rgba(0,0,0,0.08);
            width: 80px;
            height: 80px;
            pointer-events: none;
        }
        .photo-overlay { 
            position: absolute; 
            inset: 0; 
            width: 100%; 
            height: 100%; 
            pointer-events: none; 
            border-radius: inherit; 
            display: none; 
        }
        .circle-photo {
            border-radius: 50% !important;
            overflow: hidden;
        }
        .square-photo {
            border-radius: 12px !important;
            overflow: hidden;
        }
        .drag-item.dragging {
            opacity: 0.7;
            box-shadow: 0 0 8px #bfa100;
            pointer-events: none;
        }
        .editable-selected { 
            outline: 2px dashed #93c5fd; 
            outline-offset: 2px; 
            border-radius: 6px; 
        }
        .bg-thumb { 
            width: 38px; 
            height: 54px; 
            object-fit: cover; 
            border-radius: 6px; 
            border: 2px solid #ffe066; 
            cursor: pointer; 
        }
        .setting-panel {
            background: #fffbe7;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(191, 161, 0, 0.10), 0 1.5px 4px 0 rgba(255, 215, 0, 0.10);
            padding: 24px 24px 16px 24px;
            min-width: 270px;
            max-width: none;
            margin-top: 30px;
            font-family: 'Segoe UI', Arial, sans-serif;
            display: flex;
            flex-direction: column;
            gap: 18px;
            border: 1.5px solid #ffe066;
            transition: box-shadow 0.2s;
        }
        .modal-content.setting-panel {
            max-width: 520px;
            width: 100%;
            margin-top: 0;
        }
        .setting-panel h3 {
            font-size: 1.08rem;
            color: #bfa100;
            margin-bottom: 8px;
            font-weight: bold;
            letter-spacing: 0.5px;
            text-align: left;
        }
        .setting-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 2px;
        }
        .setting-group label {
            font-size: 0.98rem;
            color: #bfa100;
            font-weight: 500;
            margin-bottom: 2px;
        }
        .setting-row {
            display: flex;
            flex-direction: row;
            gap: 8px;
            align-items: center;
        }
        .setting-row input[type="color"] {
            border: none;
            width: 28px;
            height: 28px;
            background: none;
            cursor: pointer;
            border-radius: 6px;
            box-shadow: 0 1px 3px rgba(191, 161, 0, 0.08);
        }
        .setting-row select, .setting-row input[type="number"] {
            border-radius: 6px;
            border: 1px solid #ffe066;
            padding: 3px 7px;
            font-size: 0.97rem;
            background: #fff;
            transition: border 0.2s;
        }
        .setting-row select:focus, .setting-row input[type="number"]:focus {
            outline: none;
            border: 1.5px solid #bfa100;
        }
        .modal-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1050;
        }
        .modal-content {
            background: #fffbe7;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            min-width: 320px;
            max-width: 520px;
            width: 100%;
        }
        /* #editModeToolbar { display: none !important; } */
    </style>
</head>
<body>
    <div class="no-print">
        <div class="print-controls">
            <div style="font-weight:bold; font-size:1.1rem; margin-right:10px;">🖨️ Cetak Kartu</div>
            
            <form id="printSettingsForm" action="" method="GET" style="display:flex; gap:12px; align-items:center;">
                 @foreach(request()->except(['cols','rows','paper','orientation']) as $key => $value)
                    <input type="hidden" name="{{ $key }}" value="{{ $value }}">
                 @endforeach
                 
                 <div class="print-control-group">
                     <label>Kertas</label>
                     <select name="paper" onchange="this.form.submit()">
                         @foreach(['A4'=>'A4','A5'=>'A5','Letter'=>'Letter','Legal'=>'Legal','F4'=>'F4 (Folio)'] as $pKey => $pLabel)
                            <option value="{{ $pKey }}" {{ (request('paper') ?? $paper) == $pKey ? 'selected' : '' }}>{{ $pLabel }}</option>
                         @endforeach
                     </select>
                 </div>

                 <div class="print-control-group">
                     <label>Orientasi</label>
                     <select name="orientation" onchange="this.form.submit()">
                         <option value="portrait" {{ (request('orientation') ?? $orientation) == 'portrait' ? 'selected' : '' }}>Portrait</option>
                         <option value="landscape" {{ (request('orientation') ?? $orientation) == 'landscape' ? 'selected' : '' }}>Landscape</option>
                     </select>
                 </div>

                 <div class="print-control-group">
                     <label>Kolom</label>
                     <input type="number" name="cols" value="{{ $cols }}" min="1" max="10" onchange="this.form.submit()">
                 </div>
                 
                 <div class="print-control-group">
                     <label>Baris</label>
                     <input type="number" name="rows" value="{{ $rows }}" min="1" max="10" onchange="this.form.submit()">
                 </div>
            </form>
        </div>

        <div style="display:flex; gap:10px;">
            <button onclick="window.print()">Cetak ({{ $participants->count() }})</button>
            <button type="button" onclick="enableEditMode()" style="background:#4f46e5; color:white;">✏️ Mode Edit</button>
        </div>
    </div>

    <!-- Edit Mode Toolbar -->
    <div id="editModeToolbar" style="display:none; position:fixed; bottom:0; left:0; right:0; background:#fff; padding:15px; box-shadow:0 -2px 10px rgba(0,0,0,0.1); z-index:9999; border-top:1px solid #ddd;">
        <div style="display:flex; justify-content:space-between; align-items:center; max-width:1200px; margin:0 auto;">
            <div style="display:flex; gap:15px; align-items:center;">
                <h4 style="margin:0; font-size:16px; font-weight:bold;">Mode Edit Kartu</h4>
                <div id="selectedElementControls" style="display:none; gap:10px; align-items:center; border-left:1px solid #ccc; padding-left:15px; margin-left:15px;">
                    <span id="selectedElementName" style="font-weight:bold; color:#666;">Element</span>
                    <label>Warna: <input type="color" id="editColorPicker" onchange="updateSelectedStyle('color', this.value)"></label>
                    <label>Size: <input type="number" id="editSizeInput" style="width:50px" onchange="updateSelectedStyle('fontSize', this.value + 'px')"></label>
                    <label>Bold: <input type="checkbox" id="editBoldInput" onchange="updateSelectedStyle('fontWeight', this.checked ? 'bold' : 'normal')"></label>
                    <button onclick="deleteSelectedElement()" style="background:#dc2626; color:white; border:none; padding:4px 8px; border-radius:4px; font-size:0.8rem; cursor:pointer; display:flex; align-items:center; gap:4px;">
                        <span>🗑️ Hapus</span>
                    </button>
                </div>
            </div>
            <div style="display:flex; gap:10px;">
                <button onclick="saveCurrentEditable()" style="background:#10b981; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">Simpan Perubahan</button>
                <button onclick="disableEditMode()" style="background:#ef4444; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">Batal</button>
            </div>
        </div>
        <div id="editStatusMessage" style="text-align:center; margin-top:5px; font-size:12px;"></div>
    </div>

    @php
        $cardsPerPage = $cols * $rows;
        $widthCm = data_get($cardSetting, 'card.width_cm');
        $heightCm = data_get($cardSetting, 'card.height_cm');
        if (!$widthCm) {
            $wpx = data_get($cardSetting, 'card.width_px');
            $widthCm = $wpx ? round($wpx / 37.8, 2) : 8.6;
        }
        if (!$heightCm) {
            $hpx = data_get($cardSetting, 'card.height_px');
            $heightCm = $hpx ? round($hpx / 37.8, 2) : 15;
        }
        $bgFilename = data_get($cardSetting, 'card.background');
        $bgUrl = asset('assets/images/card/defould.png');
        if ($bgFilename) {
            if (str_starts_with($bgFilename, 'id-card-backgrounds/') || str_starts_with($bgFilename, 'backgrounds/')) {
                $bgUrl = asset('storage/' . $bgFilename);
            } elseif (str_starts_with($bgFilename, 'http')) {
                $bgUrl = $bgFilename;
            } else {
                $bgUrl = asset('assets/images/card/' . $bgFilename);
            }
        }
        $titleStyle = data_get($cardSetting, 'title', []);
        $photoStyle = data_get($cardSetting, 'photo', []);
        $qrStyle = data_get($cardSetting, 'qr', []);
        $cardWidthCm = data_get($cardSetting, 'card.width_cm', null);
        $cardWidthPx = data_get($cardSetting, 'card.width_px');
        if (!$cardWidthPx) {
            $cardWidthPx = $cardWidthCm ? round($cardWidthCm * 37.8) : round(8.6 * 37.8);
        }
        $qrSizeRatio = data_get($qrStyle, 'size_ratio');
        $qrSize = $qrSizeRatio ? round($qrSizeRatio * $cardWidthPx) : data_get($qrStyle, 'size', 80);
    @endphp

    @php
        $paperSizes = [ 
            'A4' => [21.0, 29.7], 
            'A5' => [14.8, 21.0], 
            'Letter' => [21.59, 27.94],
            'Legal' => [21.59, 35.56],
            'F4' => [21.59, 33.02]
        ];
        [$sheetW, $sheetH] = $paperSizes[$paper] ?? $paperSizes['A4'];
        if (strtolower($orientation ?? '') === 'landscape') { [$sheetW, $sheetH] = [$sheetH, $sheetW]; }
    @endphp
    @php
        $validParticipants = collect($participants ?? [])
            ->filter(function($p){ return optional($p)->user !== null; })
            ->values();
    @endphp
    @foreach($validParticipants->chunk($cardsPerPage) as $pageIndex => $page)
        <div class="sheet" style="width: {{ $sheetW }}cm;">
            <div class="cards-page-grid">
                @foreach($page as $peserta)
                    @php $userParticipant = optional($peserta)->user; @endphp
                    @if($userParticipant)
                        <div class="cards-page-cell">
                            @php
                                $profileParticipant = optional($userParticipant->profile);
                                $provinceParticipant = optional($profileParticipant->province)->name ?? ($profileParticipant->other_province ?? null);
                                $regencyParticipant = optional($profileParticipant->regency)->name ?? ($profileParticipant->other_regency ?? null);
                                $districtParticipant = optional($profileParticipant->district)->name ?? ($profileParticipant->other_district ?? null);
                                
                                // Determine Photo URL
                                $photoUrl = asset('assets/images/profilefoto/default-profile.png');
                                $photoPath = public_path('assets/images/profilefoto/default-profile.png');
                                
                                if (!empty($profileParticipant->foto) && file_exists(public_path('assets/images/profilefoto/' . $profileParticipant->foto))) {
                                    $photoUrl = asset('assets/images/profilefoto/' . $profileParticipant->foto);
                                    $photoPath = public_path('assets/images/profilefoto/' . $profileParticipant->foto);
                                } elseif (!empty($userParticipant->profile_photo_path) && \Illuminate\Support\Facades\Storage::disk('public')->exists($userParticipant->profile_photo_path)) {
                                    $photoUrl = asset('storage/' . $userParticipant->profile_photo_path);
                                    $photoPath = storage_path('app/public/' . $userParticipant->profile_photo_path);
                                } elseif (!empty($userParticipant->profile_photo_url)) {
                                    $photoUrl = $userParticipant->profile_photo_url;
                                    $photoPath = null; // Cannot check size locally
                                }

                                $imgSize = ($photoPath && file_exists($photoPath) && is_readable($photoPath)) ? @getimagesize($photoPath) : null;
                                $imgAspectRatio = ($imgSize && isset($imgSize[0]) && isset($imgSize[1]) && $imgSize[0] > 0 && $imgSize[1] > 0) ? ($imgSize[0] / $imgSize[1]) : 1.22;
                            @endphp
                            <div class="page-wrapper">
                                <div class="yellow-card-3d" style="width: {{ $widthCm }}cm; height: {{ $heightCm }}cm; background: url('{{ $bgUrl }}') center center / 100% 100% no-repeat;">
                                    <div class="card-content">
                                        {{-- Dynamic Elements Rendering --}}
                                        @php
                                            // Normalize elements structure
                                            $elements = data_get($cardSetting, 'elements', []);

                                            if (empty($elements) && is_array($cardSetting)) {
                                                // Backward compatibility for flat structure
                                                $elements = array_filter($cardSetting, function($k) {
                                                    return !in_array($k, ['width', 'height', 'bg_type', 'bg_color', 'bg_image', 'layout', 'card', 'status']);
                                                }, ARRAY_FILTER_USE_KEY);
                                            }

                                            // Auto-Deduplicate Logic
                                            // Runs on the final $elements array (whether from 'elements' key or flat structure)
                                            if (!empty($elements)) {
                                                $seen = [];
                                                $deduped = [];
                                                foreach ($elements as $k => $el) {
                                                    // Generate a signature for comparison (Data Key + Approx Position)
                                                    $dKey = data_get($el, 'data_key', is_string($k) ? $k : 'unknown');
                                                    if ($dKey === 'unknown') $dKey = 'txt_'.json_encode($el); // Fallback for pure custom text without key
                                                    
                                                    // Determine if this is a unique field that should strictly not be duplicated (e.g. name, qr, avatar)
                                                    // Unless it's a custom text element (starts with txt_) or explicitly 'custom'
                                                    $isUniqueField = !str_starts_with($dKey, 'txt_') && $dKey !== 'custom';

                                                    if ($isUniqueField) {
                                                        // Strict deduplication for fields: Ignore position!
                                                        // This fixes "Ghost Elements" where an old element and new element exist for the same field
                                                        $sig = $dKey;
                                                    } else {
                                                        // For custom text or shapes, we trust the ID ($k) to be unique.
                                                        // We do NOT want to merge custom elements even if they are in the same position.
                                                        // This ensures that if a user places two texts close to each other, both appear.
                                                        $sig = $k;
                                                    }
                                                    
                                                    if (isset($seen[$sig])) {
                                                        // It's a duplicate! Skip it.
                                                        continue;
                                                    }
                                                    $seen[$sig] = true;
                                                    $deduped[$k] = $el;
                                                }
                                                // If we actually filtered something, use the filtered list
                                                if (count($deduped) < count($elements)) {
                                                    $elements = $deduped;
                                                }
                                            }
                                        @endphp

                                        @foreach($elements as $key => $setting)
                                            @if(data_get($setting, 'visible', false))
                                                @php
                                                    // Check if this is new Design (has 'left') or Legacy (has 'x')
                                                    $isNewDesign = isset($setting['left']);
                                                    
                                                    $x = data_get($setting, 'x', 0);
                                                    $y = data_get($setting, 'y', 0);
                                                    $left = data_get($setting, 'left', 0);
                                                    $top = data_get($setting, 'top', 0);
                                                    $width = data_get($setting, 'width', null);
                                                    $height = data_get($setting, 'height', null);
                                                    
                                                    $size = data_get($setting, 'size', 12);
                                                    $color = data_get($setting, 'color', '#000000');
                                                    $align = data_get($setting, 'align', 'left');
                                                    $font = data_get($setting, 'font', 'DejaVu Sans');
                                                    $weight = data_get($setting, 'weight', 'normal');
                                                    $italic = data_get($setting, 'italic', 'normal');
                                                    
                                                    $posStyle = "";
                                                    
                                                    if ($isNewDesign) {
                                                        // New Design: uses px, left/top is top-left corner
                                                        $posStyle = "position:absolute; left:{$left}px; top:{$top}px;";
                                                        if ($width) $posStyle .= "width:{$width}px;";
                                                        if ($height) $posStyle .= "height:{$height}px;";
                                                        $posStyle .= "text-align:{$align};";
                                                        // Font size in px
                                                        $fontSizeUnit = 'px';
                                                    } else {
                                                        // Legacy: uses mm, x might be center
                                                        $posStyle = "position:absolute; left:{$x}mm; top:{$y}mm;";
                                                        if ($align === 'center') {
                                                            $posStyle .= "transform: translateX(-50%); text-align: center;";
                                                        } elseif ($align === 'right') {
                                                            $posStyle .= "transform: translateX(-100%); text-align: right;";
                                                        } else {
                                                            $posStyle .= "text-align: left;";
                                                        }
                                                        // Font size in pt
                                                        $fontSizeUnit = 'pt';
                                                    }
                                                @endphp

                                                @if($key === 'avatar' || $key === 'photo' || data_get($setting, 'data_key') === 'avatar' || data_get($setting, 'data_key') === 'photo')
                                                    @php
                                                        $shape = data_get($setting, 'shape', 'square'); // square, circle
                                                        $borderRadius = ($shape === 'circle') ? '50%' : '12px';
                                                        // If new design, size might be in width/height
                                                        $imgStyle = $posStyle;
                                                        if (!$isNewDesign) {
                                                            $imgStyle .= "width:{$size}mm; height:{$size}mm;";
                                                        }
                                                    @endphp
                                                    <div class="certificate-element" style="{{ $imgStyle }} border-radius:{{ $borderRadius }}; overflow:hidden; display:flex; justify-content:center; align-items:center;">
                                                        <img src="{{ $photoUrl }}" style="width: 100%; height: 100%; object-fit: cover;">
                                                    </div>
                                                @elseif($key === 'qr_code' || $key === 'qr' || data_get($setting, 'data_key') === 'qr_code' || data_get($setting, 'data_key') === 'qr')
                                                    @php
                                                        $qrStyle = $posStyle;
                                                        if (!$isNewDesign) {
                                                            $qrStyle .= "width:{$size}mm; height:{$size}mm;";
                                                        }
                                                    @endphp
                                                    <div class="certificate-element" style="{{ $qrStyle }} display:flex; justify-content:center; align-items:center;">
                                                        @php
                                                            $qrData = $userParticipant->id ?? 0; // Use user ID or unique code
                                                            // If ActivityUser has unique code, use it.
                                                            if (isset($peserta->uid)) $qrData = $peserta->uid;
                                                            elseif (isset($peserta->id)) $qrData = "V:{$activity->id}:{$peserta->id}";
                                                            
                                                            // For QR size, if new design use width, else use size
                                                            $qrSizePx = $isNewDesign ? ($width ?? 100) : ($size * 3.78); 
                                                            
                                                            $qrSvg = \SimpleSoftwareIO\QrCode\Facades\QrCode::size(round($qrSizePx))->generate($qrData);
                                                            $qrBase64 = base64_encode($qrSvg);
                                                        @endphp
                                                        <img src="data:image/svg+xml;base64,{{ $qrBase64 }}" alt="QR" style="width: 100%; height: 100%; object-fit: contain;">
                                                    </div>
                                                @else
                                                    {{-- Text Elements --}}
                                                    @php
                                                        $val = '-';
                                                        $fieldType = data_get($setting, 'fieldType');
                                                        $dataKey = data_get($setting, 'data_key', $key);
                                                        $staticText = data_get($setting, 'text');

                                                        if ($fieldType === 'custom' && $staticText) {
                                                            $val = $staticText;
                                                        } elseif ($fieldType === 'email') {
                                                            $val = $userParticipant->email ?? '-';
                                                        } elseif ($fieldType === 'phone') {
                                                            $val = $profileParticipant->no_hp ?? '-';
                                                        } elseif ($fieldType === 'institution') {
                                                            $val = $profileParticipant->instansi ?? '-';
                                                        } elseif ($fieldType === 'province') {
                                                            $val = $provinceParticipant ?? '-';
                                                        } elseif ($fieldType === 'regency') {
                                                            $val = $regencyParticipant ?? '-';
                                                        } elseif ($fieldType === 'district') {
                                                            $val = $districtParticipant ?? '-';
                                                        } elseif ($dataKey === 'title') {
                                                            $val = str_replace(["\r\n","\n"], ' ', ($activity->name ?? 'KARTU PESERTA'));
                                                        } elseif ($dataKey === 'name') {
                                                            $val = $userParticipant->name ?? '-';
                                                        } elseif ($dataKey === 'status') {
                                                            $isCommittee = $activity->canManageRegistration($userParticipant->id);
                                                            $val = $isCommittee ? 'PANITIA' : 'PESERTA';
                                                        } elseif ($dataKey === 'role') {
                                                             $val = $peserta->role ?? $peserta->position ?? 'Peserta';
                                                        } elseif ($dataKey === 'id_number') {
                                                             $val = $peserta->participant_number ?? $peserta->id ?? '-';
                                                        } elseif (isset($peserta->$dataKey)) {
                                                             $val = $peserta->$dataKey;
                                                        } elseif (isset($userParticipant->$dataKey)) {
                                                            $val = $userParticipant->$dataKey;
                                                        } elseif (isset($profileParticipant->$dataKey)) {
                                                            $val = $profileParticipant->$dataKey;
                                                        } elseif (isset($peserta->custom_data) && is_array($peserta->custom_data) && isset($peserta->custom_data[$dataKey])) {
                                                            $val = $peserta->custom_data[$dataKey];
                                                        } elseif (isset($profileParticipant->additional_data) && is_array($profileParticipant->additional_data) && isset($profileParticipant->additional_data[$dataKey])) {
                                                            $val = $profileParticipant->additional_data[$dataKey];
                                                        }
                                                        
                                                        // Handle object values (like relationships)
                                                        if (is_object($val)) {
                                                            $val = $val->name ?? '-';
                                                        }
                                                    @endphp
                                                    <div class="certificate-element" style="{{ $posStyle }} font-size:{{ $size }}{{ $fontSizeUnit }}; color:{{ $color }}; font-family:'{{ $font }}'; font-weight:{{ $weight }}; font-style:{{ $italic }}; white-space: normal; word-break: break-word; line-height: 1.2;">
                                                        {{ $val }}
                                                    </div>
                                                @endif
                                            @endif
                                        @endforeach
                                    </div>
                                </div>
                            </div>
                        </div>
                    @endif
                @endforeach
            </div>
        </div>
    @endforeach
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Helper function untuk update style
            function updateStyle(className, prop, value) {
                document.querySelectorAll(className).forEach(el => {
                    el.style[prop] = value;
                });
            }

            // Helper function untuk get position
            function getPosition(className) {
                const el = document.querySelector(className);
                if (!el) return {};
                const container = document.querySelector('.card-content');
                const rect = el.getBoundingClientRect();
                const cRect = container ? container.getBoundingClientRect() : { left: 0, top: 0, width: rect.width, height: rect.height };
                const leftPx = Math.round(rect.left - cRect.left);
                const topPx = Math.round(rect.top - cRect.top);
                const widthPx = Math.round(rect.width);
                const heightPx = Math.round(rect.height);
                const rightPx = Math.round(cRect.width - (leftPx + rect.width));
                const bottomPx = Math.round(cRect.height - (topPx + rect.height));
                const toRatio = (value, total) => {
                    if (!total || total === 0) return null;
                    return +(value / total).toFixed(6);
                };
                return {
                    left: leftPx,
                    top: topPx,
                    width: widthPx,
                    height: heightPx,
                    right: rightPx,
                    bottom: bottomPx,
                    left_ratio: toRatio(leftPx, cRect.width),
                    top_ratio: toRatio(topPx, cRect.height),
                    width_ratio: toRatio(widthPx, cRect.width),
                    height_ratio: toRatio(heightPx, cRect.height)
                };
            }

            // Helper function untuk set position
            function setPosition(className, pos) {
                const el = document.querySelector(className);
                if (el && pos) {
                    if (typeof pos.left !== 'undefined') {
                        el.style.left = (pos.left + 'px');
                    }
                    if (typeof pos.top !== 'undefined') el.style.top = pos.top + 'px';
                    if (typeof pos.width !== 'undefined') el.style.width = pos.width + 'px';
                    try { el.style.marginLeft = '0px'; } catch($e) {}
                    try { el.style.transform = 'none'; } catch($e) {}
                }
            }

            // Helper function untuk ensure inside card
            function ensureInsideCard(el) {
                if (!el) return;
                const container = document.querySelector('.card-content');
                if (!container) return;
                const cRect = container.getBoundingClientRect();
                const rect = el.getBoundingClientRect();
                let left = rect.left - cRect.left;
                let top = rect.top - cRect.top;
                const maxLeft = Math.max(0, Math.round(cRect.width - rect.width));
                const maxTop = Math.max(0, Math.round(cRect.height - rect.height));
                left = Math.min(maxLeft, Math.max(0, left));
                top = Math.min(maxTop, Math.max(0, top));
                el.style.left = left + 'px';
                el.style.top = top + 'px';
                el.style.transform = 'none';
            }

            // Helper function untuk get inline style text
            function getInlineStyleText(selector) {
                const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
                if (!el) return '';
                return (el.getAttribute('style') || '').trim();
            }

            // Helper function untuk set value if exists
            function setValueIfExists(input, value) {
                if (input && typeof value !== 'undefined') input.value = value;
            }

            // Fungsi untuk update photo size
            function updatePhotoSize(val) {
                const cardPhoto = document.querySelector('.card-photo');
                if (!cardPhoto) return;
                const v = parseFloat(val);
                const img = cardPhoto.querySelector('img');
                if (img) {
                    const currentStyle = img.getAttribute('style') || '';
                    const sizeMatch = currentStyle.match(/width:\s*(\d+)px/);
                    const currentSize = sizeMatch ? parseFloat(sizeMatch[1]) : v;
                    const aspectRatio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1.22;
                    const height = v / aspectRatio;
                    img.style.width = v + 'px';
                    img.style.height = height + 'px';
                }
            }

            // Fungsi untuk update photo shape
            function updatePhotoShape(val) {
                const cardPhoto = document.querySelector('.card-photo');
                if (!cardPhoto) return;
                if (val === 'circle') {
                    cardPhoto.classList.add('circle-photo');
                    cardPhoto.classList.remove('square-photo');
                } else {
                    cardPhoto.classList.add('square-photo');
                    cardPhoto.classList.remove('circle-photo');
                }
            }

            // Fungsi untuk update QR size
            function updateQrSize(val) {
                const cardQr = document.querySelector('.card-qr img');
                if (cardQr) {
                    cardQr.style.width = val + 'px';
                    cardQr.style.height = val + 'px';
                }
            }

            // Fungsi untuk update card size
            function updateCardSizeCm() {
                const yellowCard = document.querySelector('.yellow-card-3d');
                if (!yellowCard) return;
                // Ukuran sudah diatur via inline style dari PHP, tidak perlu diubah
            }

            // Auto print saat halaman dimuat (jika diperlukan)
            // window.addEventListener('load', function() {
            //     window.print();
            // });

            // --- EDIT MODE LOGIC ---
            let isEditMode = false;
            let selectedElementClass = null;
            let currentDrag = null;

            window.enableEditMode = function() {
                isEditMode = true;
                document.getElementById('editModeToolbar').style.display = 'block';
                document.querySelectorAll('.certificate-element').forEach(el => {
                    el.style.cursor = 'move';
                    el.style.border = '1px dashed #ccc';
                    el.onmousedown = dragStart;
                    el.onclick = function(e) {
                        e.stopPropagation();
                        selectElement(el);
                    };
                });
                document.querySelectorAll('a').forEach(a => a.style.pointerEvents = 'none');
            };

            window.disableEditMode = function() {
                isEditMode = false;
                document.getElementById('editModeToolbar').style.display = 'none';
                document.getElementById('selectedElementControls').style.display = 'none';
                document.querySelectorAll('.certificate-element').forEach(el => {
                    el.style.cursor = '';
                    el.style.border = '';
                    el.onmousedown = null;
                    el.onclick = null;
                    el.classList.remove('editable-selected');
                });
                location.reload(); 
            };

            window.updateSelectedStyle = function(prop, value) {
                if (!selectedElementClass) return;
                const cssProp = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
                document.querySelectorAll('.' + selectedElementClass).forEach(el => {
                    el.style[cssProp] = value;
                });
            };

            window.deleteSelectedElement = function() {
                if (!selectedElementClass) return;
                if (!confirm('Hapus elemen ini?')) return;
                
                document.querySelectorAll('.' + selectedElementClass).forEach(el => {
                    el.style.display = 'none';
                    el.classList.add('marked-for-deletion');
                });
                
                // Reset Selection
                selectedElementClass = null;
                document.getElementById('selectedElementControls').style.display = 'none';
            };

            window.saveCurrentEditable = async function() {
            const btn = document.querySelector('#editModeToolbar button[onclick="saveCurrentEditable()"]');
            const originalText = btn.innerText;
            btn.innerText = 'Menyimpan...';
            btn.disabled = true;

            const settings = {};
            
            @php
               $jsElements = [];
               $standardMap = [
                   'title' => 'card-title',
                   'status' => 'card-status',
                   'name' => 'card-name',
                   'photo' => 'card-photo',
                   'email' => 'card-email',
                   'no_hp' => 'card-phone',
                   'jenis_kelamin' => 'card-gender',
                   'pekerjaan' => 'card-job',
                   'instansi' => 'card-instansi',
                   'jabatan' => 'card-role',
                   'alamat' => 'card-address',
                   'province' => 'card-province',
                   'regency' => 'card-regency',
                   'district' => 'card-district',
                   'qr' => 'card-qr',
                   'qr_code' => 'card-qr',
               ];
               
               // Ensure all standard keys are included if possible, or just iterate settings
               // Better to iterate known keys + settings keys
               $allKeys = array_keys($standardMap);
               if(isset($cardSetting) && is_array($cardSetting)) {
                   $allKeys = array_unique(array_merge($allKeys, array_keys($cardSetting)));
               }

               foreach ($allKeys as $key) {
                   if (isset($standardMap[$key])) {
                       $cls = $standardMap[$key];
                       $jsElements[] = ['class' => $cls, 'key' => $key];
                   } else {
                       // Custom elements
                       $jsElements[] = ['class' => 'card-custom-'.$key, 'key' => $key];
                   }
               }
               // Unique by key
               $jsElements = array_map("unserialize", array_unique(array_map("serialize", $jsElements)));
               $jsElements = array_values($jsElements);
            @endphp
            
            const elements = {!! json_encode($jsElements) !!};

                elements.forEach(item => {
                    const el = document.querySelector('.' + item.class);
                    if (el) {
                        // Skip if marked for deletion or hidden
                        if (el.classList.contains('marked-for-deletion') || el.style.display === 'none') {
                            return;
                        }
                        
                        const style = window.getComputedStyle(el);
                        const pos = getPosition('.' + item.class);
                        
                        settings[item.key] = {
                            visible: true,
                            top: pos.top,
                            left: pos.left,
                            width: pos.width,
                            size: parseInt(style.fontSize) || 16,
                            color: rgbToHex(style.color),
                            font: style.fontFamily.replace(/['"]/g, ''),
                            weight: style.fontWeight,
                            italic: style.fontStyle,
                            align: style.textAlign,
                            style_inline: el.getAttribute('style')
                        };
                        
                        if (item.key === 'photo') {
                             settings[item.key].size = pos.width;
                             settings[item.key].shape = el.classList.contains('circle-photo') ? 'circle' : 'square';
                        }
                    }
                });

                try {
                    const response = await fetch("{{ route('settings.card-settings.save') }}", {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                        },
                        body: JSON.stringify({
                            activity_id: "{{ $activity->id }}",
                            card_setting: JSON.stringify(settings),
                            type: 'participant'
                        })
                    });
                    
                    const result = await response.json();
                    if (result.success) {
                        alert('Berhasil disimpan!');
                        location.reload();
                    } else {
                        alert('Gagal: ' + result.message);
                    }
                } catch (e) {
                    alert('Error: ' + e.message);
                } finally {
                    btn.innerText = originalText;
                    btn.disabled = false;
                }
            };

            function selectElement(el) {
                const classList = Array.from(el.classList);
                selectedElementClass = classList.find(c => c.startsWith('card-'));
                
                if (selectedElementClass) {
                    document.getElementById('selectedElementControls').style.display = 'flex';
                    document.getElementById('selectedElementName').innerText = selectedElementClass;
                    
                    const style = window.getComputedStyle(el);
                    document.getElementById('editColorPicker').value = rgbToHex(style.color);
                    document.getElementById('editSizeInput').value = parseInt(style.fontSize);
                    document.getElementById('editBoldInput').checked = style.fontWeight === 'bold' || parseInt(style.fontWeight) >= 700;
                    
                    document.querySelectorAll('.editable-selected').forEach(e => e.classList.remove('editable-selected'));
                    document.querySelectorAll('.' + selectedElementClass).forEach(e => e.classList.add('editable-selected'));
                }
            }

            function dragStart(e) {
                if (!isEditMode) return;
                e.preventDefault();
                currentDrag = e.target;
                
                const classList = Array.from(currentDrag.classList);
                const className = classList.find(c => c.startsWith('card-'));
                if (!className) return;
                selectedElementClass = className;
                selectElement(currentDrag);

                const startX = e.clientX;
                const startY = e.clientY;
                const startLeft = currentDrag.offsetLeft;
                const startTop = currentDrag.offsetTop;

                document.onmousemove = function(e) {
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;
                    
                    document.querySelectorAll('.' + className).forEach(el => {
                        el.style.left = (startLeft + dx) + 'px';
                        el.style.top = (startTop + dy) + 'px';
                        el.style.transform = 'none';
                    });
                };

                document.onmouseup = function() {
                    document.onmousemove = null;
                    document.onmouseup = null;
                    currentDrag = null;
                };
            }

            function rgbToHex(rgb) {
                if (!rgb || rgb === 'transparent') return '#000000';
                if (rgb.startsWith('#')) return rgb;
                const sep = rgb.indexOf(',') > -1 ? ',' : ' ';
                const rgbVals = rgb.substr(4).split(')')[0].split(sep);
                
                let r = (+rgbVals[0]).toString(16),
                    g = (+rgbVals[1]).toString(16),
                    b = (+rgbVals[2]).toString(16);
                
                if (r.length == 1) r = "0" + r;
                if (g.length == 1) g = "0" + g;
                if (b.length == 1) b = "0" + b;
                
                return "#" + r + g + b;
            }
        });
    </script>
</body>
</html>
