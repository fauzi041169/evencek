@php
  $uCard = auth()->user();
  $pCard = optional($uCard->profile);
  
  if (isset($cardSetting) && is_array($cardSetting) && !empty($cardSetting)) {
      $card = $cardSetting;
  } else {
      // Fallback logic with batch awareness
      $targetBatchId = request()->input('batch_id');
      
      // Force null for non-batch activities
      if (isset($activity) && $activity->activity_type !== 'batch') {
          $targetBatchId = null;
      }

      if (!$targetBatchId && auth()->check() && isset($activity) && $activity->activity_type === 'batch') {
           $enr = \App\Models\ActivityUser::where('activity_id', $activity->id)->where('user_id', auth()->id())->first();
           if ($enr) $targetBatchId = $enr->activity_batch_id;
      }
      
      $settings = null;
      if ($targetBatchId) {
          $settings = \App\Models\CardSettings::where('activity_id', $activity->id)->where('activity_batch_id', $targetBatchId)->first();
          if ($settings) {
             $cs = $settings->card_setting;
             if (is_string($cs)) $cs = json_decode($cs, true);
             if (empty($cs) || !is_array($cs) || empty($cs['card'])) $settings = null;
          }
      }
      
      if (!$settings) {
           $firstBatch = \App\Models\ActivityBatch::where('activity_id', $activity->id)->orderBy('created_at', 'asc')->first();
           if ($firstBatch && $targetBatchId && $firstBatch->id != $targetBatchId) {
               $settings = \App\Models\CardSettings::where('activity_id', $activity->id)->where('activity_batch_id', $firstBatch->id)->first();
               if ($settings) {
                   $cs = $settings->card_setting;
                   if (is_string($cs)) $cs = json_decode($cs, true);
                   if (empty($cs) || !is_array($cs) || empty($cs['card'])) $settings = null;
               }
           }
      }
      
      if (!$settings) {
          $settings = \App\Models\CardSettings::where('activity_id', $activity->id)->whereNull('activity_batch_id')->first();
      }
      
      if (!$settings) {
          $settings = \App\Models\CardSettings::where('activity_id', $activity->id)->first();
      }

      $card = optional($settings)->card_setting ?? [];
  }
  
  $cardConf = $card['card'] ?? [];
  $cardWidthPx = $cardConf['width_px'] ?? (isset($cardConf['width_cm']) ? round($cardConf['width_cm'] * 37.8) : round(5.27 * 37.8));
  $cardHeightPx = $cardConf['height_px'] ?? (isset($cardConf['height_cm']) ? round($cardConf['height_cm'] * 37.8) : round(8.6 * 37.8));
  $bgFile = $cardConf['background'] ?? null;
  if (!$bgFile) {
    $bgDir = public_path('assets/images/card');
    $bgFiles = glob($bgDir . '/*.{png,jpg,jpeg,gif,webp}', GLOB_BRACE);
    $bgFile = count($bgFiles) ? basename($bgFiles[0]) : null;
  }
  function styleFrom($arr){
    if (!is_array($arr)) return '';
    $s = [];
    foreach ([["left","px"],["top","px"],["width","px"],["height","px"]] as $k){
      if (isset($arr[$k[0]]) && is_numeric($arr[$k[0]])) $s[] = $k[0].':'.$arr[$k[0]].$k[1];
    }
    return implode(';', $s);
  }
  function stylePos($arr, $cardWidthPx, $cardHeightPx){
    if (!is_array($arr)) return '';
    $cW = max(0, $cardWidthPx);
    $cH = max(0, $cardHeightPx);
    $left = null; $top = null; $width = null; $height = null;
    if (isset($arr['left']) && is_numeric($arr['left'])) { $left = (int)$arr['left']; }
    elseif (isset($arr['left_ratio']) && is_numeric($arr['left_ratio'])) { $left = (int)round($arr['left_ratio'] * $cW); }
    if (isset($arr['top']) && is_numeric($arr['top'])) { $top = (int)$arr['top']; }
    elseif (isset($arr['top_ratio']) && is_numeric($arr['top_ratio'])) { $top = (int)round($arr['top_ratio'] * $cH); }
    if (isset($arr['width']) && is_numeric($arr['width'])) { $width = (int)$arr['width']; }
    elseif (isset($arr['width_ratio']) && is_numeric($arr['width_ratio'])) { $width = (int)round($arr['width_ratio'] * $cW); }
    if (isset($arr['height']) && is_numeric($arr['height'])) { $height = (int)$arr['height']; }
    elseif (isset($arr['height_ratio']) && is_numeric($arr['height_ratio'])) { $height = (int)round($arr['height_ratio'] * $cH); }
    $s = [];
    if ($left !== null) $s[] = 'left:'.$left.'px';
    if ($top !== null) $s[] = 'top:'.$top.'px';
    if ($width !== null) $s[] = 'width:'.$width.'px';
    if ($height !== null) $s[] = 'height:'.$height.'px';
    if (isset($arr['style_inline']) && is_string($arr['style_inline'])) $s[] = trim($arr['style_inline']);
    return implode(';', $s);
  }
  function textCssFrom($arr){
    if (!is_array($arr)) return '';
    $s = [];
    if (!empty($arr['color'])) $s[] = 'color:'.$arr['color'];
    if (!empty($arr['font'])) $s[] = 'font-family:'.$arr['font'];
    if (!empty($arr['size'])) $s[] = 'font-size:'.((int)$arr['size']).'px';
    if (!empty($arr['align'])) $s[] = 'text-align:'.$arr['align'];
    if (!empty($arr['weight'])) $s[] = 'font-weight:'.$arr['weight'];
    if (!empty($arr['italic'])) $s[] = 'font-style:'.$arr['italic'];
    if (!empty($arr['width'])) $s[] = 'width:'.((int)$arr['width']).'px';
    return implode(';', $s);
  }
  function visibilityFrom($arr){
    if (!is_array($arr)) return '';
    if (array_key_exists('visible', $arr) && !$arr['visible']) return 'display:none';
    return '';
  }
  function rgbaOverlay($hex, $opacity){
    if (!$hex || $opacity === null) return 'transparent';
    $hex = ltrim($hex,'#');
    if (strlen($hex)===3) $hex = $hex[0].$hex[0].$hex[1].$hex[1].$hex[2].$hex[2];
    $r = hexdec(substr($hex,0,2));
    $g = hexdec(substr($hex,2,2));
    $b = hexdec(substr($hex,4,2));
    $a = max(0,min(1, (int)$opacity/100 ));
    return "rgba($r,$g,$b,$a)";
  }
