<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Preview Kartu Peserta - PDF</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            background: #ffffff;
        }
        
        .cards-container {
            width: 100%;
            display: block;
        }
        
        .card-row {
            width: 100%;
            display: block;
            page-break-inside: avoid;
        }
        
        .yellow-card-3d {
            position: relative;
            overflow: hidden;
            border-radius: 20px;
            border: 2px solid #fff9c4;
            background-size: 100% 100%;
            background-position: center;
            background-repeat: no-repeat;
            margin: 10px auto;
        }
        
        .card-content {
            position: relative;
            width: 100%;
            height: 100%;
            padding: 24px 16px;
        }
        
        .card-element {
            position: absolute;
            white-space: pre-wrap;
            overflow-wrap: anywhere;
            word-break: break-word;
            line-height: 1.2;
        }
        
        .card-photo {
            position: absolute;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .card-photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .circle-photo {
            border-radius: 50%;
        }
        
        .square-photo {
            border-radius: 12px;
        }
        
        .card-qr {
            position: absolute;
        }
        
        .card-qr img {
            background: #fff;
            padding: 4px;
            border-radius: 8px;
        }
        
        @page {
            margin: 0.5cm;
        }
    </style>
</head>
<body>
    <div class="cards-container">
        @foreach($participants as $participant)
            @php
                $userParticipant = optional($participant)->user;
                if (!$userParticipant) continue;
                
                $profileParticipant = optional($userParticipant->profile);
                
                // Card dimensions
                $widthCm = data_get($cardSetting, 'card.width_cm', 8.6);
                $heightCm = data_get($cardSetting, 'card.height_cm', 5.4);
                
                // Background
                $bgFilename = data_get($cardSetting, 'card.background');
                $bgUrl = $bgFilename ? asset('assets/images/card/' . $bgFilename) : '';
                
                // Styles
                $titleStyle = data_get($cardSetting, 'title', []);
                $photoStyle = data_get($cardSetting, 'photo', []);
                $qrStyle = data_get($cardSetting, 'qr', []);
                $nameStyle = data_get($cardSetting, 'name', []);
                
                // Photo
                $photoFilename = optional($profileParticipant)->foto;
                $photoUrl = $photoFilename ? asset('assets/images/profilefoto/' . $photoFilename) : asset('assets/images/profilefoto/default-profile.png');
                $photoShape = data_get($photoStyle, 'shape', 'square');
                
                // QR Code
                $qrSize = data_get($qrStyle, 'size', 80);
                $qrData = $userParticipant->id ?? 0;
                $qrSvg = \SimpleSoftwareIO\QrCode\Facades\QrCode::size($qrSize)->generate($qrData);
                $qrBase64 = base64_encode($qrSvg);
            @endphp
            
            <div class="card-row">
                <div class="yellow-card-3d" style="width: {{ $widthCm }}cm; height: {{ $heightCm }}cm; background-image: url('{{ $bgUrl }}');">
                    <div class="card-content">
                        {{-- Title --}}
                        @if(data_get($titleStyle, 'visible', true))
                        <div class="card-element card-title" style="
                            top: {{ data_get($titleStyle, 'top', 20) }}px;
                            left: {{ data_get($titleStyle, 'left', 0) }}px;
                            width: 100%;
                            font-size: {{ data_get($titleStyle, 'size', 18) }}px;
                            color: {{ data_get($titleStyle, 'color', '#bfa100') }};
                            font-family: '{{ data_get($titleStyle, 'font', 'DejaVu Sans') }}';
                            font-weight: {{ data_get($titleStyle, 'weight', 'bold') }};
                            text-align: {{ data_get($titleStyle, 'align', 'center') }};
                        ">{{ $activity->name ?? 'KARTU PESERTA' }}</div>
                        @endif
                        
                        {{-- Photo --}}
                        @if(data_get($photoStyle, 'visible', true))
                        <div class="card-photo {{ $photoShape == 'circle' ? 'circle-photo' : 'square-photo' }}" style="
                            top: {{ data_get($photoStyle, 'top', 70) }}px;
                            left: {{ data_get($photoStyle, 'left', 85) }}px;
                            width: {{ data_get($photoStyle, 'size', 90) }}px;
                            height: {{ data_get($photoStyle, 'size', 90) }}px;
                        ">
                            <img src="{{ $photoUrl }}" alt="{{ $userParticipant->name }}">
                        </div>
                        @endif
                        
                        {{-- Name --}}
                        @if(data_get($nameStyle, 'visible', true))
                        <div class="card-element card-name" style="
                            top: {{ data_get($nameStyle, 'top', 190) }}px;
                            left: {{ data_get($nameStyle, 'left', 30) }}px;
                            width: {{ data_get($nameStyle, 'width', 180) }}px;
                            font-size: {{ data_get($nameStyle, 'size', 16) }}px;
                            color: {{ data_get($nameStyle, 'color', '#333333') }};
                            font-family: '{{ data_get($nameStyle, 'font', 'DejaVu Sans') }}';
                            font-weight: {{ data_get($nameStyle, 'weight', 'normal') }};
                            text-align: {{ data_get($nameStyle, 'align', 'center') }};
                        ">{{ $userParticipant->name ?? '-' }}</div>
                        @endif
                        
                        {{-- QR Code --}}
                        @if(data_get($qrStyle, 'visible', true))
                        <div class="card-qr" style="
                            top: {{ data_get($qrStyle, 'top', 320) }}px;
                            left: {{ data_get($qrStyle, 'left', 90) }}px;
                        ">
                            <img src="data:image/svg+xml;base64,{{ $qrBase64 }}" alt="QR Code" style="width: {{ $qrSize }}px; height: {{ $qrSize }}px;">
                        </div>
                        @endif
                    </div>
                </div>
            </div>
        @endforeach
    </div>
</body>
</html>
