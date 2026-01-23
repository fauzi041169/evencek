# ⚡ Quick Reference - EventCek Development

**Architecture:** React + Blade (Hybrid Optimal)

---

## 🎯 When to Use What?

### Use REACT for:
- ✅ User interfaces
- ✅ Forms & data entry  
- ✅ Dashboard & statistics
- ✅ Real-time interactions
- ✅ CRUD operations
- ✅ Navigation & menus

**Location:** `resources/js/Pages/`

### Use BLADE for:
- ✅ PDF generation ONLY
- ✅ Email templates
- ✅ Error pages

**Location:** `resources/views/pdf/`

---

## 📂 Folder Quick Access

| Task | Location |
|------|----------|
| Add new Activity page | `resources/js/Pages/Activity/` |
| Edit layouts | `resources/js/Layouts/` |
| Modify PDF certificate | `resources/views/pdf/certificates/` |
| Modify PDF cards | `resources/views/pdf/cards/` |
| Inertia root | `resources/views/app.blade.php` |

---

## 💻 Common Commands

```bash
# Development
npm run dev              # Start Vite dev server
php artisan serve        # Start Laravel server

# Build for production
npm run build            # Compile React assets

# Clear caches
php artisan view:clear   # Clear Blade cache
php artisan config:clear # Clear config cache
php artisan route:clear  # Clear route cache

# Database
php artisan migrate      # Run migrations
php artisan db:seed      # Seed database
```

---

## 🧩 Code Snippets

### Create New React Page
```jsx
// resources/js/Pages/Activity/NewPage.jsx
import { Head } from '@inertiajs/react';
import WebLayout from '@/Layouts/WebLayout';

export default function NewPage({ data }) {
    return (
        <WebLayout>
            <Head title="Page Title" />
            <div>Your content here</div>
        </WebLayout>
    );
}
```

### Controller → React
```php
// app/Http/Controllers/ActivityController.php
use Inertia\Inertia;

public function myMethod() {
    return Inertia::render('Activity/NewPage', [
        'data' => $data
    ]);
}
```

### Generate PDF
```php
use Barryvdh\DomPDF\Facade\Pdf;

$pdf = Pdf::loadView('pdf.certificates.preview', [
    'participants' => $participants,
    'activity' => $activity
]);

return $pdf->download('file.pdf');
```

---

## 🗺️ Directory Map

```
resources/
├── views/
│   ├── app.blade.php          ← Inertia root
│   ├── pdf/
│   │   ├── certificates/      ← Sertifikat
│   │   └── cards/             ← Kartu peserta
│   └── emails/                ← Email templates
│
└── js/
    ├── Pages/
    │   └── Activity/          ← Activity React pages
    ├── Layouts/               ← React layouts
    └── Components/            ← Shared components
```

---

## 🔍 Find Files Quickly

```bash
# Find React components
ls resources/js/Pages/Activity/

# Find PDF templates
ls resources/views/pdf/

# Find layouts
ls resources/js/Layouts/

# Find controllers
ls app/Http/Controllers/Activity*
```

---

## 📚 Documentation Files

1. `MIGRATION_SUMMARY.md` - What changed & why
2. `STRUKTUR_BARU.md` - Complete architecture overview
3. `resources/views/pdf/README.md` - PDF usage guide
4. `QUICK_REFERENCE.md` (this file) - Quick help

---

## ⚠️ Important Notes

### DO:
- ✅ Use React for ALL new UI features
- ✅ Use Blade ONLY for PDFs
- ✅ Follow naming conventions
- ✅ Keep documentation updated

### DON'T:
- ❌ Create new Blade views (except PDFs)
- ❌ Mix UI logic in PDF templates
- ❌ Use old path (`activity.printing.*`)
- ❌ Create new layouts in `views/layouts/`

---

## 🆘 Troubleshooting

### Issue: Page not loading
```bash
# Clear caches
php artisan view:clear
php artisan config:clear
npm run build
```

### Issue: PDF not generating
```bash
# Check file exists
ls resources/views/pdf/certificates/preview.blade.php

# Check logs
tail -f storage/logs/laravel.log
```

### Issue: React component not found
```bash
# Rebuild assets
npm run dev
# Check file path matches controller
```

---

## 📞 Support

- **Architecture Questions:** See `STRUKTUR_BARU.md`
- **Migration History:** See `MIGRATION_SUMMARY.md`
- **PDF Help:** See `resources/views/pdf/README.md`

---

**Version:** 2.0  
**Last Updated:** 21 Jan 2026  
**Status:** ✅ Production Ready
