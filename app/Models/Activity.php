<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Activity extends Model
{
    use HasCustomUid;
    use HasFactory;

    public $incrementing = false;
    protected $keyType = 'string';

    protected $table = 'activities';

    protected $fillable = [
        'uid',
        'name',
        'activity_type',
        'description',
        'category_id',
        'date',
        'end_date',
        'start_time',
        'end_time',
        'location',
        'price',
        'payment_method_type',
        'status',
        'image',
        'show_price',
        'pendaftaran',
        'user_id',
        'enable_comments',
        'import_template',
        'column_settings',
        'mandatory_profile_fields',
        'manual_payment_details',
        'visible_sections',
        'visible_sections',
        // 'custom_fields', // Removed, using relationship
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'visible_sections' => 'array',
        'date' => 'date',
        'end_date' => 'date',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'show_price' => 'boolean',
        'enable_comments' => 'boolean',
        'pendaftaran' => 'integer',
        'column_settings' => 'array',
        'mandatory_profile_fields' => 'array',
        'manual_payment_details' => 'array',
        'hero_pinned' => 'boolean',
        // 'custom_fields' => 'array', // Removed
    ];

    public function customFields()
    {
        return $this->belongsToMany(CustomField::class, 'activity_custom_field')
            ->withPivot('is_required')
            ->withTimestamps();
    }

    /**
     * Accessor to get custom fields in a format compatible with legacy code.
     * This mimics the old JSON array structure.
     */
    public function getCustomFieldsAttribute()
    {
        return $this->customFields()->get()->map(function ($field) {
            return [
                'id' => $field->id,
                'label' => $field->label,
                'key' => $field->key,
                'type' => $field->type,
                'options' => $field->options,
                'is_required' => (bool) $field->pivot->is_required,
            ];
        })->toArray();
    }

    // Registration status constants
    const REGISTRATION_NOT_OPENED = 0;

    const REGISTRATION_OPENED = 1;

    const REGISTRATION_CLOSED = 2;

    // Payment method type constants
    const PAYMENT_METHOD_MANUAL = 'manual';

    const PAYMENT_METHOD_AUTOMATIC = 'automatic';

    // Default attributes
    protected $attributes = [
        'payment_method_type' => self::PAYMENT_METHOD_AUTOMATIC,
    ];

    /**
     * Check if payment method is manual
     */
    public function isManualPayment()
    {
        return $this->payment_method_type === self::PAYMENT_METHOD_MANUAL || $this->payment_method_type === null;
    }

    public function speakers()
    {
        return $this->hasMany(ActivitySpeaker::class);
    }

    public function participantGroups()
    {
        return $this->hasMany(ActivityParticipantGroup::class);
    }

    /**
     * Check if payment method is automatic (Midtrans)
     */

    public function getDateAttribute($value)
    {
        if (is_null($value) || $value instanceof Carbon) {
            return $value;
        }

        try {
            return Carbon::createFromFormat('d/m/Y H:i', $value);
        } catch (\Exception $e) {
            return Carbon::parse($value);
        }
    }

    // Helper methods for registration status
    public function isRegistrationNotOpened()
    {
        return $this->pendaftaran === self::REGISTRATION_NOT_OPENED;
    }

    public function isRegistrationOpened()
    {
        return $this->pendaftaran === self::REGISTRATION_OPENED;
    }

    public function isRegistrationClosed()
    {
        return $this->pendaftaran === self::REGISTRATION_CLOSED;
    }

    public function getRegistrationStatusText()
    {
        switch ($this->pendaftaran) {
            case self::REGISTRATION_NOT_OPENED:
                return 'Pendaftaran Belum Dibuka';
            case self::REGISTRATION_OPENED:
                return 'Pendaftaran Dibuka';
            case self::REGISTRATION_CLOSED:
                return 'Pendaftaran Ditutup';
            default:
                return 'Status Tidak Diketahui';
        }
    }

    public function getRegistrationStatusClass()
    {
        switch ($this->pendaftaran) {
            case self::REGISTRATION_NOT_OPENED:
                return 'btn-warning';
            case self::REGISTRATION_OPENED:
                return 'btn-success';
            case self::REGISTRATION_CLOSED:
                return 'btn-danger';
            default:
                return 'btn-secondary';
        }
    }

    public function getRegistrationStatusIcon()
    {
        switch ($this->pendaftaran) {
            case self::REGISTRATION_NOT_OPENED:
                return 'fa-clock';
            case self::REGISTRATION_OPENED:
                return 'fa-door-open';
            case self::REGISTRATION_CLOSED:
                return 'fa-door-closed';
            default:
                return 'fa-question';
        }
    }

    // Relationship dengan owner/creator aktivitas
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function owners()
    {
        return $this->belongsToMany(User::class, 'activity_owners', 'activity_id', 'user_id')
            ->withTimestamps();
    }

    // Relationship dengan peserta aktivitas
    public function participants()
    {
        return $this->hasMany(ActivityUser::class, 'activity_id');
    }

    public function batches()
    {
        return $this->hasMany(ActivityBatch::class);
    }

    public function activeBatch()
    {
        return $this->hasOne(ActivityBatch::class)->where('is_active', true);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }

    public function isOngoing()
    {
        return $this->date >= now();
    }

    public function isCompleted()
    {
        return $this->date < now();
    }

    public function hasAutomaticPayment()
    {
        return $this->payment_method_type === self::PAYMENT_METHOD_AUTOMATIC;
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the users that belong to the activity.
     */
    public function users()
    {
        return $this->belongsToMany(User::class, 'activity_users')
            ->withPivot(['status', 'created_at', 'print_count', 'activity_batch_id'])
            ->withTimestamps();
    }

    public function certificateSettings()
    {
        return $this->hasOne(CertificateSettings::class);
    }

    public function payments()
    {
        return $this->hasMany(Payment::class);
    }

    public function hasUserPayment()
    {
        return $this->payments()
            ->where('status', 'pending')
            ->exists();
    }

    public function galleries()
    {
        return $this->hasMany(Gallery::class);
    }

    public function contents()
    {
        return $this->hasMany(ActivityContent::class);
    }

    public function divisions()
    {
        return $this->hasMany(ActivityDivision::class);
    }

    public function committeeStructures()
    {
        return $this->hasMany(ActivityCommitteeStructure::class);
    }

    public function rundowns()
    {
        return $this->hasMany(ActivityRundown::class)->orderBy('order');
    }

    /**
     * Get materials for this activity
     */
    public function materials()
    {
        return $this->hasMany(ActivityMaterial::class)->orderBy('created_at', 'desc');
    }

    public function comments()
    {
        return $this->morphMany(Comment::class, 'commentable')
            ->whereNull('parent_id')
            ->orderBy('created_at', 'desc');
    }

    public function allComments()
    {
        return $this->morphMany(Comment::class, 'commentable');
    }

    public function averageRating(): float
    {
        $avg = $this->allComments()->whereNull('parent_id')->whereNotNull('rating')->avg('rating');

        return $avg ? round((float) $avg, 1) : 0.0;
    }

    /**
     * Check if user can manage registration (creator, ketua panitia, or division leader)
     * Updated: ALL committee members can now manage registration
     */
    public function canManageRegistration($userId = null)
    {
        if (! $userId) {
            $userId = auth()->id();
        }

        if (! $userId) {
            return false;
        }

        // Check if user is creator - check this FIRST as it's the most common case
        if ($this->user_id == $userId) {
            return true;
        }

        // Check if user is in owners
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('activity_owners')) {
                if ($this->owners()->where('user_id', $userId)->exists()) {
                    return true;
                }
            }
        } catch (\Throwable $e) {
        }

        // Check if user is admin or superadmin
        $user = \App\Models\User::with('profile')->find($userId);
        if ($user && ($user->isAdmin() || $user->isSuperAdmin())) {
            return true;
        }

        // Jangan beri akses otomatis ke semua creator.
        // Hanya creator pemilik activity (dicek di atas) atau panitia/divisi yang boleh.

        // Check if user is in committee structure - ALL committee members can manage registration
        // Tidak perlu filter posisi tertentu, semua panitia bisa memvalidasi
        $isInCommittee = $this->committeeStructures()
            ->where('user_id', $userId)
            ->exists();

        if ($isInCommittee) {
            return true;
        }

        // Check if user is division leader (ketua divisi)
        // Check by name match
        if ($user) {
            $userName = $user->name;
            $userPhone = $user->profile->no_hp ?? ($user->phone ?? null);

            $isDivisionLeader = $this->divisions()
                ->where(function ($query) use ($userName, $userPhone) {
                    if ($userName) {
                        // Case-insensitive comparison for robust matching
                        $query->whereRaw('LOWER(leader_name) = ?', [strtolower(trim($userName))]);
                    }
                    if ($userPhone) {
                        $query->orWhere('leader_phone', $userPhone);
                    }
                })
                ->exists();

            if ($isDivisionLeader) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if the activity's creator subscription enables a specific feature.
     * Supported feature keys: 'digital_cards', 'digital_certificates'.
     */
    public function creatorHasFeature(string $featureKey): bool
    {
        // Resolve creator (author) of this activity
        $creator = $this->author; // relation belongsTo(User::class, 'user_id')
        if (! $creator instanceof \App\Models\User) {
            return false;
        }

        // Must have any active subscription
        if (! $creator->hasActiveSubscription()) {
            return false;
        }

        $limits = $creator->getSubscriptionLimits();
        $map = [
            'digital_cards' => 'has_digital_cards',
            'digital_certificates' => 'has_digital_certificates',
        ];
        $limitKey = $map[$featureKey] ?? null;
        if (! $limitKey) {
            return false;
        }

        return ! empty($limits[$limitKey]);
    }

    /**
     * Centralized access check for printing features (ID cards / certificates).
     *
     * At level ini kita fokus ke siapa yang berhak mengakses:
     * - Admin / Superadmin
     * - Creator pemilik aktivitas
     * - Semua panitia / committee / divisi yang diizinkan mengelola registrasi
     *
     * Pembatasan fitur berdasarkan subscription creator (digital_cards / digital_certificates)
     * lebih baik di-handle di tempat lain (misalnya di UI atau saat mengaktifkan fitur),
     * supaya panitia yang sudah ditugaskan tetap bisa bekerja.
     */
    public function canAccessPrinting(\App\Models\User $user, string $type): bool
    {
        // Admin/Superadmin selalu boleh
        if ($user->isAdmin() || $user->isSuperAdmin()) {
            return true;
        }

        // Creator pemilik aktivitas
        if ((string) $this->user_id === (string) $user->id && $user->isCreator()) {
            return true;
        }

        // Panitia / pengelola registrasi (menggunakan helper terpusat)
        if ($this->canManageRegistration($user->id)) {
            return true;
        }

        // Fallback: cek langsung di struktur panitia jika helper di atas belum mencakup semua kasus
        $isCommitteeMember = $this->committeeStructures()
            ->where('user_id', $user->id)
            ->exists();

        return $isCommitteeMember;
    }
}
