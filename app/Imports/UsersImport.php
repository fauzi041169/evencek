<?php

namespace App\Imports;

use App\Helpers\GenderHelper;
use App\Helpers\RegionMatcher;
use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\Payment;
use App\Models\Profile;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Concerns\Importable;
use Maatwebsite\Excel\Concerns\SkipsErrors;
use Maatwebsite\Excel\Concerns\SkipsOnError;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithValidation;

class UsersImport implements SkipsOnError, ToModel, WithChunkReading, WithEvents, WithHeadingRow, WithMapping, WithValidation
{
    use Importable, SkipsErrors;

    protected $activity_id;

    protected $markPaid = true;

    protected $pendingUserIds = [];

    protected $successCount = 0;

    protected $skippedCount = 0;

    protected $errors = [];

    protected $newUserCount = 0;

    protected $existingUserToActivityCount = 0;

    protected $rowIndex = 1;

    public function __construct($activity_id, $markPaid = true)
    {
        $this->activity_id = $activity_id;
        $this->markPaid = (bool) $markPaid;
    }

    public function registerEvents(): array
    {
        return [
            \Maatwebsite\Excel\Events\AfterImport::class => function () {
                session(['import_result' => [
                    'success' => $this->successCount,
                    'skipped' => $this->skippedCount,
                    'errors' => $this->errors,
                    'new_users' => $this->newUserCount,
                    'existing_users_to_activity' => $this->existingUserToActivityCount,
                ]]);
                try {
                    $activity = \App\Models\Activity::with('activeBatch')->find($this->activity_id);
                    $price = (float) ($activity->price ?? 0);
                    $batchId = $activity && $activity->activeBatch ? $activity->activeBatch->id : null;
                    if (! $this->markPaid && $price > 0 && ! empty($this->pendingUserIds)) {
                        $allowed = count($this->pendingUserIds);
                        $gross = $allowed * $price;
                        session(['import_bulk_payment' => [
                            'pending_user_ids' => array_values(array_unique($this->pendingUserIds)),
                            'allowed_count' => $allowed,
                            'unit_price' => $price,
                            'gross_amount' => $gross,
                            'successfully_imported_count' => $this->successCount,
                            'activity_batch_id' => $batchId,
                        ]]);
                    }
                } catch (\Throwable $e) {
                }
            },
        ];
    }

