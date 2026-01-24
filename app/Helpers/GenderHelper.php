<?php

namespace App\Helpers;

class GenderHelper
{
    /**
     * Normalize gender input to 'L' or 'P'.
     *
     * @param string|null $gender
     * @return string|null
     */
    public static function normalize($gender)
    {
        if (empty($gender)) {
            return null;
        }

        $gender = trim(strtoupper($gender));

        // Normalisasi Laki-laki
        if (in_array($gender, ['L', 'LAKI', 'LAKI-LAKI', 'LAKI LAKI', 'PRIA', 'COWOK', 'MAN', 'MALE', 'M', 'LK'])) {
            return 'L';
        }

        // Normalisasi Perempuan
        if (in_array($gender, ['P', 'PEREMPUAN', 'WANITA', 'CEWEK', 'WOMAN', 'FEMALE', 'F', 'W', 'PR'])) {
            return 'P';
        }

        // Jika input sudah L atau P, kembalikan
        if ($gender === 'L' || $gender === 'P') {
            return $gender;
        }

        return $gender; // Kembalikan nilai asli jika tidak dikenali, atau bisa return null
    }

    /**
     * Predict gender based on name.
     *
     * @param string $name
     * @return string|null 'L' or 'P'
     */
    public static function predict($name)
    {
        if (empty($name)) {
            return null;
        }

        $name = strtoupper(trim($name));
        $parts = explode(' ', $name);
        $firstName = $parts[0];
        $lastName = end($parts);

        // Kata kunci spesifik Laki-laki (Strong)
        $maleStrong = [
            'MUHAMMAD', 'MUHAMAD', 'MOHAMMAD', 'MOHAMAD', 'AHMAD', 'ACHMAD',
            'ABDUL', 'AGUS', 'BAMBANG', 'BUDI', 'EKO', 'HENDRA', 'HERI', 'IWAN',
            'JOKO', 'PUTRA', 'RIZKY', 'RIZKI', 'RUDI', 'YUDI', 'YUSUF', 'ZAINAL',
            'ADITYA', 'AGUNG', 'ANDI', 'ANTON', 'ARIEF', 'ARIF', 'BAYU', 'DANI',
            'DIMAS', 'FAJAR', 'FIRMAN', 'GILANG', 'HADI', 'ILHAM', 'INDRA',
            'MAULANA', 'RAMA', 'REZA', 'SATRIA', 'SURYA', 'TEGUH', 'WAHYU',
            'KEVIN', 'MICHAEL', 'DAVID', 'JASON', 'ANDREW', 'WILLIAM'
        ];

        // Kata kunci spesifik Perempuan (Strong)
        $femaleStrong = [
            'SITI', 'SRI', 'NURUL', 'PUTRI', 'AYU', 'DEWI', 'ANI', 'ANNISA', 'ANISA',
            'FATIMAH', 'FITRI', 'FITRIA', 'INDAH', 'INTAN', 'LIA', 'LINA', 'MAYA',
            'MEGA', 'NADIA', 'NINA', 'NITA', 'NOVI', 'NUR', 'RAHMA', 'RATNA',
            'RINA', 'RINI', 'SANTI', 'SARI', 'SUSI', 'TRI', 'WATI', 'WULAN',
            'YANI', 'YANTI', 'YULI', 'ZAHRA', 'AISYAH', 'AMELIA', 'ANGGUN',
            'AULIA', 'BELLA', 'CINDY', 'CITRA', 'DESI', 'DIANA', 'DINA', 'EKA',
            'EVA', 'GITA', 'HANI', 'IKA', 'JULIA', 'KARTIKA', 'LESTARI',
            'MARIA', 'MELI', 'MILA', 'MIRA', 'MONICA', 'MUTIARA', 'NOVA',
            'OLIVIA', 'RISA', 'RISKA', 'ROSI', 'SARAH', 'SELVIA', 'SHINTA',
            'SISKA', 'SUCI', 'SYIFA', 'TANIA', 'TASYA', 'TIARA', 'TIKA', 'VINA',
            'VIVI', 'WIDYA', 'WINDA', 'YENI', 'YESI', 'YUNI'
        ];

        // Cek Nama Depan (Strong Match)
        if (in_array($firstName, $maleStrong)) return 'L';
        if (in_array($firstName, $femaleStrong)) return 'P';

        // Cek Nama Belakang/Akhiran (Suffix)
        if (str_ends_with($name, ' PUTRA') || str_ends_with($name, ' PRAKOSO') || str_ends_with($name, ' WIBOWO')) return 'L';
        if (str_ends_with($name, ' PUTRI') || str_ends_with($name, ' WATI') || str_ends_with($name, ' SARI') || str_ends_with($name, ' NINGSIH')) return 'P';

        // Heuristik berdasarkan kata yang terkandung (Medium)
        // Perlu hati-hati dengan nama ambigu seperti NUR, TRI, EKA, DWI, RIZKI
        
        // Loop kata per kata
        foreach ($parts as $part) {
            if (in_array($part, $maleStrong)) return 'L';
            if (in_array($part, $femaleStrong)) return 'P';
        }

        // Heuristik Akhiran Nama Depan
        // Akhiran -a, -i, -ti, -ni biasanya Perempuan
        // Akhiran -o, -us, -an, -ar biasanya Laki-laki
        
        if (preg_match('/(WATI|SARI|DEWI|YANTI|YANI|ASTUTI|NINGSIH)$/', $name)) return 'P';
        
        $lastChar = substr($firstName, -1);
        if (in_array($lastChar, ['o', 'u', 'k'])) return 'L'; // Joko, Heru, Didik
        if (in_array($lastChar, ['a', 'i', 'e'])) return 'P'; // Lina, Susi, Dea (Weak)

        return null; // Tidak berani tebak
    }
}
