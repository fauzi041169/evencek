<?php

namespace App\Helpers;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GenderHelper
{
    /**
     * Normalize gender input to 'L' or 'P'.
     *
     * @param  string|null  $gender
     * @return string|null
     */
    public static function normalize($gender)
    {
        if (empty($gender)) {
            return null;
        }

        $gender = trim((string) $gender);
        if ($gender === '') {
            return null;
        }

        if (preg_match('/^\s*1\s*$/', $gender)) {
            return 'L';
        }
        if (preg_match('/^\s*2\s*$/', $gender)) {
            return 'P';
        }

        $lower = mb_strtolower($gender);
        $letters = preg_replace('/[^\p{L}]+/u', '', $lower);
        $letters = (string) $letters;

        if ($letters === '' || $letters === 'lp' || $letters === 'lakiatauperempuan' || $letters === 'lakiperempuan') {
            return null;
        }

        if (in_array($letters, ['l', 'laki', 'lakilaki', 'pria', 'cowok', 'cowo', 'lelaki', 'lel', 'man', 'male', 'm', 'lk', 'ikhwan'], true)) {
            return 'L';
        }

        if (in_array($letters, ['p', 'perempuan', 'wanita', 'cewek', 'cewe', 'perempu', 'woman', 'female', 'f', 'w', 'pr', 'akhwat'], true)) {
            return 'P';
        }

        if (
            str_contains($letters, 'laki') ||
            str_contains($letters, 'lelaki') ||
            str_contains($letters, 'pria') ||
            str_contains($letters, 'cowok') ||
            str_contains($letters, 'cowo') ||
            str_contains($letters, 'male') ||
            str_contains($letters, 'man')
        ) {
            return 'L';
        }

        if (
            str_contains($letters, 'perem') ||
            str_contains($letters, 'wanita') ||
            str_contains($letters, 'cewek') ||
            str_contains($letters, 'cewe') ||
            str_contains($letters, 'female') ||
            str_contains($letters, 'woman')
        ) {
            return 'P';
        }

        return null;
    }

    /**
     * Predict gender based on name.
     *
     * @param  string  $name
     * @return string|null 'L' or 'P'
     */
    public static function predict($name)
    {
        if (empty($name)) {
            return null;
        }

        // Clean name
        $name = strtoupper(trim(preg_replace('/[^a-zA-Z\s]/', '', $name)));

        // Try AI if enabled
        if (config('services.ai_gender.enabled')) {
            $aiPrediction = self::predictWithAI($name);
            if ($aiPrediction) {
                return $aiPrediction;
            }
        }

        return self::predictLocal($name);
    }

    /**
     * Predict gender using Local Dictionary / Heuristics.
     */
    public static function predictLocal($name)
    {
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
            'KEVIN', 'MICHAEL', 'DAVID', 'JASON', 'ANDREW', 'WILLIAM',
            'TAUFIK', 'HIDAYAT', 'DODDY', 'FERRY', 'GUNAWAN', 'HARTONO',
            'IMAM', 'IRFAN', 'IRWAN', 'ISMAIL', 'KURNIAWAN', 'LUKMAN',
            'MUKTI', 'NANANG', 'NUGROHO', 'PRAS', 'PRASETYO', 'RAHMAT',
            'RENDY', 'RICKY', 'RIDWAN', 'RIFKY', 'RIO', 'ROBBY', 'RONY',
            'RYAN', 'SALIM', 'SAMSUL', 'ANDRI', 'ANDRY', 'ARIS', 'BAGAS',
            'BAGUS', 'CAHYO', 'DEDDY', 'DEDY', 'DENI', 'DENNY', 'DICKY',
            'DONI', 'DONNY', 'DWIKI', 'DZAKY', 'FAISAL', 'FARHAN', 'FARID',
            'FAUZAN', 'FIKRI', 'GALIH', 'HAFIZ', 'HAMZAH', 'HANIF', 'HASAN',
            'HUSEIN', 'IKBAL', 'IQBAL', 'JAMAL', 'KAMAL', 'LUTFI', 'MALIK',
            'MIFTAH', 'MUHLIS', 'NASRUL', 'RAFLI', 'RAFIF', 'RAIHAN', 'RANDY',
            'RAYHAN', 'RIAN', 'RIFQI', 'ROHMAD', 'ROHMAT', 'ROZAK', 'SEPTIAN',
            'SIDIK', 'SLAMET', 'SOFYAN', 'SUGENG', 'SUPRI', 'SYAHRUL', 'SYAMSUL',
            'TOMMY', 'TONI', 'TOTOK', 'TRIYONO', 'UMAR', 'USMAN', 'WILDAN',
            'WISNU', 'YOGA', 'YOGI', 'YOSEP', 'YUDHA', 'ZAKI', 'ZULKARNAEN',
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
            'VIVI', 'WIDYA', 'WINDA', 'YENI', 'YESI', 'YUNI',
            'ADINDA', 'AFIIFAH', 'AGUSTINA', 'AINI', 'ALFIAH', 'ALIFIA', 'ALIN',
            'AMALIA', 'AMANDA', 'ANASTASIA', 'ANDINI', 'ANGEL', 'ANGGI', 'ANGGITA',
            'ANIS', 'APRILIA', 'ARINA', 'ARUM', 'ASTRI', 'ASTRID', 'AUREL',
            'AZIZAH', 'BUNGA', 'CANTIKA', 'CHINTYA', 'CLARA', 'CUT', 'DEA',
            'DELLA', 'DESTI', 'DEVI', 'DHINI', 'DIAH', 'DWI', 'ELISA',
            'ELLA', 'ELSA', 'ELVI', 'ELY', 'ENDAH', 'ENI', 'ERIKA',
            'ERINA', 'ERMA', 'ERNA', 'ERNI', 'ESTI', 'FAIZA', 'FARIDA',
            'FEBY', 'FENNY', 'FINA', 'FRISKA', 'GABRIELLA', 'HANA', 'HANNA',
            'HESTI', 'IIS', 'IKKE', 'IMAS', 'INNA', 'IRA', 'IRMA',
            'ISNA', 'JESSICA', 'KARINA', 'KHARISMA', 'KHUSNUL', 'KIKI', 'LAILA',
            'LENI', 'LILIS', 'LISA', 'LULU', 'MARLINA', 'MAWAR', 'MELANI',
            'MELATI', 'MELDA', 'MELISA', 'MERRY', 'MIA', 'MURNI', 'NABILA',
            'NADA', 'NADYA', 'NAFA', 'NANA', 'NANCY', 'NANDA', 'NATASIA',
            'NELLA', 'NENENG', 'NENI', 'NIA', 'NIKI', 'NIKITA', 'NILA',
            'NILAM', 'NOOR', 'NORMA', 'NOVIA', 'NUR', 'NURLELA', 'NURMALA',
            'OKTA', 'OKTAVIA', 'PIPIT', 'PRATIWI', 'PUTU', 'QORY', 'RACHMA',
            'RAHMI', 'RANI', 'RARA', 'RESTI', 'RETNO', 'RIA', 'RIKA',
            'RINDI', 'RIRIN', 'RISMA', 'RISTI', 'RIZKA', 'ROSA', 'ROSE',
            'SAFIRA', 'SALMA', 'SANDRA', 'SANTY', 'SEKAR', 'SEPTIA', 'SHERLY',
            'SILVI', 'SILVIA', 'SINTA', 'SONYA', 'SUCI', 'SUSAN', 'SYAFIKA',
            'TARA', 'TATA', 'TIA', 'TIKA', 'TINA', 'TITIK', 'TITIN',
            'TRIANA', 'ULFA', 'UMI', 'UTAMI', 'VENNY', 'VERA', 'VICKY',
            'VIDYA', 'VIRA', 'VITA', 'WIDIA', 'WIDURI', 'WINDY', 'WIRDA',
            'YAYUK', 'YOVITA', 'YULIA', 'YUNITA', 'YUYUN', 'ZASKIA',
        ];

