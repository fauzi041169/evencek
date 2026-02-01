<?php

namespace App\Console\Commands;

use App\Models\District;
use App\Models\Province;
use App\Models\Regency;
use Illuminate\Console\Command;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class GenerateImportTemplate extends Command
{
    protected $signature = 'generate:import-template';

    protected $description = 'Generate Excel template for user import with dropdowns';

    public function handle()
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();

        // Header persis nama kolom database
        $headers = [
            'name',
            'email',
            'npa',
            'npa_verified_at',
            'password',
            'role',
            'no_hp',
            'alamat',
            'foto',
            'pekerjaan',
            'jabatan',
            'jenis_kelamin',
            'Provinsi',
            'Kabupaten/Kota',
            'Kecamatan',
        ];

        // Add headers
        $column = 'A';
        foreach ($headers as $header) {
            $sheet->setCellValue($column.'1', $header);
            $sheet->getColumnDimension($column)->setAutoSize(true);
            $column++;
        }

        // Style the header row
        $lastCol = chr(64 + count($headers));
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

        // Add sample data
        $sampleData = [
            [
                'Fauzi Fauzan',
                'fauzigagar@gmail.com',
                '43423424324',
                '', // npa_verified_at
                '', // password
                'guest',
                '081234567890',
                'Jl. Contoh No. 123',
                '', // foto
                'Guru',
                'Ketua',
                'Laki-laki',
                'ACEH',
                'KABUPATEN ACEH SELATAN',
                'BAKONGAN',
            ],
            [
                'Siti Aminah',
                'sitiaminah@gmail.com',
                '9876543210',
                '',
                '',
                'guest',
                '089876543210',
                'Jl. Sample No. 456',
                '',
                'Dosen',
                'Anggota',
                'Perempuan',
                'SUMATERA UTARA',
                'KABUPATEN DELI SERDANG',
                'PERCUT SEI TUAN',
            ],
        ];

        $row = 2;
        foreach ($sampleData as $data) {
            $column = 'A';
            foreach ($data as $value) {
                $sheet->setCellValue($column.$row, $value);
                $column++;
            }
            $row++;
        }

        // Highlight kolom wajib (name, email, npa)
        $sheet->getStyle('A2:A1000')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('FFF2CC');
        $sheet->getStyle('B2:B1000')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('FFF2CC');
        $sheet->getStyle('C2:C1000')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('FFF2CC');

        // Add borders to all cells
        $sheet->getStyle('A1:'.$lastCol.($row - 1))->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN);

        // Create dropdown for Jenis Kelamin (Column L)
        $this->addDropdownValidation($sheet, 'L', 'Laki-laki,Perempuan', 'Jenis Kelamin', 2, 5000);

        // --- Dropdown for Regions ---
        $provinces = Province::orderBy('name')->get();
        $regencies = Regency::orderBy('name')->get();
        $districts = District::orderBy('name')->get();

        // Create additional sheets for reference
        $this->createProvinceSheet($spreadsheet, $provinces);
        $this->createRegencySheet($spreadsheet, $regencies);
        $this->createDistrictSheet($spreadsheet, $districts);

        // Data validation for Province (Column M)
        if ($provinces->isNotEmpty()) {
            $provinceFormula = "'Province List'!\$B\$2:\$B\$".($provinces->count() + 1);
            $this->addDropdownValidation($sheet, 'M', $provinceFormula, 'Provinsi', 2, 5000, true);
        }

        // Data validation for Regency (Column N)
        if ($regencies->isNotEmpty()) {
            $regencyFormula = "'Regency List'!\$B\$2:\$B\$".($regencies->count() + 1);
            $this->addDropdownValidation($sheet, 'N', $regencyFormula, 'Kabupaten/Kota', 2, 5000, true);
        }

        // Data validation for District (Column O)
        if ($districts->isNotEmpty()) {
            $districtFormula = "'District List'!\$B\$2:\$B\$".($districts->count() + 1);
            $this->addDropdownValidation($sheet, 'O', $districtFormula, 'Kecamatan', 2, 5000, true);
        }
        // --- End of Dropdown ---

        // Save the file
        $filename = public_path('templates/template_import_user.xlsx');
        if (! file_exists(public_path('templates'))) {
            mkdir(public_path('templates'), 0777, true);
        }

        $writer = new Xlsx($spreadsheet);
        $writer->save($filename);

        $this->info("Template Excel berhasil dibuat di: {$filename}");
        $this->info('Template ini memiliki dropdown untuk:');
        $this->info('- Jenis Kelamin: Laki-laki, Perempuan');
        $this->info('- Province ID: '.$provinces->count().' provinsi');
        $this->info('- Regency ID: '.$regencies->count().' kabupaten/kota');
        $this->info('- District ID: '.$districts->count().' kecamatan');
        $this->info("Lihat sheet 'Province List', 'Regency List', dan 'District List' untuk referensi ID.");
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
}
