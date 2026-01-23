<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class UserImportTemplate implements FromArray, ShouldAutoSize, WithHeadings
{
    public function array(): array
    {
        return [
            ['John Doe', 'john@example.com', 'password123', '081234567890', 'Guru', 'Manager', 'Jl. Contoh No. 123', 'Laki-laki', '1', '1', '1'],
            ['Jane Smith', 'jane@example.com', 'password123', '081234567891', 'Guru', 'Staff', 'Jl. Contoh No. 124', 'Perempuan', '1', '1', '1'],
        ];
    }

    public function headings(): array
    {
        return [
            'Nama Lengkap*',
            'Email*',
            'Password*',
            'No. HP',
            'Pekerjaan',
            'Jabatan',
            'Alamat',
            'Jenis Kelamin (Laki-laki/Perempuan)',
            'Provinsi',
            'ID Kabupaten',
            'Kecamantan',
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Style the header row
        $lastCol = 'K';
        $headerStyle = [
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4F81BD'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                ],
            ],
        ];
        $sheet->getStyle('A1:'.$lastCol.'1')->applyFromArray($headerStyle);

        // Highlight required fields
        $requiredColumns = ['A', 'B', 'C']; // name, email, password
        foreach ($requiredColumns as $col) {
            $sheet->getStyle($col.'2:'.$col.'1000')->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()
                ->setRGB('FFF2CC');
        }

        // Add borders to all cells
        $sheet->getStyle('A1:'.$lastCol.'1000')->getBorders()
            ->getAllBorders()
            ->setBorderStyle(Border::BORDER_THIN);

        // Add note about required fields
        $sheet->getComment('A1')->getText()->createTextRun('* Wajib diisi');
    }
}
