<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ActivityUser extends Model
{
    use HasCustomUid;
    use HasFactory;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $table = 'activity_users';

    public function __construct(array $attributes = [])
    {
        parent::__construct($attributes);
        // Fallback untuk nama tabel yang mungkin typo di database
        try {
            // Prefer 'activitiusers' if exists to match pivot selection in Activity::users()
            if (\Illuminate\Support\Facades\Schema::hasTable('activitiusers')) {
                $this->table = 'activitiusers';
            } elseif (\Illuminate\Support\Facades\Schema::hasTable('activity_users')) {
                $this->table = 'activity_users';
            }
        } catch (\Throwable $e) {
            // Fallback default jika terjadi error koneksi saat boot
            // Use the correct table name to avoid queries against a typo table
            $this->table = 'activity_users';
        }
    }

    // Status constants
    const STATUS_VERIFICATION = 0;  // Sedang verifikasi

    const STATUS_ACTIVE = 1;        // Aktif

    const STATUS_PENDING = 3;       // Menunggu Pembayaran (untuk kegiatan berbayar)

    const STATUS_REJECTED = 2;      // Ditolak

    protected $fillable = [
        'user_id',
        'activity_id',
        'activity_batch_id',
        'status',
        'custom_data',
        'image_path',
        'card_status',
        'certificate_id',
        'activity_participant_group_id',
        'activity_participation_type_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'status' => 'integer',
        'custom_data' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function batch()
    {
        return $this->belongsTo(ActivityBatch::class, 'activity_batch_id');
    }

    public function participantGroup()
    {
        return $this->belongsTo(ActivityParticipantGroup::class, 'activity_participant_group_id');
    }

    public function participationType()
    {
        return $this->belongsTo(ActivityParticipationType::class, 'activity_participation_type_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function payment()
    {
        return $this->hasOne(Payment::class, 'user_id', 'user_id');
    }

    public function roomAssignment()
    {
        return $this->hasOne(ActivityHotelRoomAssignment::class, 'user_id', 'user_id');
    }

    public function getAttendanceStatus($attendanceId = null)
    {
        if (! $attendanceId) {
            return false;
        }

        return $this->status;
    }

    // Helper methods for status checking
    public function isVerification()
    {
        return $this->status === self::STATUS_VERIFICATION;
    }

    public function isActive()
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function isPending()
    {
        return $this->status === self::STATUS_PENDING;
    }

    public function isRejected()
    {
        return $this->status === self::STATUS_REJECTED;
    }

    public function getStatusLabelAttribute()
    {
        return $this->getStatusText();
    }

    public function getPaymentStatusLabelAttribute()
    {
        // Simple mapping based on status
        if ($this->status === self::STATUS_PENDING) {
            return 'Belum Lunas';
        }
        if ($this->status === self::STATUS_ACTIVE) {
            return 'Lunas';
        }

        return '-';
    }

    public function getStatusText()
    {
        switch ($this->status) {
            case self::STATUS_VERIFICATION:
                return 'Belum Verifikasi';
            case self::STATUS_ACTIVE:
                return 'Aktif';
            case self::STATUS_PENDING:
                return 'Menunggu Pembayaran';
            case self::STATUS_REJECTED:
                return 'Ditolak';
            default:
                return 'Tidak Diketahui';
        }
    }

    public function getStatusBadgeClass()
    {
        switch ($this->status) {
            case self::STATUS_VERIFICATION:
                return 'bg-warning text-dark';
            case self::STATUS_ACTIVE:
                return 'bg-success';
            case self::STATUS_PENDING:
                return 'bg-info text-white';
            case self::STATUS_REJECTED:
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    }

    public static function generateCertificateIdFor($userId, $activityId, $batchId = null): string
    {
        $activity = Activity::find($activityId);

        // Gunakan tanggal aktivitas jika ada, jika tidak gunakan sekarang
        $date = ($activity && $activity->date) ? \Carbon\Carbon::parse($activity->date) : now();

        $monthRoman = self::toRoman((int) $date->format('n'));
        $yearRoman = self::toRoman((int) $date->format('y'));

        // 2 digit awal ID Kegiatan
        $actPrefix = substr(str_pad((string) $activityId, 2, '0', STR_PAD_LEFT), 0, 2);
        // 2 digit awal ID Peserta
        $userPrefix = substr(str_pad((string) $userId, 2, '0', STR_PAD_LEFT), 0, 2);

        do {
            // 4 digit random
            $rand = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

            // Format: NO :BulanRomawiTahunRomawi(2digit)ActivityID(2digit)UserID(2digit)Random4
            $segments = [
                'NO :',
                $monthRoman,
                $yearRoman,
                $actPrefix,
                $userPrefix,
                $rand,
            ];
            $id = implode('', $segments);
        } while (self::where('certificate_id', $id)->exists());

        return $id;
    }

    protected static function toRoman(int $num): string
    {
        if ($num <= 0) {
            return 'N';
        }
        $map = [
            'M' => 1000,
            'CM' => 900,
            'D' => 500,
            'CD' => 400,
            'C' => 100,
            'XC' => 90,
            'L' => 50,
            'XL' => 40,
            'X' => 10,
            'IX' => 9,
            'V' => 5,
            'IV' => 4,
            'I' => 1,
        ];
        $res = '';
        foreach ($map as $roman => $val) {
            while ($num >= $val) {
                $res .= $roman;
                $num -= $val;
            }
        }

        return $res;
    }

    public static function fromRoman(string $roman): int
    {
        $roman = strtoupper(trim($roman));
        if ($roman === '' || $roman === 'N') {
            return 0;
        }
        $map = [
            'M' => 1000,
            'D' => 500,
            'C' => 100,
            'L' => 50,
            'X' => 10,
            'V' => 5,
            'I' => 1,
        ];
        $total = 0;
        $prev = 0;
        $len = strlen($roman);
        for ($i = $len - 1; $i >= 0; $i--) {
            $ch = $roman[$i];
            $val = $map[$ch] ?? 0;
            if ($val < $prev) {
                $total -= $val;
            } else {
                $total += $val;
                $prev = $val;
            }
        }

        return $total;
    }
}
