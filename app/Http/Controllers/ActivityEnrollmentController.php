<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\ActivityUser;
use App\Models\Payment;
use App\Models\PaymentMethod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ActivityEnrollmentController extends Controller
{
    public function enroll(Request $request, $activityId)
    {
        // Force JSON response if X-Requested-With is present or Accept is json
        $wantsJson = $request->wantsJson() || $request->ajax() || $request->header('X-Requested-With') === 'XMLHttpRequest';

        try {
            Log::info('ActivityEnrollmentController::enroll HIT', [
                'activity_id' => $activityId,
                'user_id' => auth()->id(),
                'method' => $request->method(),
                'url' => $request->fullUrl(),
            ]);
            
            Log::info('Enroll Request:', $request->all());
            Log::info('Enroll Request Headers:', $request->headers->all());
            Log::info('Enroll Request wantsJson: '.($request->wantsJson() ? 'true' : 'false'));
            Log::info('Enroll Request ajax: '.($request->ajax() ? 'true' : 'false'));

            // Ensure user is logged in
            if (! auth()->check()) {
                Log::warning('Enroll failed: User not logged in');
                if ($wantsJson) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Silakan login terlebih dahulu',
                    ], 401);
                }

                return redirect()->route('login');
            }

            $activity = Activity::find($activityId);
            if (! $activity) {
                Log::error('Enroll failed: Activity not found', ['id' => $activityId]);
                if ($wantsJson) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Kegiatan tidak ditemukan',
                    ], 404);
                }

                return redirect()->back()->with('error', 'Kegiatan tidak ditemukan');
            }

            // Check for active batch
            $targetBatchId = $request->input('batch_id');
            if ($targetBatchId) {
                $activeBatch = \App\Models\ActivityBatch::where('activity_id', $activity->id)
                    ->where('id', $targetBatchId)
                    ->first();
                
                // If requested batch not found, fall back to default active batch logic
                if (! $activeBatch) {
                    $activeBatch = $activity->activeBatch;
                }
            } else {
                $activeBatch = $activity->activeBatch;
            }
            
            $batchCount = $activity->batches()->count();
            $hasBatches = $batchCount > 0;
            
            Log::info('Enroll Batch Info', [
                'has_batches' => $hasBatches,
                'active_batch' => $activeBatch ? $activeBatch->toArray() : null,
                'batch_count' => $batchCount
            ]);

            // If batches exist but none is active, reject registration
            if ($hasBatches && ! $activeBatch) {
                $msg = $batchCount > 1 
                    ? 'Pendaftaran untuk kegiatan ini sedang ditutup (Tidak ada gelombang/sesi aktif).' 
                    : 'Pendaftaran untuk kegiatan ini sedang ditutup.';

                Log::warning('Enroll failed: No active batch', ['msg' => $msg]);

                if ($wantsJson) {
                    return response()->json([
                        'success' => false,
                        'message' => $msg,
                    ], 403);
                }

                return redirect()->back()->with('error', $msg);
            }

            $user = auth()->user();

            // Debug Validation Log
            $debugValidation = [];
            $debugValidation['user_id'] = $user->id;
            $debugValidation['initial_request'] = $request->except(['foto', 'foto_file', 'password']); // Exclude binary/sensitive

            if ($request->isMethod('post')) {
                $fieldMap = [
                    'email' => ['source' => 'user', 'field' => 'email'],
                    'name' => ['source' => 'user', 'field' => 'name'],
                    'nama_lengkap' => ['source' => 'user', 'field' => 'name'],
                    'no_hp' => ['source' => 'profile', 'field' => 'no_hp'],
                    'nik' => ['source' => 'profile', 'field' => 'nik'],
                    'pekerjaan' => ['source' => 'profile', 'field' => 'pekerjaan'],
                    'instansi' => ['source' => 'profile', 'field' => 'instansi'],
                    'jabatan' => ['source' => 'profile', 'field' => 'jabatan'],
                    'alamat' => ['source' => 'profile', 'field' => 'alamat'],
                    'jenis_kelamin' => ['source' => 'profile', 'field' => 'jenis_kelamin'],
                    'tempat_lahir' => ['source' => 'profile', 'field' => 'birth_place'],
                    'tgl_lahir' => ['source' => 'profile', 'field' => 'birth_date'],
                    'foto' => ['source' => 'profile', 'field' => 'foto'],
                    'foto_file' => ['source' => 'profile', 'field' => 'foto'], // Handle both keys

                    // Aliases
                    'phone' => ['source' => 'profile', 'field' => 'no_hp'],
                    'gender' => ['source' => 'profile', 'field' => 'jenis_kelamin'],
                    'birth_place' => ['source' => 'profile', 'field' => 'birth_place'],
                    'birth_date' => ['source' => 'profile', 'field' => 'birth_date'],
                    'provinsi' => ['source' => 'profile', 'field' => 'province_id'],
                    'kabupaten' => ['source' => 'profile', 'field' => 'regency_id'],
                    'kecamatan' => ['source' => 'profile', 'field' => 'district_id'],
                    'id_provinsi' => ['source' => 'profile', 'field' => 'province_id'],
                    'id_kabupaten' => ['source' => 'profile', 'field' => 'regency_id'],
                    'id_kecamatan' => ['source' => 'profile', 'field' => 'district_id'],
                    'Provinsi' => ['source' => 'profile', 'field' => 'province_id'],
                    'id kabupaten' => ['source' => 'profile', 'field' => 'regency_id'],
                    'Kecamantan' => ['source' => 'profile', 'field' => 'district_id'],
                    'province id' => ['source' => 'profile', 'field' => 'province_id'],
                    'province' => ['source' => 'profile', 'field' => 'province_id'],
                    'regency id' => ['source' => 'profile', 'field' => 'regency_id'],
                    'regency' => ['source' => 'profile', 'field' => 'regency_id'],
                    'district id' => ['source' => 'profile', 'field' => 'district_id'],
                    'district' => ['source' => 'profile', 'field' => 'district_id'],
                    'city' => ['source' => 'profile', 'field' => 'regency_id'],
                    'kota kabupaten id' => ['source' => 'profile', 'field' => 'regency_id'],
                    'kecamatan id' => ['source' => 'profile', 'field' => 'district_id'],
                    'jenis kelamin (l/p)' => ['source' => 'profile', 'field' => 'jenis_kelamin'],
                    'position' => ['source' => 'profile', 'field' => 'jabatan'],
                    'institution' => ['source' => 'profile', 'field' => 'instansi'],
                    'occupation' => ['source' => 'profile', 'field' => 'pekerjaan'],
                    'category' => ['source' => 'profile', 'field' => 'pekerjaan'],
                    'address' => ['source' => 'profile', 'field' => 'alamat'],
                    'photo' => ['source' => 'profile', 'field' => 'foto'],
                ];

                $userData = [];
                $profileData = [];
                $customData = $request->input('custom_data', []);
                if (! is_array($customData)) {
                    $customData = [];
                }

                foreach ($request->all() as $key => $value) {
                    if (in_array($key, ['_token', '_method', 'activity_id', 'custom_data', 'file', 'foto', 'foto_file'])) {
                        continue;
                    }

                    $normalizedKey = strtolower($key);
                    $found = false;

                    // Check direct match
                    if (isset($fieldMap[$key])) {
                        $config = $fieldMap[$key];
                        if ($config['source'] === 'user') {
                            $userData[$config['field']] = $value;
                        } else {
                            $profileData[$config['field']] = $value;
                        }
                        $found = true;
                    }
                    // Check normalized match
                    elseif (isset($fieldMap[$normalizedKey])) {
                        $config = $fieldMap[$normalizedKey];
                        if ($config['source'] === 'user') {
                            $userData[$config['field']] = $value;
                        } else {
                            $profileData[$config['field']] = $value;
                        }
                        $found = true;
                    }

                    if (! $found && ! empty($value)) {
                        $customData[$key] = $value;
                    }
                }

                if ($request->hasFile('foto_file') || $request->hasFile('foto')) {
                    $file = $request->file('foto_file') ?? $request->file('foto');
                    if ($file && $file->isValid()) {
                        // Use Storage facade
                        $path = $file->store('profile-photos', 'public');
                        $profileData['foto'] = $path;
                    }
                }

                if (! empty($userData)) {
                    $user->update($userData);
                    $debugValidation['user_updated'] = $userData;
                }
                if (! empty($profileData)) {
                    $user->profile()->updateOrCreate(['user_id' => $user->id], $profileData);
                    $debugValidation['profile_updated'] = $profileData;
                }

                $request->merge(['custom_data' => $customData]);
                $debugValidation['custom_data_merged'] = $customData;
            }
            $user->refresh(); // Refresh to get updated data

            if (! $user->relationLoaded('profile')) {
                $user->unsetRelation('profile')->load('profile');
            } else {
                 $user->refresh();
            }

            $debugValidation['user_after_update'] = $user->toArray();
            if ($user->profile) {
                $debugValidation['profile_after_update'] = $user->profile->toArray();
            }

            $customData = $request->input('custom_data', []);
            if (is_array($customData) && ! empty($customData)) {
                $profile = $user->profile;
                if (! $profile) {
                    $profile = $user->profile()->create(['user_id' => $user->id]);
                }

                $existingAdditional = $profile->additional_data ?? [];
                if (is_string($existingAdditional)) {
                    $decodedExisting = json_decode($existingAdditional, true);
                    if (json_last_error() === JSON_ERROR_NONE && is_array($decodedExisting)) {
                        $existingAdditional = $decodedExisting;
                    } else {
                        $existingAdditional = [];
                    }
                }
                if (! is_array($existingAdditional)) {
                    $existingAdditional = [];
                }

                $mergedAdditional = array_merge($existingAdditional, $customData);
                if (json_encode($existingAdditional) !== json_encode($mergedAdditional)) {
                    $profile->additional_data = $mergedAdditional;
                    $profile->save();
                }
            }

            // Unified Profile Validation
            $missingFields = [];
            $mandatoryFields = $activity->mandatory_profile_fields ?? [];
            $template = $activity->import_template;
            
            $customKeys = [];
            if ($template) {
                // Map for standard fields normalization
                $map = [
                    'email' => 'email',
                    'name' => 'name',
                    'nama_lengkap' => 'name',
                    'no_hp' => 'no_hp',
                    'nik' => 'nik',
                    'pekerjaan' => 'pekerjaan',
                    'instansi' => 'instansi',
                    'jabatan' => 'jabatan',
                    'alamat' => 'alamat',
                    'jenis_kelamin' => 'jenis_kelamin',
                    'tempat_lahir' => 'birth_place',
                    'tgl_lahir' => 'birth_date',
                    'foto' => 'foto',
                    'phone' => 'no_hp',
                    'gender' => 'jenis_kelamin',
                    'birth_place' => 'birth_place',
                    'birth_date' => 'birth_date',
                    'provinsi' => 'province_id',
                    'kabupaten' => 'regency_id',
                    'kecamatan' => 'district_id',
                    'province' => 'province_id',
                    'regency' => 'regency_id',
                    'district' => 'district_id',
                    'city' => 'regency_id',
                    'address' => 'alamat',
                    'photo' => 'foto',
                    'position' => 'jabatan',
                    'institution' => 'instansi',
                    'occupation' => 'pekerjaan',
                ];

                $cols = array_map('trim', explode(',', $template));
                foreach ($cols as $col) {
                    if (str_ends_with($col, '*')) {
                        $rawKey = trim(substr($col, 0, -1));
                        // Normalize key
                        $key = preg_replace('/^\d+\./', '', $rawKey);
                        $key = strtolower(trim($key));
                        
                        // Handle prefixes
                        if (str_starts_with($key, 'user:')) $key = substr($key, 5);
                        if (str_starts_with($key, 'profile:')) $key = substr($key, 8);
                        
                        if ($key === 'password') continue;

                        // Try to map to DB key
                        if (isset($map[$key])) {
                            $customKeys[] = $map[$key];
                        } elseif (isset($map[str_replace(' ', '_', $key)])) {
                            $customKeys[] = $map[str_replace(' ', '_', $key)];
                        } else {
                            $customKeys[] = $key;
                        }
                    }
                }
            }

            // Merge template keys with mandatory fields + default mandiri requirements
            $defaultRequired = ['email', 'foto'];
            $allRequiredKeys = array_unique(array_merge($defaultRequired, $mandatoryFields, $customKeys));
            
            // Use unified method from User model
            $user->load('profile');
            $missingProfileData = $user->getIncompleteProfileData($allRequiredKeys);
            $missingFields = array_column($missingProfileData, 'label');
            $missingFieldKeys = array_column($missingProfileData, 'key');
            $debugPayload = config('app.debug') ? ['debug_validation' => $debugValidation] : [];

            if (! empty($missingFields)) {
                $debugValidation['missing_fields_final'] = $missingFields;
                Log::info('Validation Failed: Missing fields', $debugValidation);
                
                $msg = 'Profil Anda belum lengkap. Lengkapi data berikut: '.implode(', ', $missingFields);

                if ($wantsJson) {
                    return response()->json(array_merge([
                        'success' => false,
                        'message' => $msg,
                        'missing_fields' => $missingFields, // Labels for display
                        'missing_data' => $missingProfileData, // Full structure for frontend logic
                    ], $debugPayload), 422);
                }

                return redirect()->back()
                    ->with('error', $msg)
                    ->with('missing_profile_fields', $missingFieldKeys);
            }

            // Validate Custom Activity Fields
            if ($activity->custom_fields && is_array($activity->custom_fields)) {
                $missingCustomFields = [];
                $currentCustomData = $request->input('custom_data', []);
                
                foreach ($activity->custom_fields as $field) {
                    // Check if required field is missing or empty
                    if (!empty($field['is_required'])) {
                        $key = $field['key'] ?? null;
                        if ($key && (
                            !isset($currentCustomData[$key]) || 
                            $currentCustomData[$key] === '' || 
                            $currentCustomData[$key] === null
                        )) {
                            $missingCustomFields[] = $field['label'] ?? $key;
                        }
                    }
                }

                if (!empty($missingCustomFields)) {
                    $msg = 'Data tambahan berikut wajib diisi: ' . implode(', ', $missingCustomFields);
                    if ($wantsJson) {
                        return response()->json([
                            'success' => false,
                            'message' => $msg,
                            'missing_custom_fields' => $missingCustomFields
                        ], 422);
                    }
                    return redirect()->back()->with('error', $msg);
                }
            }

            // Check if user is already enrolled in this batch (or activity if no batch)
            $existingEnrollment = ActivityUser::where('user_id', auth()->id())
                ->where('activity_id', $activityId);

            if ($activeBatch) {
                $existingEnrollment->where('activity_batch_id', $activeBatch->id);
            } else {
                $existingEnrollment->whereNull('activity_batch_id');
            }

            if ($existingEnrollment->exists()) {
                $enrollment = $existingEnrollment->first();

                // If status is PENDING (3) or VERIFICATION (0), allow to proceed to payment
                if (in_array((int)$enrollment->status, [ActivityUser::STATUS_PENDING, ActivityUser::STATUS_VERIFICATION])) {
                    
                    // RECOVERY: Ensure payment record exists if missing
                    // Fix: If activity price is explicitly 0, treat as free (Master Override)
                    if ((int)$activity->price === 0) {
                        $price = 0;
                    } else {
                        $price = $activity->price;
                        if ($activeBatch && $activeBatch->price !== null) {
                            $price = $activeBatch->price;
                        }
                    }

                    if ($price > 0) {
                        $paymentData = [
                            'user_id' => auth()->id(),
                            'activity_id' => $activityId,
                        ];
                        if ($activeBatch) {
                            $paymentData['activity_batch_id'] = $activeBatch->id;
                        } else {
                            $paymentData['activity_batch_id'] = null;
                        }

                        // Ensure payment exists to prevent blank payment page
                        Payment::firstOrCreate(
                            $paymentData,
                            [
                                'payment_method_id' => PaymentMethod::first()->id ?? 1,
                                'amount' => $price,
                                'proof_of_payment' => 'imported', // Default filler
                                'status' => 'pending',
                                'notes' => 'Generated during re-enrollment check',
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]
                        );

                        $routeParams = ['activity' => $activityId];
                        if ($activeBatch) {
                            $routeParams['batch_id'] = $activeBatch->id;
                        }

                        $redirectUrl = route('payments.create', $routeParams);
                        if (method_exists($activity, 'hasAutomaticPayment') && $activity->hasAutomaticPayment()) {
                            $redirectUrl = route('midtrans.payment.create', $routeParams);
                        }
                        
                        if ($wantsJson) {
                            return response()->json(array_merge([
                                'success' => true,
                                'message' => 'Melanjutkan ke pembayaran...',
                                'redirect_url' => $redirectUrl,
                            ], $debugPayload));
                        }

                        return redirect($redirectUrl);
                    } else {
                        // Free activity - Ensure status is ACTIVE
                        if ($enrollment->status != ActivityUser::STATUS_ACTIVE) {
                            $enrollment->status = ActivityUser::STATUS_ACTIVE;
                            $enrollment->save();
                        }
                        
                        $msg = 'Anda sudah terdaftar dalam kegiatan ini';
                        if ($wantsJson) {
                            return response()->json(array_merge([
                                'success' => true,
                                'message' => $msg,
                                'redirect_url' => route('activity.show', $activity->id, false),
                            ], $debugPayload));
                        }
                        return redirect()->route('activity.show', $activity->id)->with('success', $msg);
                    }
                }

                $msg = isset($batchCount) && $batchCount > 1 
                    ? 'Anda sudah terdaftar dalam kegiatan ini (Sesi/Batch ini)' 
                    : 'Anda sudah terdaftar dalam kegiatan ini';
                
                Log::warning('Enroll failed: Already enrolled', ['msg' => $msg]);

                if ($wantsJson) {
                    return response()->json(array_merge([
                        'success' => false,
                        'message' => $msg,
                    ], $debugPayload), 422);
                }

                return redirect()->back()->with('error', $msg);
            }

            $activityUser = new ActivityUser();
            $tableName = $activityUser->getTable();

            // Calculate price first to determine status
            // Fix: If activity price is explicitly 0, treat as free (Master Override)
            if ((int)$activity->price === 0) {
                $price = 0;
            } else {
                $price = $activity->price;
                if ($activeBatch && $activeBatch->price !== null) {
                    $price = $activeBatch->price;
                }
            }

            $payload = [
                'user_id' => auth()->id(),
                'activity_id' => $activityId,
                'activity_batch_id' => $activeBatch ? $activeBatch->id : null,
            ];

            if (Schema::hasColumn($tableName, 'status')) {
                // If paid, status is PENDING (waiting for payment)
                // If free, status is ACTIVE
                if ($price > 0) {
                    $payload['status'] = ActivityUser::STATUS_PENDING;
                } else {
                    $payload['status'] = ActivityUser::STATUS_ACTIVE;
                }
            }

            if (Schema::hasColumn($tableName, 'card_status')) {
                $payload['card_status'] = 'pending';
            }

            if (Schema::hasColumn($tableName, 'custom_data')) {
                $payload['custom_data'] = $request->input('custom_data', []);
            }

            $enrollment = null;
            
            // Only create ActivityUser immediately if FREE
            if ($price == 0) {
                $enrollment = ActivityUser::create($payload);
                $debugValidation['enrollment_created'] = $enrollment->toArray();
                Log::info('Enrollment Success (Free)', $debugValidation);
            } else {
                Log::info('Enrollment Pending Payment (Paid) - Skipping ActivityUser creation until payment', $debugValidation);
            }

            $userId = auth()->id();

            Log::info('Enrollment Price Check - DEBUG', [
                'activity_price' => $activity->price,
                'batch_price' => $activeBatch ? $activeBatch->price : 'NO BATCH',
                'batch_price_is_null' => $activeBatch ? is_null($activeBatch->price) : 'N/A',
                'final_price' => $price
            ]);

            if ($price > 0) {
                $paymentData = [
                    'user_id' => $userId,
                    'activity_id' => $activityId,
                ];

                if ($activeBatch) {
                    $paymentData['activity_batch_id'] = $activeBatch->id;
                } else {
                    $paymentData['activity_batch_id'] = null;
                }

                // Prepare notes with custom_data for persistence
                $notesData = [
                    'source' => 'enrollment_auto',
                    'original_notes' => 'Otomatis saat daftar activity'
                ];
                
                if (isset($payload['custom_data'])) {
                    $notesData['custom_data'] = $payload['custom_data'];
                }

                $payment = Payment::firstOrCreate(
                    $paymentData,
                    [
                        'payment_method_id' => PaymentMethod::first()->id ?? 1,
                        'amount' => $price,
                        'proof_of_payment' => 'imported',
                        'status' => 'pending',
                        'notes' => json_encode($notesData),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
                
                // If payment existed, update notes to ensure custom_data is saved
                if ($payment->wasRecentlyCreated === false) {
                    $currentNotes = json_decode($payment->notes, true);
                    if (!is_array($currentNotes)) {
                        $currentNotes = ['original_notes' => $payment->notes];
                    }
                    if (isset($payload['custom_data'])) {
                        $currentNotes['custom_data'] = $payload['custom_data'];
                    }
                    $payment->notes = json_encode($currentNotes);
                    $payment->save();
                }

                Log::info('Payment record created/checked:', $payment->toArray());

                $routeParams = ['activity' => $activityId];
                if ($activeBatch) {
                    $routeParams['batch_id'] = $activeBatch->id;
                }

                $redirectUrl = route('payments.create', $routeParams);
                if (method_exists($activity, 'hasAutomaticPayment') && $activity->hasAutomaticPayment()) {
                    $redirectUrl = route('midtrans.payment.create', $routeParams);
                }
                
                Log::info('Enrollment Redirecting to Payment', ['url' => $redirectUrl]);

                if ($wantsJson) {
                    return response()->json(array_merge([
                        'success' => true,
                        'message' => 'Berhasil mendaftar kegiatan. Silakan lanjutkan pembayaran.',
                        'redirect_url' => $redirectUrl,
                    ], $debugPayload));
                }

                return redirect($redirectUrl)->with('success', 'Berhasil mendaftar kegiatan. Silakan lanjutkan pembayaran.');
            }

            if ($wantsJson) {
                return response()->json(array_merge([
                    'success' => true,
                    'message' => 'Berhasil mendaftar kegiatan',
                    'redirect_url' => route('activity.detail', $activity->id, false),
                ], $debugPayload));
            }

            return redirect()->route('activity.detail', $activity->id)->with('success', 'Berhasil mendaftar kegiatan');

        } catch (\Throwable $e) {
            // Handle Duplicate Entry specifically
            if ($e instanceof \Illuminate\Database\QueryException && isset($e->errorInfo[1]) && $e->errorInfo[1] == 1062) {
                Log::warning('Enroll failed: Duplicate entry detected');
                if ($wantsJson) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Anda sudah terdaftar dalam kegiatan ini',
                    ], 422);
                }

                return redirect()->back()->with('error', 'Anda sudah terdaftar dalam kegiatan ini');
            }

            Log::error('Enrollment System Error: '.$e->getMessage());
            Log::error($e->getTraceAsString());

            if ($wantsJson) {
                // Return detailed error in debug mode, generic in production
                $message = config('app.debug')
                    ? 'System Error: '.$e->getMessage()
                    : 'Terjadi kesalahan sistem saat memproses pendaftaran.';

                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'debug_error' => $e->getMessage(), // Always send this for now to help debug the user issue
                ], 500);
            }

            return redirect()->back()->with('error', 'Terjadi kesalahan saat mendaftar');
        }
    }
}