    public function map($row): array
    {
        $currentIndex = $this->rowIndex;
        $this->rowIndex++;

        // Skip if row is empty
        if (empty(array_filter($row))) {
            Log::debug('IMPORT MAP SKIP_EMPTY_ROW', [
                'row_index' => $currentIndex,
            ]);

            return [];
        }

        $cleanedRow = [];
        foreach ($row as $key => $value) {
            $cleanKey = preg_replace('/^\d+\./', '', $key);
            $cleanKey = trim($cleanKey);
            $cleanKey = preg_replace('/^\xEF\xBB\xBF/', '', $cleanKey); // Strip UTF-8 BOM
            $cleanValue = is_string($value) ? trim($value) : $value;
            $cleanedRow[$cleanKey] = $cleanValue;
            $lowerKey = strtolower($cleanKey);
            if (! array_key_exists($lowerKey, $cleanedRow)) {
                $cleanedRow[$lowerKey] = $cleanValue;
            }
        }

        $jkKey = null;
        foreach ($cleanedRow as $k => $v) {
            if (preg_match('/kelamin/i', $k)) {
                $jkKey = $k;
                break;
            }
        }

        $provinceId = $cleanedRow['id_provinsi'] ?? $cleanedRow['Provinsi'] ?? null;
        $regencyId = $cleanedRow['id_kabupaten'] ?? $cleanedRow['id kabupaten'] ?? null;
        $districtId = $cleanedRow['id_kecamatan'] ?? $cleanedRow['Kecamantan'] ?? null;

        if (empty($provinceId) || empty($regencyId) || empty($districtId)) {
            $provinceName = $cleanedRow['provinsi'] ?? $cleanedRow['province'] ?? null;
            $regencyName = $cleanedRow['kabupaten_kota'] ?? $cleanedRow['kabupaten'] ?? $cleanedRow['kota'] ?? $cleanedRow['regency'] ?? null;
            $districtName = $cleanedRow['kecamatan'] ?? $cleanedRow['district'] ?? null;

            if (! empty($provinceName) || ! empty($regencyName) || ! empty($districtName)) {
                $matched = RegionMatcher::matchRegions($provinceName, $regencyName, $districtName, 0.5);
                $provinceId = $matched['province_id'] ?? $provinceId;
                $regencyId = $matched['regency_id'] ?? $regencyId;
                $districtId = $matched['district_id'] ?? $districtId;
            }
        }

        $mappedData = [
            'name' => $cleanedRow['nama_lengkap*'] ?? $cleanedRow['nama_lengkap'] ?? $cleanedRow['name'] ?? null,
            'email' => $cleanedRow['email*'] ?? $cleanedRow['email'] ?? null,
            'password' => $cleanedRow['password*'] ?? $cleanedRow['password'] ?? null,
            'no_hp' => $cleanedRow['no_hp'] ?? null,
            'pekerjaan' => $cleanedRow['pekerjaan'] ?? null,
            'instansi' => $cleanedRow['instansi'] ?? null,
            'jabatan' => $cleanedRow['jabatan'] ?? null,
            'alamat' => $cleanedRow['alamat'] ?? null,
            'jenis_kelamin' => $jkKey ? $cleanedRow[$jkKey] : null,
            'province_id' => $provinceId,
            'regency_id' => $regencyId,
            'district_id' => $districtId,
        ];
        $mappedData['__row_index'] = $currentIndex;

        Log::debug('IMPORT MAP ROW', [
            'row_index' => $currentIndex,
            'email' => $mappedData['email'],
            'name' => $mappedData['name'],
            'province_id' => $mappedData['province_id'],
            'regency_id' => $mappedData['regency_id'],
            'district_id' => $mappedData['district_id'],
            'raw_region_columns' => [
                'id_provinsi' => $cleanedRow['id_provinsi'] ?? null,
                'Provinsi' => $cleanedRow['Provinsi'] ?? null,
                'provinsi' => $cleanedRow['provinsi'] ?? null,
                'province' => $cleanedRow['province'] ?? null,
                'id_kabupaten' => $cleanedRow['id_kabupaten'] ?? null,
                'id kabupaten' => $cleanedRow['id kabupaten'] ?? null,
                'id_kecamatan' => $cleanedRow['id_kecamatan'] ?? null,
                'Kecamantan' => $cleanedRow['Kecamantan'] ?? null,
                'kecamatan' => $cleanedRow['kecamatan'] ?? null,
                'district' => $cleanedRow['district'] ?? null,
            ],
        ]);

        return $mappedData;
    }

    public function rules(): array
    {
        return [
            '*.nama_lengkap*' => 'required|string|max:255',
            '*.email*' => 'required|email',
            '*.password*' => 'required|string|min:6',
            '*.no_hp' => 'nullable|string|max:20',
            '*.pekerjaan' => 'nullable|string|max:100',
            '*.instansi' => 'nullable|string|max:100',
            '*.jabatan' => 'nullable|string|max:100',
            '*.alamat' => 'nullable|string|max:255',
            '*.jenis_kelamin' => 'nullable|string',
            '*.jenis_kelamin (l/p)' => 'nullable|string',
            '*.id_provinsi' => 'nullable|exists:provinces,id',
            '*.Provinsi' => 'nullable|exists:provinces,id',
            '*.id_kabupaten' => 'nullable|exists:regencies,id',
            '*.id kabupaten' => 'nullable|exists:regencies,id',
            '*.id_kecamatan' => 'nullable|exists:districts,id',
            '*.Kecamantan' => 'nullable|exists:districts,id',
        ];
    }

