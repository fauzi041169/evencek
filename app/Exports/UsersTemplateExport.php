<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;

class UsersTemplateExport implements FromArray, ShouldAutoSize, WithColumnFormatting, WithHeadings
{
    public function headings(): array
    {
        return [
            'Nama Lengkap',
            'Email', // Wajib (Key)
            'Password', // Opsional
            'Role', // admin, user
            'Nomor HP',
            'NIK', // Nomor Induk Kependudukan (Text format)
            'Pekerjaan',
            'Instansi',
            'Jabatan',
            'Alamat',
            'Jenis Kelamin', // L/P
            'Tempat Lahir',
            'Tanggal Lahir', // YYYY-MM-DD
            'Provinsi', // Nama Provinsi (Contoh: JAWA BARAT)
            'Kabupaten', // Nama Kabupaten (Contoh: KABUPATEN BANDUNG)
            'Kecamatan', // Nama Kecamatan (Contoh: CILLEUNYI)
        ];
    }

    public function array(): array
    {
        return [
            [
                'Budi Santoso',
                'budi@example.com',
                'password123',
                'user',
                '081234567890',
                '1234567890123456',
                'PNS',
                'Dinas Pendidikan',
                'Staf',
                'Jl. Merdeka No. 1',
                'L',
                'Jakarta',
                '1990-01-01',
                'JAWA BARAT',
                'KABUPATEN BANDUNG',
                'CILEUNYI',
            ],
        ];
    }

    public function columnFormats(): array
    {
        return [
            'E' => NumberFormat::FORMAT_TEXT, // Hp
            'F' => NumberFormat::FORMAT_TEXT, // NIK
        ];
    }
}
