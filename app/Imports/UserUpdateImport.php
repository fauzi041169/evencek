<?php

namespace App\Imports;

use App\Models\District;
use App\Models\Profile;
use App\Models\Province;
use App\Models\Regency;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class UserUpdateImport implements ToCollection, WithHeadingRow
{
    public function collection(Collection $rows)
    {
        foreach ($rows as $row) {
            // Mapping Header Bahasa Indonesia (slug) ke Kolom Database/Logic
            // User: nama_lengkap, email, password, role
            // Profile: nomor_hp, nik, pekerjaan, instansi, jabatan, alamat, jenis_kelamin, tempat_lahir, tanggal_lahir
            // Region Names: provinsi, kabupaten, kecamatan

            // 1. Get Email (Key)
            $email = $row['email'] ?? null;
            if (empty($email)) {
                continue;
            }

            // 2. Resolve Region IDs from Names
            $provinceId = null;
            $regencyId = null;
            $districtId = null;
            $otherProvince = null;
            $otherRegency = null;
            $otherDistrict = null;

            // -- Province --
            $provName = $row['provinsi'] ?? null;
            if (! empty($provName)) {
                $province = Province::where('name', 'LIKE', $provName)->first();
                // Try fuzzy match if exact fails (optional, usually LIKE is enough if user copies correctly)
                if (! $province) {
                    $province = Province::where('name', 'LIKE', "%{$provName}%")->first();
                }

                if ($province) {
                    $provinceId = $province->id;
                } else {
                    $otherProvince = $provName;
                }
            }

            // -- Regency --
            $regName = $row['kabupaten'] ?? null;
            if (! empty($regName)) {
                $regQuery = Regency::where('name', 'LIKE', $regName);
                if (! $regQuery->exists()) {
                    $regQuery = Regency::where('name', 'LIKE', "%{$regName}%");
                }

                // If province known, filter by it to avoid ambiguity (e.g. duplicare regency names?)
                if ($provinceId) {
                    $regQuery->where('province_id', $provinceId);
                }

                $regency = $regQuery->first();

                if ($regency) {
                    $regencyId = $regency->id;
                    // Auto-fix province if not set yet but regency found
                    if (! $provinceId) {
                        $provinceId = $regency->province_id;
                    }
                } else {
                    $otherRegency = $regName;
                }
            }

            // -- District --
            $distName = $row['kecamatan'] ?? null;
            if (! empty($distName)) {
                $distQuery = District::where('name', 'LIKE', $distName);
                if (! $distQuery->exists()) {
                    $distQuery = District::where('name', 'LIKE', "%{$distName}%");
                }

                if ($regencyId) {
                    $distQuery->where('regency_id', $regencyId);
                }

                $district = $distQuery->first();

                if ($district) {
                    $districtId = $district->id;
                    if (! $regencyId) {
                        $regencyId = $district->regency_id;
                    }
                    if (! $provinceId) {
                        // deep reverse lookup if needed, but regency->province usually covers it
                        $r = Regency::find($district->regency_id);
                        if ($r) {
                            $provinceId = $r->province_id;
                        }
                    }
                } else {
                    $otherDistrict = $distName;
                }
            }

            // 3. Process User
            $user = User::where('email', $email)->first();

            $userData = [
                'name' => $row['nama_lengkap'] ?? null,
                'role' => isset($row['role']) ? strtolower($row['role']) : null,
                'password' => ! empty($row['password']) ? Hash::make($row['password']) : null,
            ];

            if ($user) {
                // UPDATE
                if ($userData['name']) {
                    $user->name = $userData['name'];
                }
                if ($userData['role'] && in_array($userData['role'], ['admin', 'user', 'creator', 'guest'])) {
                    $user->role = $userData['role'];
                }
                if ($userData['password']) {
                    $user->password = $userData['password'];
                }
                $user->save();
            } else {
                // CREATE
                $user = User::create([
                    'name' => $userData['name'] ?? 'User Import',
                    'email' => $email,
                    'password' => $userData['password'] ?? Hash::make('12345678'),
                ]);
                $user->forceFill([
                    'role' => $userData['role'] ?? 'user',
                ])->save();
            }

            // 4. Process Profile
            $profile = $user->profile ?? new Profile(['user_id' => $user->id]);

            // Map standard text fields
            $textFields = [
                'nomor_hp' => 'no_hp',
                'nik' => 'nik',
                'pekerjaan' => 'pekerjaan',
                'instansi' => 'instansi',
                'jabatan' => 'jabatan',
                'alamat' => 'alamat',
                'jenis_kelamin' => 'jenis_kelamin',
                'tempat_lahir' => 'birth_place',
                'tanggal_lahir' => 'birth_date',
            ];

            foreach ($textFields as $rowKey => $dbCol) {
                // Only update if value is present and not an empty string
                if (isset($row[$rowKey]) && trim($row[$rowKey]) !== '') {
                    $profile->$dbCol = $row[$rowKey];
                }
            }

            // Set Region IDs
            if ($provinceId) {
                $profile->province_id = $provinceId;
            }
            if ($regencyId) {
                $profile->regency_id = $regencyId;
            }
            if ($districtId) {
                $profile->district_id = $districtId;
            }

            // Set Others if available (only if ID not found, logic handled above)
            if ($otherProvince) {
                $profile->other_province = $otherProvince;
            }
            if ($otherRegency) {
                $profile->other_regency = $otherRegency;
            }
            if ($otherDistrict) {
                $profile->other_district = $otherDistrict;
            }

            // Clear 'other' fields if ID is present (to avoid stale data)
            if ($provinceId) {
                $profile->other_province = null;
            }
            if ($regencyId) {
                $profile->other_regency = null;
            }
            if ($districtId) {
                $profile->other_district = null;
            }

            $profile->save();
        }
    }
}
