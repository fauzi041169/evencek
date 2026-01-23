# PDF Templates Directory

Direktori ini berisi template Blade untuk generate PDF (certificates & ID cards).

## 📁 Struktur Folder

```
pdf/
├── certificates/          # Template sertifikat
│   ├── preview.blade.php  # PDF preview untuk dompdf
│   ├── print.blade.php    # HTML print (browser print)
│   └── partials/          # Component reusable
│       ├── header.blade.php
│       ├── footer.blade.php
│       └── styles.blade.php
│
├── cards/                 # Template kartu peserta/ID card
│   ├── preview.blade.php  # PDF preview untuk dompdf
│   ├── print.blade.php    # HTML print (browser print)
│   └── partials/          # Component reusable
│       ├── header.blade.php
│       └── styles.blade.php
│
├── layouts/              # Layout dasar
│   └── base.blade.php    # Base layout untuk semua PDF
│
└── README.md            # Dokumentasi ini
```

## 🎯 Cara Penggunaan

### Certificates

**PDF Generation (via dompdf):**
```php
use Barryvdh\DomPDF\Facade\Pdf;

$pdf = Pdf::loadView('pdf.certificates.preview', [
    'participants' => $participants,
    'activity' => $activity,
    'certificateSetting' => $settings
]);

return $pdf->download('certificates.pdf');
```

**Browser Print (HTML):**
```php
return view('pdf.certificates.print', compact(
    'participants', 
    'activity', 
    'certificateSetting'
));
```

### Cards/ID Cards

**PDF Generation:**
```php
$pdf = Pdf::loadView('pdf.cards.preview', [
    'participants' => $participants,
    'activity' => $activity,
    'cardSetting' => $settings
]);

return $pdf->download('id-cards.pdf');
```

**Browser Print:**
```php
return view('pdf.cards.print', compact(
    'participants',
    'activity',
    'cardSetting'
));
```

## 🔄 Migration dari Struktur Lama

**Struktur Lama:**
- `activity.printing.certificates_preview_pdf` → `pdf.certificates.preview`
- `activity.printing.print_certificates_html` → `pdf.certificates.print`
- `activity.printing.print_cards_html` → `pdf.cards.print`
- `activity.printing.printcertificate` → **DEPRECATED** (pakai `preview`)
- `activity.printing.printkartupengenal` → **DEPRECATED** (pakai `print`)
- `activity.printing.idcard` → **DEPRECATED** (pakai `cards.preview`)

## 📝 Naming Convention

- `preview.blade.php` = Untuk PDF generation (dompdf/wkhtmltopdf)
- `print.blade.php` = Untuk browser print (window.print())
- `partials/` = Component yang bisa di-reuse

## 🎨 Best Practices

1. **Gunakan Partials untuk Code Reuse**
   ```blade
   @include('pdf.certificates.partials.header')
   ```

2. **Pisahkan Styles**
   - Print styles di `partials/styles.blade.php`
   - Gunakan `@page` rules untuk PDF

3. **Optimize Images**
   - Convert ke base64 untuk PDF reliability
   - Compress sebelum embed

4. **Testing**
   - Test di browser (print.blade.php)
   - Test PDF generation (preview.blade.php)
   - Test bulk generation (performance)

## 🚀 Features

- ✅ QR Code generation
- ✅ Custom fonts support
- ✅ Multi-page printing
- ✅ Responsive design (browser print)
- ✅ Background images
- ✅ Dynamic data binding
- ✅ Batch generation

## 📞 Support

Untuk pertanyaan atau issue, silakan hubungi tim development.

---

**Last Updated:** 2026-01-21
**Version:** 2.0
