<?php

namespace App\Models;

use App\Traits\HasCustomUid;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasCustomUid;

    protected $fillable = [
        'user_id',
        'activity_id',
        'activity_batch_id',
        'payment_method_id',
        'amount',
        'admin_fee',
        'proof_of_payment',
        'sender_name',
        'status',
        'notes',
        'verified_by',
        'verified_at',
        'midtrans_transaction_id',
        'midtrans_snap_token',
        'midtrans_response',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    protected $appends = [
        'proof_url',
        'has_proof_file',
        'verifier_note',
    ];

    public function getHasProofFileAttribute()
    {
        return ! empty($this->proof_of_payment);
    }

    public function getProofUrlAttribute()
    {
        if (! $this->proof_of_payment) {
            return null;
        }

        // Check public path first (most likely for direct uploads)
        $publicPath = public_path('storage/'.$this->proof_of_payment);
        if (file_exists($publicPath)) {
            return asset('storage/'.$this->proof_of_payment);
        }

        // Check storage path
        if (\Illuminate\Support\Facades\Storage::disk('public')->exists($this->proof_of_payment)) {
            return asset('storage/'.$this->proof_of_payment);
        }

        return null;
    }

    public function getVerifierNoteAttribute()
    {
        if (! $this->notes) {
            return null;
        }

        if (is_array($this->notes)) {
            $note = $this->notes['verifier_note'] ?? null;

            return is_string($note) && trim($note) !== '' ? $note : null;
        }

        if (is_string($this->notes)) {
            $decoded = json_decode($this->notes, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $note = $decoded['verifier_note'] ?? null;

                return is_string($note) && trim($note) !== '' ? $note : null;
            }

            return trim($this->notes) !== '' ? $this->notes : null;
        }

        return null;
    }

    public function activity()
    {
        return $this->belongsTo(Activity::class);
    }

    public function batch()
    {
        return $this->belongsTo(ActivityBatch::class, 'activity_batch_id');
    }

    public function paymentMethod()
    {
        return $this->belongsTo(PaymentMethod::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function verifier()
    {
        return $this->belongsTo(User::class, 'verified_by');
    }
}
