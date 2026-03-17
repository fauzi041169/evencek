<?php

namespace App\Helpers;

use App\Models\District;
use App\Models\Province;
use App\Models\Regency;

class RegionMatcher
{
    protected static function detectRegencyType($name)
    {
        $n = strtolower(trim((string) $name));
        $n = preg_replace('/\s+/', ' ', $n);

        if (str_starts_with($n, 'kabupaten ') || str_starts_with($n, 'kab ')) {
            return 'kabupaten';
        }
        if (str_starts_with($n, 'kota administrasi ') || str_starts_with($n, 'kota adm ') || str_starts_with($n, 'kota ')) {
            return 'kota';
        }

        return null;
    }

    /**
     * Fuzzy match province by name with similarity threshold
     *
     * @param  string  $name  Province name to match
     * @param  float  $threshold  Similarity threshold (0-1), default 0.6
     * @return Province|null
     */
    public static function matchProvince($name, $threshold = 0.6)
    {
        if (empty($name)) {
            return null;
        }

        $name = self::normalizeName($name);
        $provinces = Province::all(['id', 'name']);

        $bestMatch = null;
        $bestSimilarity = 0;

        foreach ($provinces as $province) {
            $provinceName = self::normalizeName($province->name);
            $similarity = self::similarity($name, $provinceName);

            if ($similarity > $bestSimilarity) {
                $bestSimilarity = $similarity;
                $bestMatch = $province;
            }
        }

        return ($bestSimilarity >= $threshold) ? $bestMatch : null;
    }

    /**
     * Fuzzy match regency by name and optional province
     *
     * @param  string  $name  Regency name to match
     * @param  int|null  $provinceId  Optional province ID for better matching
     * @param  float  $threshold  Similarity threshold (0-1), default 0.6
     * @return Regency|null
     */
    public static function matchRegency($name, $provinceId = null, $threshold = 0.6)
    {
        if (empty($name)) {
            return null;
        }

        $desiredType = self::detectRegencyType($name);
        $name = self::normalizeName($name);
        $query = Regency::query();

        if ($provinceId) {
            $query->where('province_id', $provinceId);
        }

        $regencies = $query->get(['id', 'name', 'province_id']);

        $bestMatch = null;
        $bestSimilarity = 0;

        foreach ($regencies as $regency) {
            $regencyName = self::normalizeName($regency->name);
            $similarity = self::similarity($name, $regencyName);

            if ($desiredType) {
                $candidateType = self::detectRegencyType($regency->name);
                if ($candidateType === $desiredType) {
                    $similarity += 0.15;
                } else {
                    $similarity -= 0.15;
                }
                if ($similarity < 0) {
                    $similarity = 0;
                }
            }

            if ($similarity > $bestSimilarity) {
                $bestSimilarity = $similarity;
                $bestMatch = $regency;
            }
        }

        return ($bestSimilarity >= $threshold) ? $bestMatch : null;
    }

    /**
     * Fuzzy match district by name and optional regency
     *
     * @param  string  $name  District name to match
     * @param  int|null  $regencyId  Optional regency ID for better matching
     * @param  float  $threshold  Similarity threshold (0-1), default 0.6
     * @return District|null
     */
    public static function matchDistrict($name, $regencyId = null, $threshold = 0.6)
    {
        if (empty($name)) {
            return null;
        }

        $name = self::normalizeName($name);
        $query = District::query();

        if ($regencyId) {
            $query->where('regency_id', $regencyId);
        }

        $districts = $query->get(['id', 'name', 'regency_id']);

        $bestMatch = null;
        $bestSimilarity = 0;

        foreach ($districts as $district) {
            $districtName = self::normalizeName($district->name);
            $similarity = self::similarity($name, $districtName);

            if ($similarity > $bestSimilarity) {
                $bestSimilarity = $similarity;
                $bestMatch = $district;
            }
        }

        return ($bestSimilarity >= $threshold) ? $bestMatch : null;
    }

    /**
     * Calculate similarity between two strings using Levenshtein distance
     * Returns value between 0 and 1 (1 = identical)
     *
     * @param  string  $str1
     * @param  string  $str2
     * @return float
     */
    public static function similarity($str1, $str2)
    {
        // Exact match
        if ($str1 === $str2) {
            return 1.0;
        }

        $len1 = strlen($str1);
        $len2 = strlen($str2);

        if ($len1 == 0 || $len2 == 0) {
            return 0;
        }

        // Calculate Levenshtein distance
        $levenshtein = levenshtein($str1, $str2);
        $maxLen = max($len1, $len2);

        // Convert distance to similarity (0-1)
        return 1 - ($levenshtein / $maxLen);
    }

    protected static function normalizeName($name)
    {
        $name = strtolower(trim($name));
        $name = str_replace(['.', ','], ' ', $name);

        $prefixes = [
            'kabupaten',
            'kab',
            'kota administrasi',
            'kota adm',
            'kota',
            'kecamatan',
            'kecamatn',
            'kec',
        ];

        foreach ($prefixes as $prefix) {
            $prefixWithSpace = $prefix.' ';
            if (substr($name, 0, strlen($prefixWithSpace)) === $prefixWithSpace) {
                $name = substr($name, strlen($prefixWithSpace));
                break;
            }
        }

        $name = preg_replace('/\s+/', ' ', $name);

        return trim($name);
    }

    /**
     * Try to match all three regions at once
     *
     * @param  string  $provinceName
     * @param  string  $regencyName
     * @param  string  $districtName
     * @param  float  $threshold
     * @return array ['province_id' => ..., 'regency_id' => ..., 'district_id' => ...]
     */
    public static function matchRegions($provinceName, $regencyName, $districtName, $threshold = 0.6)
    {
        $result = [
            'province_id' => null,
            'regency_id' => null,
            'district_id' => null,
        ];

        // Match province first
        if (! empty($provinceName)) {
            $province = self::matchProvince($provinceName, $threshold);
            if ($province) {
                $result['province_id'] = $province->id;
            }
        }

        // Match regency (using province if found)
        if (! empty($regencyName)) {
            $regency = self::matchRegency($regencyName, $result['province_id'], $threshold);
            if ($regency) {
                $result['regency_id'] = $regency->id;
                // Update province if regency match found but province not
                if (! $result['province_id']) {
                    $result['province_id'] = $regency->province_id;
                }
            }
        }

        // Match district (using regency if found)
        if (! empty($districtName)) {
            $district = self::matchDistrict($districtName, $result['regency_id'], $threshold);
            if ($district) {
                $result['district_id'] = $district->id;
                // Update regency if district match found but regency not
                if (! $result['regency_id']) {
                    $result['regency_id'] = $district->regency_id;
                    // Get province from regency
                    $regency = Regency::find($district->regency_id);
                    if ($regency && ! $result['province_id']) {
                        $result['province_id'] = $regency->province_id;
                    }
                }
            }
        }

        return $result;
    }
}