@endphp
@if(empty($render_partial))
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ID Card</title>
@endif
@if(empty($render_partial))
  <style>
    body{margin:0;padding:20px;background:#fafafa;font-family:'Segoe UI',Arial,sans-serif}
  </style>
@endif
  <style>
    .yellow-card-3d{position:relative;overflow:visible;border-radius:20px;box-shadow:0 8px 24px rgba(0,0,0,.18),0 1.5px 4px rgba(255,215,0,.3);border:2px solid #fff9c4;perspective:800px;display:flex;align-items:center;justify-content:center;background-size:100% 100%;background-position:center;background-repeat:no-repeat}
    .card-content{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:24px 16px 16px 16px;box-sizing:border-box;border-radius:18px}
    .card-title{width:100%;display:block;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;line-height:1.2;font-size:1.1rem;font-weight:bold;color:#bfa100;margin-bottom:10px;letter-spacing:1px;text-align:left;font-family:'Segoe UI',Arial,sans-serif;pointer-events:auto;cursor:text;margin-left:0;text-indent:0;position:absolute}
    .card-photo{display:flex;align-items:center;justify-content:center;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.10);background:transparent;position:absolute}
    .card-photo img{width:100%;height:100%;object-fit:cover;pointer-events:none}
    .photo-overlay{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;border-radius:inherit}
    .circle-photo{border-radius:50%}
    .square-photo{border-radius:12px}
    .card-qr{display:flex;align-items:center;justify-content:center;flex-direction:column;position:absolute}
    .card-qr img{background:#fff;padding:4px;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,.08);pointer-events:none}
  </style>
@if(empty($render_partial))
</head>
<body>
@endif
  <div class="yellow-card-3d" style="width:{{ $cardWidthPx }}px;height:{{ $cardHeightPx }}px;{{ $bgFile ? "background-image:url('/assets/images/card/{$bgFile}')" : '' }};{{ is_array($cardConf) && !empty($cardConf['style_inline']) ? $cardConf['style_inline'] : '' }}">
    <div class="card-content" style="{{ is_array($cardConf) && !empty($cardConf['content_style_inline']) ? $cardConf['content_style_inline'] : '' }}">
      @php 
        $title = $card['title'] ?? []; 
        $displayTitle = $activity->name ?? 'KARTU PESERTA';
      @endphp
      <div class="card-title drag-item" style="{{ stylePos($title, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($title) }};{{ visibilityFrom($title) }}">{{ $displayTitle }}</div>
      @php $photo = $card['photo'] ?? []; $shape = $photo['shape'] ?? 'square'; $photoClass = $shape==='circle' ? 'circle-photo' : 'square-photo'; $overlayColor = rgbaOverlay($photo['overlay_color'] ?? null, $photo['overlay_opacity'] ?? 0); @endphp
      <div class="card-photo drag-item {{ $photoClass }}" style="{{ stylePos($photo, $cardWidthPx, $cardHeightPx) }};{{ visibilityFrom($photo) }}">
        @if($pCard && $pCard->foto)
          <img src="{{ asset('assets/images/profilefoto/' . $pCard->foto) }}" alt="{{ $uCard->name }}">
        @else
          <img src="{{ asset('assets/images/profilefoto/default-profile.png') }}" alt="Default photo">
        @endif
        <div class="photo-overlay" style="background-color:{{ $overlayColor }}"></div>
      </div>
      @php $qr = $card['qr'] ?? []; $qrSize = isset($qr['size']) ? (int)$qr['size'] : 80; $qrData = $uCard->id ?? 0; $qrSvg = \SimpleSoftwareIO\QrCode\Facades\QrCode::size($qrSize)->generate($qrData); $qrBase64 = base64_encode($qrSvg); @endphp
      <div class="card-qr drag-item" style="{{ stylePos($qr, $cardWidthPx, $cardHeightPx) }};{{ visibilityFrom($qr) }}">
        <img src="data:image/svg+xml;base64,{{ $qrBase64 }}" alt="QR Code" style="width:{{ $qrSize }}px;height:{{ $qrSize }}px">
      </div>
      @php $nameS = $card['name'] ?? null; @endphp
      @if(is_array($nameS))
        <div class="card-name drag-item" style="{{ stylePos($nameS, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($nameS) }};{{ visibilityFrom($nameS) }}">{{ $uCard->name ?? '' }}</div>
      @endif
      @php $emailS = $card['email'] ?? null; @endphp
      @if(is_array($emailS))
        <div class="card-email drag-item" style="{{ stylePos($emailS, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($emailS) }};{{ visibilityFrom($emailS) }}">{{ $uCard->email ?? '' }}</div>
      @endif
      @php $phoneS = $card['no_hp'] ?? null; @endphp
      @if(is_array($phoneS))
        <div class="card-phone drag-item" style="{{ stylePos($phoneS, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($phoneS) }};{{ visibilityFrom($phoneS) }}">{{ $pCard->no_hp ?? '' }}</div>
      @endif
      @php $genderS = $card['jenis_kelamin'] ?? null; @endphp
      @if(is_array($genderS))
        <div class="card-gender drag-item" style="{{ stylePos($genderS, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($genderS) }};{{ visibilityFrom($genderS) }}">{{ $pCard->jenis_kelamin ?? '' }}</div>
      @endif
      @php $jobS = $card['pekerjaan'] ?? null; @endphp
      @if(is_array($jobS))
        <div class="card-job drag-item" style="{{ stylePos($jobS, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($jobS) }};{{ visibilityFrom($jobS) }}">{{ $pCard->pekerjaan ?? '' }}</div>
      @endif
      @php $instansiS = $card['instansi'] ?? null; @endphp
      @if(is_array($instansiS))
        <div class="card-instansi drag-item" style="{{ stylePos($instansiS, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($instansiS) }};{{ visibilityFrom($instansiS) }}">{{ $pCard->instansi ?? '' }}</div>
      @endif
      @php $roleS = $card['jabatan'] ?? null; @endphp
      @if(is_array($roleS))
        <div class="card-role drag-item" style="{{ stylePos($roleS, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($roleS) }};{{ visibilityFrom($roleS) }}">{{ $pCard->jabatan ?? '' }}</div>
      @endif
      @php $addrS = $card['alamat'] ?? null; @endphp
      @if(is_array($addrS))
        <div class="card-address drag-item" style="{{ stylePos($addrS, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($addrS) }};{{ visibilityFrom($addrS) }}">{{ $pCard->alamat ?? '' }}</div>
      @endif
      @php $provS = $card['province'] ?? null; @endphp
      @if(is_array($provS))
        <div class="card-province drag-item" style="{{ stylePos($provS, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($provS) }};{{ visibilityFrom($provS) }}">{{ optional($pCard->province)->name ?? $pCard->other_province ?? $pCard->provinsi ?? '' }}</div>
      @endif
      @php $regencyS = $card['regency'] ?? null; @endphp
      @if(is_array($regencyS))
        <div class="card-regency drag-item" style="{{ stylePos($regencyS, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($regencyS) }};{{ visibilityFrom($regencyS) }}">{{ optional($pCard->regency)->name ?? $pCard->other_regency ?? '' }}</div>
      @endif
      @php $districtS = $card['district'] ?? null; @endphp
      @if(is_array($districtS))
        <div class="card-district drag-item" style="{{ stylePos($districtS, $cardWidthPx, $cardHeightPx) }};{{ textCssFrom($districtS) }};{{ visibilityFrom($districtS) }}">{{ optional($pCard->district)->name ?? $pCard->other_district ?? '' }}</div>
      @endif
    </div>
  </div>
@if(empty($render_partial))
</body>
</html>
@endif
