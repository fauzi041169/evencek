<?php

namespace App\Exports;

use App\Models\District;
use App\Models\Province;
use App\Models\Regency;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithColumnFormatting;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class UserTemplateExport implements FromArray, ShouldAutoSize, WithColumnFormatting, WithHeadings, WithStyles
{
    public function array(): array
    {
        // Sample data for the template
        return [
            [
                'John Doe',           // name
                'john@example.com',   // email
                'password123',        // password
                '081234567890',       // no_hp
                'Guru',              // pekerjaan
                'SMK N 1',           // instansi
                'Manager',     // jabatan
                'Jl. Contoh No. 123', // alamat
                'Laki-laki',          // jenis_kelamin (Laki-laki/Perempuan)
                '1',                 // province_id
                '1',                 // regency_id
                '1',                  // district_id
            ],
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
            'Instansi',
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
        $spreadsheet = $sheet->getParent();

        // Style the header row
        $lastCol = 'L';
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

        // Add data validation for Jenis Kelamin (Column H)
        $this->addDropdownValidation($sheet, 'H', 'Laki-laki,Perempuan', 'Jenis Kelamin', 2, 5000);

        // --- Dropdown for Regions ---
        $provinces = Province::orderBy('name')->get();
        $regencies = Regency::orderBy('name')->get();
        $districts = District::orderBy('name')->get();

        // Create additional sheets for reference
        $this->createProvinceSheet($spreadsheet, $provinces);
        $this->createRegencySheet($spreadsheet, $regencies);
        $this->createDistrictSheet($spreadsheet, $districts);

        // Data validation for Province (Column I)
        if ($provinces->isNotEmpty()) {
            $provinceFormula = "'Province List'!\$A\$2:\$A\$".($provinces->count() + 1);
            $this->addDropdownValidation($sheet, 'I', $provinceFormula, 'Province ID', 2, 5000, true);
        }

        // Data validation for Regency (Column J)
        if ($regencies->isNotEmpty()) {
            $regencyFormula = "'Regency List'!\$A\$2:\$A\$".($regencies->count() + 1);
            $this->addDropdownValidation($sheet, 'J', $regencyFormula, 'Regency ID', 2, 5000, true);
        }

        // Data validation for District (Column K)
        if ($districts->isNotEmpty()) {
            $districtFormula = "'District List'!\$A\$2:\$A\$".($districts->count() + 1);
            $this->addDropdownValidation($sheet, 'K', $districtFormula, 'District ID', 2, 5000, true);
        }
        // --- End of Dropdown ---

        // Add note about required fields
        $sheet->getComment('A1')->getText()->createTextRun('* Wajib diisi');

        // Set main sheet as active
        $spreadsheet->setActiveSheetIndex(0);
    }

    private function addDropdownValidation($sheet, $column, $list, $title, $startRow, $endRow, $isFormula = false)
    {
        for ($row = $startRow; $row <= $endRow; $row++) {
            $validation = $sheet->getCell($column.$row)->getDataValidation();
            $validation->setType(DataValidation::TYPE_LIST);
            $validation->setErrorStyle(DataValidation::STYLE_INFORMATION);
            $validation->setAllowBlank(true); // Allow blank to avoid errors on empty rows
            $validation->setShowInputMessage(true);
            $validation->setShowErrorMessage(true);
            $validation->setShowDropDown(true);
            if ($isFormula) {
                $validation->setFormula1($list);
            } else {
                $validation->setFormula1('"'.$list.'"');
            }
        }
    }

    private function createProvinceSheet($spreadsheet, $provinces)
    {
        $provinceSheet = $spreadsheet->createSheet();
        $provinceSheet->setTitle('Province List');

        // Add headers
        $provinceSheet->setCellValue('A1', 'ID');
        $provinceSheet->setCellValue('B1', 'Nama Provinsi');

        // Style headers
        $provinceSheet->getStyle('A1:B1')->applyFromArray([
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4F81BD'],
            ],
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
        ]);

        // Add province data
        $row = 2;
        foreach ($provinces as $province) {
            $provinceSheet->setCellValue('A'.$row, $province->id);
            $provinceSheet->setCellValue('B'.$row, $province->name);
            $row++;
        }

        // Auto-size columns
        $provinceSheet->getColumnDimension('A')->setAutoSize(true);
        $provinceSheet->getColumnDimension('B')->setAutoSize(true);
    }

    private function createRegencySheet($spreadsheet, $regencies)
    {
        $regencySheet = $spreadsheet->createSheet();
        $regencySheet->setTitle('Regency List');

        // Add headers
        $regencySheet->setCellValue('A1', 'ID');
        $regencySheet->setCellValue('B1', 'Nama Kabupaten/Kota');
        $regencySheet->setCellValue('C1', 'Province ID');
        $regencySheet->setCellValue('D1', 'Nama Provinsi');

        // Style headers
        $regencySheet->getStyle('A1:D1')->applyFromArray([
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4F81BD'],
            ],
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
        ]);

        // Add regency data
        $regencies = Regency::with('province')->orderBy('name')->get();
        $row = 2;
        foreach ($regencies as $regency) {
            $regencySheet->setCellValue('A'.$row, $regency->id);
            $regencySheet->setCellValue('B'.$row, $regency->name);
            $regencySheet->setCellValue('C'.$row, $regency->province_id);
            $regencySheet->setCellValue('D'.$row, $regency->province->name ?? 'N/A');
            $row++;
        }

        // Auto-size columns
        $regencySheet->getColumnDimension('A')->setAutoSize(true);
        $regencySheet->getColumnDimension('B')->setAutoSize(true);
        $regencySheet->getColumnDimension('C')->setAutoSize(true);
        $regencySheet->getColumnDimension('D')->setAutoSize(true);
    }

    private function createDistrictSheet($spreadsheet, $districts)
    {
        $districtSheet = $spreadsheet->createSheet();
        $districtSheet->setTitle('District List');

        // Add headers
        $districtSheet->setCellValue('A1', 'ID');
        $districtSheet->setCellValue('B1', 'Nama Kecamatan');
        $districtSheet->setCellValue('C1', 'Regency ID');
        $districtSheet->setCellValue('D1', 'Nama Kabupaten/Kota');
        $districtSheet->setCellValue('E1', 'Province ID');
        $districtSheet->setCellValue('F1', 'Nama Provinsi');

        // Style headers
        $districtSheet->getStyle('A1:F1')->applyFromArray([
            'font' => ['bold' => true],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '4F81BD'],
            ],
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
        ]);

        // Add district data
        $row = 2;
        foreach ($districts as $district) {
            $districtSheet->setCellValue('A'.$row, $district->id);
            $districtSheet->setCellValue('B'.$row, $district->name);
            $districtSheet->setCellValue('C'.$row, $district->regency_id);
            $districtSheet->setCellValue('D'.$row, $district->regency->name ?? 'N/A');
            $districtSheet->setCellValue('E'.$row, $district->regency->province_id ?? 'N/A');
            $districtSheet->setCellValue('F'.$row, $district->regency->province->name ?? 'N/A');
            $row++;
        }

        // Auto-size columns
        $districtSheet->getColumnDimension('A')->setAutoSize(true);
        $districtSheet->getColumnDimension('B')->setAutoSize(true);
        $districtSheet->getColumnDimension('C')->setAutoSize(true);
        $districtSheet->getColumnDimension('D')->setAutoSize(true);
        $districtSheet->getColumnDimension('E')->setAutoSize(true);
        $districtSheet->getColumnDimension('F')->setAutoSize(true);
    }

    public function columnFormats(): array
    {
        return [
            'B' => NumberFormat::FORMAT_TEXT, // Email as text
            'D' => NumberFormat::FORMAT_TEXT, // No. HP as text
        ];
    }
}
