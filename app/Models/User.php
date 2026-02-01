<?php

namespace App\Models;

use App\Models\Payment;
use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasCustomUid, HasFactory, Notifiable;

    public $incrementing = false;

    protected $keyType = 'string';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'avatar',
        'subdomain',
        'role',
        'google_id',
        'subscription_id',
        'email_verified_at',
        'email_verification_token',
        'page_title',
        'page_description',
        'subdomain_logo',
        'logo_size',
        'hero_background',
        'hero_opacity',
        'hero_text_color',
        'hero_title_color',
        'hero_description_color',
    ];

    // Relasi ke activities melalui activitiusers
    public function activities()
    {
        return $this->belongsToMany(Activity::class, 'activity_users')
            ->withPivot(['status', 'created_at'])
            ->withTimestamps();
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    // Relasi ke activity records (catatan kehadiran)
    public function attendanceRecords()
    {
        return $this->hasMany(ActivityRecord::class);
    }

    /**
     * Get incomplete profile fields for the user with detailed info.
     *
     * @param  array  $mandatoryFields  List of required field keys
     * @return array List of missing field data [{key, label, type}]
     */
    public function getIncompleteProfileData(array $mandatoryFields = []): array
    {
        $missing = [];

        $fieldConfig = [
            'name' => ['label' => 'Nama Lengkap', 'type' => 'text'],
            'email' => ['label' => 'Email', 'type' => 'email'],
            'no_hp' => ['label' => 'No HP / WhatsApp', 'type' => 'tel'],
            'nik' => ['label' => 'NIK', 'type' => 'number'],
            'instansi' => ['label' => 'Instansi', 'type' => 'text'],
            'pekerjaan' => ['label' => 'Pekerjaan', 'type' => 'text'],
            'jabatan' => ['label' => 'Jabatan', 'type' => 'text'],
            'province_id' => ['label' => 'Provinsi', 'type' => 'select'],
            'regency_id' => ['label' => 'Kabupaten/Kota', 'type' => 'select'],
            'district_id' => ['label' => 'Kecamatan', 'type' => 'select'],
            'alamat' => ['label' => 'Alamat Lengkap', 'type' => 'textarea'],
            'jenis_kelamin' => ['label' => 'Jenis Kelamin', 'type' => 'select_gender'],
            'birth_place' => ['label' => 'Tempat Lahir', 'type' => 'text'],
            'birth_date' => ['label' => 'Tanggal Lahir', 'type' => 'date'],
            'foto' => ['label' => 'Foto Profil', 'type' => 'file'],
        ];

        // Default mandatory fields for self-registration (pendaftar mandiri):
        // email + foto profil (name depends on template/setting)
        $defaultMandatoryFields = ['email', 'foto'];

        // If no mandatory fields specified, use the defaults
        if (empty($mandatoryFields)) {
            $mandatoryFields = $defaultMandatoryFields;
        }

        $profile = $this->profile;

        foreach ($mandatoryFields as $field) {
            $isMissing = false;

            switch ($field) {
                case 'name':
                    if (! trim((string) $this->name)) {
                        $isMissing = true;
                    }
                    break;
                case 'email':
                    if (! trim((string) $this->email)) {
                        $isMissing = true;
                    }
                    break;
                case 'no_hp':
                    $profileHp = $profile ? trim((string) $profile->no_hp) : '';
                    $userPhone = trim((string) $this->phone);
                    if (! $profileHp && ! $userPhone) {
                        $isMissing = true;
                    }
                    break;
                case 'foto':
                    if (! $profile) {
                        $isMissing = true;
                        break;
                    }
                    $foto = trim((string) $profile->foto);
                    // Only mark absolute missing if empty/null
                    // Frontend has stricter logic to force update if default-profile
                    if ($foto === '') {
                        $isMissing = true;
                    }
                    break;
                default:
                    // Handle special syntax: Name|dropdown:Options or Name:Options
                    $effectiveKey = $field;
                    if (str_contains($effectiveKey, '|')) {
                        $effectiveKey = explode('|', $effectiveKey)[0];
                    } elseif (str_contains($effectiveKey, ':')) {
                        $effectiveKey = explode(':', $effectiveKey)[0];
                    }

                    $val = $profile->$effectiveKey ?? null;

                    // Check additional_data if not found in main attributes
                    if (empty($val) && $profile && isset($profile->additional_data) && is_array($profile->additional_data)) {
                        // Check exact key
                        if (isset($profile->additional_data[$effectiveKey])) {
                            $val = $profile->additional_data[$effectiveKey];
                        }

                        // Check lowercase key (frontend normalizes to lowercase)
                        elseif (isset($profile->additional_data[strtolower($effectiveKey)])) {
                            $val = $profile->additional_data[strtolower($effectiveKey)];
                        }
                        // Check original full key (modifier included)
                        elseif (isset($profile->additional_data[$field])) {
                            $val = $profile->additional_data[$field];
                        }

                        // Fuzzy search for keys like "Key|modifier" - Fix for 422 error when keys mismatch in case/suffix
                        if (empty($val)) {
                             foreach ($profile->additional_data as $k => $v) {
                                 $kClean = $k;
                                 if (str_contains($k, '|')) $kClean = explode('|', $k)[0];
                                 elseif (str_contains($k, ':')) $kClean = explode(':', $k)[0];
                                 
                                 // Normalize: lowercase and replace underscores with spaces
                                 $kNormalized = str_replace('_', ' ', strtolower(trim($kClean)));
                                 $keyNormalized = str_replace('_', ' ', strtolower(trim($effectiveKey)));
                                 
                                 if ($kNormalized === $keyNormalized) {
                                     $val = $v;
                                     break;
                                 }
                             }
                        }
                    }

                    if (! $profile || ! trim((string) ($val ?? ''))) {
                        $isMissing = true;
                    }
                    break;
            }

            if ($isMissing) {
                $label = $field;
                if (str_contains($label, '|')) {
                    $label = explode('|', $label)[0];
                } elseif (str_contains($label, ':')) {
                    $label = explode(':', $label)[0];
                }
                $config = $fieldConfig[$field] ?? ['label' => ucwords(str_replace('_', ' ', $label)), 'type' => 'text'];
                $missing[] = array_merge(['key' => $field], $config);
            }
        }

        return $missing;
    }

    /**
     * Get incomplete profile fields for the user.
     *
     * @param  array  $mandatoryFields  List of required field keys
     * @return array List of missing field labels
     */
    public function getIncompleteProfileFields(array $mandatoryFields = []): array
    {
        $data = $this->getIncompleteProfileData($mandatoryFields);

        return array_map(function ($item) {
            return $item['key'];
        }, $data);
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        //
    ];

    protected $appends = ['profile_photo', 'profile_photo_url', 'subdomain_logo_url', 'hero_background_url'];

    public function getProfilePhotoUrlAttribute()
    {
        if ($this->profile && $this->profile->foto) {
            return $this->profile->foto_url;
        }

        if ($this->avatar) {
            if (str_starts_with($this->avatar, 'http')) {
                return $this->avatar;
            }
            if (\Illuminate\Support\Facades\Storage::disk('public')->exists($this->avatar)) {
                return \Illuminate\Support\Facades\Storage::url($this->avatar);
            }
        }

        return asset('assets/images/profilefoto/default-profile.png');
    }

    public function getSubdomainLogoUrlAttribute()
    {
        if (! $this->subdomain_logo) {
            return null;
        }

        // Check if it's a storage path (contains slash or starts with subdomain_logos)
        if (str_contains($this->subdomain_logo, '/') || str_starts_with($this->subdomain_logo, 'subdomain_logos')) {
            return \Illuminate\Support\Facades\Storage::url($this->subdomain_logo);
        }

        // Fallback to legacy path
        $path = public_path('assets/images/creatorlogo/'.$this->subdomain_logo);
        if (file_exists($path)) {
            return asset('assets/images/creatorlogo/'.$this->subdomain_logo);
        }

        // Default to storage
        return \Illuminate\Support\Facades\Storage::url($this->subdomain_logo);
    }

    public function getHeroBackgroundUrlAttribute()
    {
        if (! $this->hero_background) {
            return null;
        }

        // Check if it's a storage path (contains slash or starts with hero_backgrounds)
        if (str_contains($this->hero_background, '/') || str_starts_with($this->hero_background, 'hero_backgrounds')) {
            return \Illuminate\Support\Facades\Storage::url($this->hero_background);
        }

        // Fallback to manual path
        $path = public_path('assets/images/herobackground/'.$this->hero_background);
        if (file_exists($path)) {
            return asset('assets/images/herobackground/'.$this->hero_background);
        }

        // Default to storage
        return \Illuminate\Support\Facades\Storage::url($this->hero_background);
    }

    // Di User model
    public function profile()
    {
        return $this->hasOne(Profile::class);
    }

    public function subscription()
    {
        return $this->belongsTo(Subscription::class);
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)->where('status', 'active')
            ->where('end_date', '>=', now());
    }

    public function hasActiveSubscription()
    {
        return $this->activeSubscription()->exists();
    }

    /**
     * Get the highest tier active subscription (by plan sort_order, fallback to price).
     * Useful when a user has multiple active subscriptions at the same time.
     */
    public function getHighestActiveSubscription()
    {
        // Fetch all active, non-expired subscriptions with their plans
        $subs = $this->subscriptions()
            ->where('status', 'active')
            ->where('end_date', '>=', now())
            ->with('plan')
            ->get();

        if ($subs->isEmpty()) {
            return null;
        }

        // Sort by plan sort_order desc; fallback to price if sort_order is null
        $sorted = $subs->sortByDesc(function ($s) {
            $plan = $s->plan;
            if (! $plan) {
                return 0;
            }
            $sortOrder = is_null($plan->sort_order) ? 0 : (int) $plan->sort_order;
            $price = (float) ($plan->price ?? 0);

            // Combine to ensure deterministic ordering
            return ($sortOrder * 1000000) + $price;
        });

        return $sorted->first();
    }

    /**
     * Get subscription plan limits for creator
     * Returns limits based on subscription plan or free tier limits
     */
    public function getSubscriptionLimits()
    {
        // Use highest active subscription if multiple are active
        $activeSubscription = $this->getHighestActiveSubscription();

        if ($activeSubscription && $activeSubscription->plan) {
            $plan = $activeSubscription->plan;

            // Ensure features is an array
            $features = $plan->features;
            if (is_string($features)) {
                $features = json_decode($features, true);
            }
            if (! is_array($features)) {
                $features = [];
            }

            $limits = [
                'max_activities' => $plan->max_activities,
                'max_users' => $plan->max_users,
                'max_news' => $plan->max_news,
                'max_participants_per_activity' => $plan->max_participants_per_activity,
                'max_committees_per_activity' => $plan->max_committees_per_activity,
                'has_analytics' => $plan->has_analytics,
                'has_auto_payment' => in_array('Pembayaran otomatis', $features),
                'has_qr_attendance' => in_array('Absen berbasis QR code', $features),
                'has_digital_cards' => in_array('Manajemen Kartu Digital', $features),
                'has_digital_certificates' => in_array('Manajemen Sertifikat Digital', $features),
                'manual_activities_limit' => $features['manual_activities_limit'] ?? null,
            ];

            $planName = strtolower(trim((string) ($plan->name ?? '')));
            if (str_contains($planName, 'basic')) {
                $limits['has_auto_payment'] = true;
                $limits['max_activities'] = null; // unlimited total kegiatan
                $limits['free_activities_quota'] = 5; // maksimal 5 kegiatan gratis
                $limits['free_max_participants_per_activity'] = 25; // peserta untuk kegiatan gratis
                $limits['auto_max_participants_per_activity'] = null; // unlimited untuk otomatis/berbayar
            }

            return $limits;
        }

        // Free tier limits for creator without subscription (unlimited per kebijakan baru)
        $financial = \App\Models\FinancialSetting::current();
        $creatorFree = is_array($financial->discount_rules) ? ($financial->discount_rules['creator_free'] ?? []) : [];

        return [
            'max_activities' => null,
            'max_users' => null,
            'max_news' => null,
            'max_participants_per_activity' => $creatorFree['max_participants_per_activity'] ?? null,
            'max_committees_per_activity' => null,
            'has_analytics' => false,
            'has_auto_payment' => true,
            'has_qr_attendance' => false,
            'has_digital_cards' => false,
            'has_digital_certificates' => false,
            'manual_activities_limit' => $creatorFree['manual_activities_limit'] ?? 0,
        ];
    }

    /**
     * Check if creator can create more activities
     */
    public function canCreateActivity(): array
    {
        // Admin/Superadmin can always create
        if ($this->isAdmin() || $this->isSuperAdmin()) {
            return ['allowed' => true, 'message' => ''];
        }

        // Only check for creators
        if (! $this->isCreator()) {
            return ['allowed' => false, 'message' => 'Hanya creator yang dapat membuat acara.'];
        }

        $limits = $this->getSubscriptionLimits();
        $currentActivityCount = Activity::where('user_id', $this->id)->count();

        if ($limits['max_activities'] !== null && $currentActivityCount >= $limits['max_activities']) {
            return [
                'allowed' => false,
                'message' => "Anda telah mencapai batas maksimal {$limits['max_activities']} acara. Silakan berlangganan untuk membuat lebih banyak acara.",
            ];
        }

        return ['allowed' => true, 'message' => ''];
    }

    /**
     * Check if activity can accept more participants
     */
    public function canAcceptParticipants(Activity $activity, $currentParticipantCount): array
    {
        // Admin/Superadmin can always accept
        if ($this->isAdmin() || $this->isSuperAdmin()) {
            return ['allowed' => true, 'message' => ''];
        }

        // Only check for creators
        if (! $this->isCreator() || $activity->user_id !== $this->id) {
            return ['allowed' => true, 'message' => '']; // Not creator's activity, no limit
        }

        $limits = $this->getSubscriptionLimits();

        $isFreeEvent = (float) ($activity->price ?? 0) <= 0.0;
        if ($isFreeEvent) {
            $cap = $limits['free_max_participants_per_activity'] ?? ($limits['max_participants_per_activity'] ?? null);
            if ($cap !== null && $currentParticipantCount >= $cap) {
                return [
                    'allowed' => false,
                    'message' => "Acara ini telah mencapai batas maksimal {$cap} peserta (acara gratis).",
                ];
            }
        } else {
            $cap = $limits['auto_max_participants_per_activity'] ?? ($limits['max_participants_per_activity'] ?? null);
            if ($cap !== null && $currentParticipantCount >= $cap) {
                return [
                    'allowed' => false,
                    'message' => "Acara ini telah mencapai batas maksimal {$cap} peserta.",
                ];
            }
        }

        return ['allowed' => true, 'message' => ''];
    }

    /**
     * Check if creator can create more news
     */
    public function canCreateNews(): array
    {
        // Admin/Superadmin can always create
        if ($this->isAdmin() || $this->isSuperAdmin()) {
            return ['allowed' => true, 'message' => ''];
        }

        // Only check for creators
        if (! $this->isCreator()) {
            return ['allowed' => true, 'message' => '']; // Regular users can create news
        }

        $limits = $this->getSubscriptionLimits();

        // Jika max_news adalah null, berarti unlimited
        if ($limits['max_news'] === null) {
            return ['allowed' => true, 'message' => ''];
        }

        // Hitung berdasarkan author_id saja untuk kompatibilitas skema saat ini
        $currentNewsCount = \App\Models\News::where('author_id', $this->id)->count();

        if ($currentNewsCount >= $limits['max_news']) {
            return [
                'allowed' => false,
                'message' => "Anda telah mencapai batas maksimal {$limits['max_news']} berita. Silakan berlangganan untuk membuat lebih banyak berita.",
            ];
        }

        return ['allowed' => true, 'message' => ''];
    }

    /**
     * Check if activity can accept more committee members
     */
    public function canAddCommittee(Activity $activity, $currentCommitteeCount): array
    {
        // Admin/Superadmin can always add
        if ($this->isAdmin() || $this->isSuperAdmin()) {
            return ['allowed' => true, 'message' => ''];
        }

        // Only check for creators
        if (! $this->isCreator() || $activity->user_id !== $this->id) {
            return ['allowed' => true, 'message' => '']; // Not creator's activity, no limit
        }

        $limits = $this->getSubscriptionLimits();

        // Jika max_committees_per_activity adalah null, berarti unlimited
        if ($limits['max_committees_per_activity'] === null) {
            return ['allowed' => true, 'message' => ''];
        }

        if ($currentCommitteeCount >= $limits['max_committees_per_activity']) {
            return [
                'allowed' => false,
                'message' => "Acara ini telah mencapai batas maksimal {$limits['max_committees_per_activity']} panitia. Silakan berlangganan untuk menambah kapasitas.",
            ];
        }

        return ['allowed' => true, 'message' => ''];
    }

    /**
     * Check if user can use QR code attendance feature
     */
    public function canUseQrAttendance(): array
    {
        // Admin/Superadmin can always use
        if ($this->isAdmin() || $this->isSuperAdmin()) {
            return ['allowed' => true, 'message' => ''];
        }

        // Only check for creators
        if (! $this->isCreator()) {
            return ['allowed' => true, 'message' => '']; // Regular users can use QR attendance
        }

        $limits = $this->getSubscriptionLimits();
        // Robust fallback: if plan slug is pro/enterprise, allow even if features missing
        $highest = $this->getHighestActiveSubscription();
        $plan = $highest ? $highest->plan : null;
        $planName = $plan && isset($plan->name) ? strtolower($plan->name) : '';
        $planSlug = $plan && isset($plan->slug) ? strtolower($plan->slug) : '';
        $isProOrEnterprise = $plan && (
            in_array($planSlug, ['pro', 'enterprise']) ||
            str_contains($planName, 'pro') ||
            str_contains($planName, 'enterprise')
        );

        if (! $limits['has_qr_attendance'] && ! $isProOrEnterprise) {
            return [
                'allowed' => false,
                'message' => 'Fitur absen berbasis QR code hanya tersedia untuk paket berlangganan. Silakan berlangganan untuk menggunakan fitur ini.',
            ];
        }

        return ['allowed' => true, 'message' => ''];
    }

    /**
     * Check if user can access analytics dashboard
     */
    public function canAccessAnalytics(): array
    {
        // Admin/Superadmin can always access
        if ($this->isAdmin() || $this->isSuperAdmin()) {
            return ['allowed' => true, 'message' => ''];
        }

        // Only check for creators
        if (! $this->isCreator()) {
            return ['allowed' => false, 'message' => 'Hanya creator yang dapat mengakses analytics.'];
        }

        $limits = $this->getSubscriptionLimits();

        if (! $limits['has_analytics']) {
            return [
                'allowed' => false,
                'message' => 'Fitur analytics hanya tersedia untuk paket berlangganan. Silakan berlangganan untuk menggunakan fitur ini.',
            ];
        }

        return ['allowed' => true, 'message' => ''];
    }

    public function isAdmin(): bool
    {
        $role = strtolower(trim((string) $this->role));

        return in_array($role, ['admin', 'superadmin']);
    }

    public function isSuperAdmin(): bool
    {
        $role = strtolower(trim((string) $this->role));

        return $role === 'superadmin';
    }

    public function isCreator(): bool
    {
        $role = strtolower(trim((string) $this->role));
        if ($role === 'creator') {
            return true;
        }
        // Fallback heuristik: jika user memiliki aktivitas yang ia buat,
        // perlakukan sebagai creator (untuk konsistensi prod vs lokal).
        try {
            return \App\Models\Activity::where('user_id', $this->id)->exists();
        } catch (\Throwable $e) {
            return false;
        }
    }

    public function isAdminOrCreator(): bool
    {
        $role = strtolower(trim((string) $this->role));

        return in_array($role, ['admin', 'superadmin', 'creator']) || $this->isCreator();
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role;
    }

    public function hasAnyRole(array $roles): bool
    {
        return in_array($this->role, $roles);
    }

    /**
     * Promote user to 'creator' role if eligible.
     * - Does nothing for admin/superadmin
     * - Skips if already creator
     */
    public function promoteToCreatorIfEligible(): void
    {
        if (! $this->isAdmin() && ! $this->isSuperAdmin() && $this->role !== 'creator') {
            $this->role = 'creator';
        }
    }

    /**
     * Check if user has a specific permission
     */
    public function hasPermission(string $permissionKey): bool
    {
        return RolePermission::hasPermission($this->role, $permissionKey);
    }

    /**
     * Check if user has any of the given permissions
     */
    public function hasAnyPermission(array $permissionKeys): bool
    {
        foreach ($permissionKeys as $permissionKey) {
            if ($this->hasPermission($permissionKey)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if user has all of the given permissions
     */
    public function hasAllPermissions(array $permissionKeys): bool
    {
        foreach ($permissionKeys as $permissionKey) {
            if (! $this->hasPermission($permissionKey)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if user can verify payment
     * This method checks both general verify_payment permission and verify_payment_own_activity permission
     * For verify_payment_own_activity, it also checks if user can manage the activity's registration
     * This includes creator, ALL committee members, and division leaders
     *
     * @param  \App\Models\Activity|null  $activity  The activity to check ownership for (optional)
     */
    public function canVerifyPayment($activity = null): bool
    {
        // Superadmin selalu bisa memverifikasi di semua aktivitas
        if (method_exists($this, 'isSuperAdmin') && $this->isSuperAdmin()) {
            return true;
        }

        // Harus ada konteks aktivitas untuk memvalidasi
        if (! $activity) {
            return false;
        }

        // Creator aktivitas selalu diizinkan
        if ((int) $activity->user_id === (int) $this->id) {
            return true;
        }

        // Panitia pada aktivitas tersebut diizinkan
        // Jika ada helper canManageRegistration (mencakup panitia/divisi), gunakan itu
        if (method_exists($activity, 'canManageRegistration') && $activity->canManageRegistration($this->id)) {
            return true;
        }

        // Fallback: cek membership panitia langsung
        $isCommitteeMember = $activity->committeeStructures()
            ->where('user_id', $this->id)
            ->exists();

        return $isCommitteeMember;
    }

    /**
     * Check if user can view payment details
     * Similar to canVerifyPayment but for viewing
     *
     * @param  \App\Models\Activity|null  $activity  The activity to check ownership for (optional)
     */
    public function canViewPayment($activity = null): bool
    {
        if ($this->hasPermission('view_payments')) {
            return true;
        }
        if (! $activity) {
            return false;
        }
        if ((int) $activity->user_id === (int) $this->id) {
            return true;
        }
        if (method_exists($activity, 'canManageRegistration') && $activity->canManageRegistration($this->id)) {
            return true;
        }
        if ($this->hasPermission('view_payments_own_activity')) {
            return $activity->canManageRegistration($this->id);
        }

        return false;
    }

    // Tambahkan accessor untuk foto profil
    public function getProfilePhotoAttribute()
    {
        return $this->attributes['profile_photo'] ?? null;
    }

    // Tambahkan method untuk mendapatkan data untuk scan
    public function getScanData()
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'profile_photo' => $this->profile_photo,
        ];
    }

    public function registeredActivities()
    {
        return $this->hasMany(ActivityUser::class);
    }

    public function activityUsers()
    {
        return $this->hasMany(ActivityUser::class);
    }

    /**
     * Get the user's participant record for activities
     */
    public function participant()
    {
        return $this->hasOne(ActivityUser::class);
    }

    public function isPengurus()
    {
        return $this->role === 'pengurus' || $this->role === 'admin';
    }

    // Relationship with News model
    public function news()
    {
        return $this->hasMany(News::class, 'author_id');
    }

    // Tambahkan mutator untuk role
    public function setRoleAttribute($value)
    {
        $this->attributes['role'] = $value;
    }

    // Tambahkan accessor untuk role
    public function getRoleAttribute($value)
    {
        return $value;
    }
}