    public function customValidationMessages()
    {
        return [
            '*.nama_lengkap.string' => 'Kolom Nama Lengkap harus berupa teks',
            '*.email.email' => 'Format Email tidak valid',
            '*.password.min' => 'Password minimal 6 karakter',
            '*.id_provinsi.exists' => 'Provinsi tidak valid',
            '*.id_kabupaten.exists' => 'ID Kabupaten tidak valid',
            '*.id_kecamatan.exists' => 'Kecamantan tidak valid',
        ];
    }

    public function chunkSize(): int
    {
        return 100;
    }

    public function model(array $row)
    {
        if (empty($row)) {
            return null;
        }

        $currentIndex = $row['__row_index'] ?? null;
        if (array_key_exists('__row_index', $row)) {
            unset($row['__row_index']);
        }

        DB::beginTransaction();
        try {
            $gender = null;
            $originalGender = $row['jenis_kelamin'] ?? null;
            if (! empty($row['jenis_kelamin'])) {
                $gender = GenderHelper::normalize($row['jenis_kelamin']);
            }
            Log::debug('IMPORT MODEL START', [
                'row_index' => $currentIndex,
                'email' => $row['email'] ?? null,
                'name' => $row['name'] ?? null,
                'province_id' => $row['province_id'] ?? null,
                'regency_id' => $row['regency_id'] ?? null,
                'district_id' => $row['district_id'] ?? null,
                'gender_original' => $originalGender,
                'gender_normalized' => $gender,
            ]);

            $existingUser = null;
            if (! empty($row['email'])) {
                $existingUser = User::where('email', $row['email'])->first();
            }

            if ($existingUser) {
                Log::debug('IMPORT EXISTING_USER_FOUND', [
                    'row_index' => $currentIndex,
                    'email' => $row['email'] ?? null,
                    'user_id' => $existingUser->id,
                    'activity_id' => $this->activity_id,
                ]);

                if ($existingUser->activities()->where('activity_id', $this->activity_id)->exists()) {
                    try {
                        $payment = Payment::where('activity_id', $this->activity_id)
                            ->where('user_id', $existingUser->id)
                            ->first();

                        if ($payment && $payment->proof_of_payment) {
                            if (! \Illuminate\Support\Facades\File::exists(public_path($payment->proof_of_payment))) {
                                $defaultProof = 'assets/images/credit/bukti bayar.png';
                                if (\Illuminate\Support\Facades\File::exists(public_path($defaultProof))) {
                                    $uniqueName = 'payment_'.$this->activity_id.'_'.$existingUser->id.'_'.uniqid().'.png';
                                    $newProofPath = 'assets/images/credit/'.$uniqueName;
                                    try {
                                        \Illuminate\Support\Facades\File::copy(public_path($defaultProof), public_path($newProofPath));
                                        $payment->proof_of_payment = $newProofPath;
                                        $payment->save();
                                    } catch (\Exception $e) {
                                    }
                                } else {
                                    // If default proof is also missing, try to find ANY proof from other users in this activity?
                                    // Or just leave it broken.
                                    // For now, assume default proof exists (we verified it).
                                }
                            }
                        }
                    } catch (\Exception $e) {
                    }

                    Log::debug('IMPORT SKIP_ALREADY_IN_ACTIVITY', [
                        'row_index' => $currentIndex,
                        'email' => $row['email'] ?? null,
                        'user_id' => $existingUser->id,
                        'activity_id' => $this->activity_id,
                    ]);

                    $this->skippedCount++;
                    DB::commit();

                    return null;
                }

                $activity = Activity::with('activeBatch')->find($this->activity_id);
                $batchId = $activity->activeBatch ? $activity->activeBatch->id : null;
                $initialStatus = ($activity && $activity->price <= 0) ? ActivityUser::STATUS_ACTIVE : ActivityUser::STATUS_VERIFICATION;

                // Update existing user data (exclude email & password)
                $userUpdates = [];
                if (! empty($row['name']) && $existingUser->name !== $row['name']) {
                    $userUpdates['name'] = $row['name'];
                }
                if (! empty($row['no_hp']) && $existingUser->phone !== $row['no_hp']) {
                    $userUpdates['phone'] = $row['no_hp'];
                }
                if (! empty($userUpdates)) {
                    $existingUser->update($userUpdates);
                }

                $profileData = [
                    'user_id' => $existingUser->id,
                    'no_hp' => ! empty($row['no_hp']) ? $row['no_hp'] : null,
                    'pekerjaan' => ! empty($row['pekerjaan']) ? $row['pekerjaan'] : null,
                    'instansi' => ! empty($row['instansi']) ? $row['instansi'] : null,
                    'jabatan' => ! empty($row['jabatan']) ? $row['jabatan'] : null,
                    'alamat' => ! empty($row['alamat']) ? $row['alamat'] : null,
                    'province_id' => ! empty($row['province_id']) ? $row['province_id'] : null,
                    'regency_id' => ! empty($row['regency_id']) ? $row['regency_id'] : null,
                    'district_id' => ! empty($row['district_id']) ? $row['district_id'] : null,
                    'jenis_kelamin' => $gender,
                ];
                $profileFields = $profileData;
                unset($profileFields['user_id']);
                if (count(array_filter($profileFields)) > 0) {
                    Profile::updateOrCreate(['user_id' => $existingUser->id], $profileData);
                }

                $existingUser->activities()->attach($this->activity_id, [
                    'status' => $initialStatus,
                    'activity_batch_id' => $batchId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
                if ($activity && $activity->price > 0 && $this->markPaid) {
                    $defaultProof = 'assets/images/credit/bukti bayar.png';
                    $proofPath = $defaultProof;

                    // Create a unique copy of the proof for this user to avoid shared file deletion issues
                    if (\Illuminate\Support\Facades\File::exists(public_path($defaultProof))) {
                        $uniqueName = 'payment_'.$this->activity_id.'_'.$existingUser->id.'_'.uniqid().'.png';
                        $newProofPath = 'assets/images/credit/'.$uniqueName;

                        try {
                            \Illuminate\Support\Facades\File::copy(public_path($defaultProof), public_path($newProofPath));
                            $proofPath = $newProofPath;
                        } catch (\Exception $e) {
                            \Log::warning('Failed to copy default payment proof: '.$e->getMessage());
                        }
                    }

                    Payment::create([
                        'user_id' => $existingUser->id,
                        'activity_id' => $this->activity_id,
                        'activity_batch_id' => $batchId,
                        'payment_method_id' => 1,
                        'amount' => $activity->price,
                        'proof_of_payment' => $proofPath,
                        'status' => 'approved',
                        'verified_by' => Auth::id(),
                        'verified_at' => now(),
                    ]);
                }
                $this->successCount++;
                $this->existingUserToActivityCount++;
                $this->pendingUserIds[] = $existingUser->id;

                Log::debug('IMPORT EXISTING_USER_ATTACHED', [
                    'row_index' => $currentIndex,
                    'email' => $row['email'] ?? null,
                    'user_id' => $existingUser->id,
                    'activity_id' => $this->activity_id,
                    'province_id' => $row['province_id'] ?? null,
                    'regency_id' => $row['regency_id'] ?? null,
                    'district_id' => $row['district_id'] ?? null,
                ]);

                DB::commit();

                return null;
            }

            $userData = [
                'name' => $row['name'],
                'email' => $row['email'],
                'password' => Hash::make($row['password'] ?? 'password123'),
            ];
            $user = User::create($userData);
            $this->newUserCount++;
            $this->successCount++;

            Log::debug('IMPORT NEW_USER_CREATED', [
                'row_index' => $currentIndex,
                'user_id' => $user->id,
                'email' => $user->email,
                'activity_id' => $this->activity_id,
                'province_id' => $row['province_id'] ?? null,
                'regency_id' => $row['regency_id'] ?? null,
                'district_id' => $row['district_id'] ?? null,
            ]);

            $profileData = [
                'user_id' => $user->id,
                'no_hp' => ! empty($row['no_hp']) ? $row['no_hp'] : null,
                'pekerjaan' => ! empty($row['pekerjaan']) ? $row['pekerjaan'] : null,
                'instansi' => ! empty($row['instansi']) ? $row['instansi'] : null,
                'jabatan' => ! empty($row['jabatan']) ? $row['jabatan'] : null,
                'alamat' => ! empty($row['alamat']) ? $row['alamat'] : null,
                'province_id' => ! empty($row['province_id']) ? $row['province_id'] : null,
                'regency_id' => ! empty($row['regency_id']) ? $row['regency_id'] : null,
                'district_id' => ! empty($row['district_id']) ? $row['district_id'] : null,
                'jenis_kelamin' => $gender,
            ];

            $profileFields = $profileData;
            unset($profileFields['user_id']);
            if (count(array_filter($profileFields)) > 0) {
                $profile = Profile::create($profileData);
                Log::debug('IMPORT PROFILE_CREATED', [
                    'row_index' => $currentIndex,
                    'profile_id' => $profile->id,
                    'user_id' => $profile->user_id,
                    'province_id' => $profile->province_id,
                    'regency_id' => $profile->regency_id,
                    'district_id' => $profile->district_id,
                    'gender_saved' => $profile->jenis_kelamin,
                ]);
                if ($profile && ! empty($gender) && $profile->jenis_kelamin !== $gender) {
                    Log::error('Field jenis_kelamin tidak tersimpan dengan benar', [
                        'expected' => $gender,
                        'actual' => $profile->jenis_kelamin,
                        'profile_id' => $profile->id,
                    ]);
                }
            }

            if ($this->activity_id) {
                $activity = Activity::with('activeBatch')->find($this->activity_id);
                if ($activity) {
                    $batchId = $activity->activeBatch ? $activity->activeBatch->id : null;

                    $price = $activity->price;
                    if ((int) $activity->price === 0) {
                        $price = 0;
                    } elseif ($activity->activeBatch && $activity->activeBatch->price !== null) {
                        $price = $activity->activeBatch->price;
                    }

                    $initialStatus = ($price <= 0) ? ActivityUser::STATUS_ACTIVE : ActivityUser::STATUS_VERIFICATION;

                    $user->activities()->attach($this->activity_id, [
                        'status' => $initialStatus,
                        'activity_batch_id' => $batchId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $this->pendingUserIds[] = $user->id;
                    if ($activity->price > 0 && $this->markPaid) {
                        $defaultProof = 'assets/images/credit/bukti bayar.png';
                        $proofPath = $defaultProof;

                        // Create a unique copy of the proof for this user to avoid shared file deletion issues
                        if (\Illuminate\Support\Facades\File::exists(public_path($defaultProof))) {
                            $uniqueName = 'payment_'.$this->activity_id.'_'.$user->id.'_'.uniqid().'.png';
                            $newProofPath = 'assets/images/credit/'.$uniqueName;

                            try {
                                \Illuminate\Support\Facades\File::copy(public_path($defaultProof), public_path($newProofPath));
                                $proofPath = $newProofPath;
                            } catch (\Exception $e) {
                                \Log::warning('Failed to copy default payment proof: '.$e->getMessage());
                            }
                        }

                        Payment::create([
                            'user_id' => $user->id,
                            'activity_id' => $this->activity_id,
                            'activity_batch_id' => $batchId,
                            'payment_method_id' => 1,
                            'amount' => $activity->price,
                            'proof_of_payment' => $proofPath,
                            'status' => 'approved',
                            'verified_by' => Auth::id(),
                            'verified_at' => now(),
                        ]);
                    }
                }
            }

            // Setelah create/update profile:
            if (isset($profile)) {
                // Bersihkan: tidak lagi mencatat debug setelah menyimpan profile
                if (empty($profile->jenis_kelamin)) {
                    \Log::warning('IMPORT: Jenis kelamin tidak masuk ke database', ['profile_id' => $profile->id, 'user_id' => $profile->user_id, 'expected_gender' => $gender]);
                }
            }

            DB::commit();

            return $user;
        } catch (\Exception $e) {
            DB::rollBack();
            $this->errors[] = $e->getMessage();

            return null;
        }
    }
}