        // Cek Nama Depan (Strong Match)
        if (in_array($firstName, $maleStrong)) {
            return 'L';
        }
        if (in_array($firstName, $femaleStrong)) {
            return 'P';
        }

        // Cek Nama Belakang/Akhiran (Suffix)
        if (str_ends_with($name, ' PUTRA') || str_ends_with($name, ' PRAKOSO') || str_ends_with($name, ' WIBOWO')) {
            return 'L';
        }
        if (str_ends_with($name, ' PUTRI') || str_ends_with($name, ' WATI') || str_ends_with($name, ' SARI') || str_ends_with($name, ' NINGSIH')) {
            return 'P';
        }

        // Heuristik berdasarkan kata yang terkandung (Medium)
        foreach ($parts as $part) {
            if (in_array($part, $maleStrong)) {
                return 'L';
            }
            if (in_array($part, $femaleStrong)) {
                return 'P';
            }
        }

        // Regex Patterns
        if (preg_match('/(WATI|SARI|DEWI|YANTI|YANI|ASTUTI|NINGSIH|NURUL|AYU|PUTRI)$/', $name)) {
            return 'P';
        }
        if (preg_match('/(PUTRA|SANTOSO|WIBOWO|SAPUTRA|HIDAYAT|PRATAMA|PERDANA|LAKSANA)$/', $name)) {
            return 'L';
        }

        // Akhiran (Weak Heuristics) - case-insensitive
        $lastChar = strtoupper(substr($firstName, -1));
        if (in_array($lastChar, ['O', 'U', 'K'])) {
            return 'L';
        }
        if (in_array($lastChar, ['A', 'E'])) {
            // Check pengecualian nama berakhiran 'a' tapi cowok (misal: Eka, Indra, Reza, Rama)
            $maleEndsA = ['EKA', 'INDRA', 'REZA', 'RAMA', 'YUDHA', 'SATRIA', 'ARYA', 'DWI', 'EZZA', 'PRADANA', 'MAHENDRA'];
            if (in_array($firstName, $maleEndsA)) {
                return 'L';
            }

            return 'P';
        }

        return null;
    }

    /**
     * Predict using external AI API
     */
    public static function predictWithAI($name)
    {
        $apiKey = config('services.ai_gender.key');
        $url = config('services.ai_gender.url');
        $model = config('services.ai_gender.model');

        if (! $apiKey) {
            return null;
        }

        try {
            // Using generic OpenAI Chat Completion format
            $response = Http::withToken($apiKey)->post($url, [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => 'You are a helper to determine gender from Indonesian names. Respond ONLY with "L" (Male) or "P" (Female). If unsure, guess based on common Indonesian naming conventions.'],
                    ['role' => 'user', 'content' => $name],
                ],
                'temperature' => 0.1,
                'max_tokens' => 5,
            ]);

            if ($response->successful()) {
                $content = strtoupper(trim($response->json('choices.0.message.content')));
                // Clean response
                $content = str_replace(['.', '"', "'"], '', $content);

                if (str_contains($content, 'LAKI') || $content === 'L') {
                    return 'L';
                }
                if (str_contains($content, 'PEREMPUAN') || $content === 'P') {
                    return 'P';
                }
            }
        } catch (\Exception $e) {
            Log::error('AI Gender Prediction Error: '.$e->getMessage());
        }

        return null;
    }
}
